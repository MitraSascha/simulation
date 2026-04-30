from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import (
    AnalysisReport,
    Comment,
    InfluenceEvent,
    Persona,
    Post,
    Reaction,
    Simulation,
    SimulationStatus,
    SimulationTick,
)
from app.schemas import SimulationCreate, SimulationRead, SimulationRunResponse, TickRead
from app.schemas.common import PaginatedResponse
from app.schemas.simulation import SimulationResetResponse, SimulationStats
from app.config import settings
from app.simulation.runner import run_simulation_background

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[SimulationRead])
async def list_simulations(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: SimulationStatus | None = Query(None),
    name: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[SimulationRead]:
    query = select(Simulation)
    if status:
        query = query.where(Simulation.status == status)
    if name:
        query = query.where(Simulation.name.ilike(f"%{name}%"))

    # Total count
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    # Paginierte Items
    result = await db.execute(
        query.order_by(Simulation.created_at.desc()).limit(limit).offset(offset)
    )
    items = result.scalars().all()

    return PaginatedResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
        has_more=(offset + limit) < total,
    )


@router.get("/{simulation_id}", response_model=SimulationRead)
async def get_simulation(
    simulation_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> SimulationRead:
    result = await db.execute(
        select(Simulation).where(Simulation.id == simulation_id)
    )
    sim = result.scalar_one_or_none()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation nicht gefunden")
    return sim


@router.post("/", response_model=SimulationRead, status_code=status.HTTP_201_CREATED)
async def create_simulation(
    body: SimulationCreate,
    db: AsyncSession = Depends(get_db),
) -> SimulationRead:
    data = body.model_dump()
    # SimulationConfig Pydantic-Objekt → dict + total_ticks aus tick_count ableiten
    data["config"] = body.config.model_dump()
    data["total_ticks"] = body.config.tick_count

    sim = Simulation(**data)
    db.add(sim)
    await db.flush()
    await db.refresh(sim)
    return sim


@router.post("/{simulation_id}/run", response_model=SimulationRunResponse)
async def run_simulation(
    simulation_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> SimulationRunResponse:
    result = await db.execute(
        select(Simulation).where(Simulation.id == simulation_id)
    )
    sim = result.scalar_one_or_none()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation nicht gefunden")

    if sim.status == SimulationStatus.running:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Simulation läuft bereits",
        )

    # Concurrent-Simulation-Guard
    running_count_result = await db.execute(
        select(func.count()).where(Simulation.status == SimulationStatus.running)
    )
    running_count = running_count_result.scalar_one()
    if running_count >= settings.max_concurrent_simulations:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Maximale Anzahl gleichzeitiger Simulationen ({settings.max_concurrent_simulations}) erreicht. Bitte warte bis eine Simulation abgeschlossen ist.",
        )

    sim.status = SimulationStatus.running
    await db.flush()

    background_tasks.add_task(run_simulation_background, simulation_id)

    return SimulationRunResponse(
        simulation_id=simulation_id,
        status=SimulationStatus.running,
        message="Simulation wurde gestartet und läuft im Hintergrund.",
    )


@router.post("/{simulation_id}/clone", response_model=SimulationRead, status_code=201)
async def clone_simulation(
    simulation_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> SimulationRead:
    original = await db.get(Simulation, simulation_id)
    if not original:
        raise HTTPException(status_code=404, detail="Simulation nicht gefunden")

    clone = Simulation(
        name=f"{original.name} (Kopie)",
        product_description=original.product_description,
        target_market=original.target_market,
        industry=original.industry,
        total_ticks=original.total_ticks,
        config=original.config,
        webhook_url=original.webhook_url,
        llm_provider=getattr(original, "llm_provider", "anthropic"),
        llm_model_fast=getattr(original, "llm_model_fast", None),
        llm_model_smart=getattr(original, "llm_model_smart", None),
        status=SimulationStatus.pending,
        current_tick=0,
    )
    db.add(clone)
    await db.flush()
    await db.refresh(clone)
    return clone


@router.get("/{simulation_id}/ticks", response_model=list[TickRead])
async def list_ticks(
    simulation_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> list[TickRead]:
    # Prüfe ob Simulation existiert
    sim_result = await db.execute(
        select(Simulation).where(Simulation.id == simulation_id)
    )
    if not sim_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Simulation nicht gefunden")

    result = await db.execute(
        select(SimulationTick)
        .where(SimulationTick.simulation_id == simulation_id)
        .order_by(SimulationTick.tick_number.asc())
    )
    return result.scalars().all()


@router.delete("/{simulation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_simulation(
    simulation_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Simulation).where(Simulation.id == simulation_id)
    )
    sim = result.scalar_one_or_none()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation nicht gefunden")

    await db.delete(sim)


@router.post("/{simulation_id}/cancel")
async def cancel_simulation(
    simulation_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Simulation).where(Simulation.id == simulation_id)
    )
    sim = result.scalar_one_or_none()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation nicht gefunden")

    if sim.status != SimulationStatus.running:
        raise HTTPException(status_code=400, detail="Simulation läuft nicht")

    sim.status = SimulationStatus.failed
    sim.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()

    return {"simulation_id": str(simulation_id), "message": "Simulation wird abgebrochen."}


@router.post("/{simulation_id}/reset", response_model=SimulationResetResponse)
async def reset_simulation(
    simulation_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> SimulationResetResponse:
    result = await db.execute(
        select(Simulation).where(Simulation.id == simulation_id)
    )
    sim = result.scalar_one_or_none()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation nicht gefunden")

    if sim.status == SimulationStatus.running:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Simulation läuft noch",
        )

    # Subquery: alle Post-IDs dieser Simulation (für Comment/Reaction-Löschung)
    post_ids_subquery = select(Post.id).where(Post.simulation_id == simulation_id)

    # FK-gerechte Löschreihenfolge
    await db.execute(delete(InfluenceEvent).where(InfluenceEvent.simulation_id == simulation_id))
    await db.execute(delete(Reaction).where(Reaction.post_id.in_(post_ids_subquery)))
    await db.execute(delete(Comment).where(Comment.post_id.in_(post_ids_subquery)))
    await db.execute(delete(SimulationTick).where(SimulationTick.simulation_id == simulation_id))
    await db.execute(delete(AnalysisReport).where(AnalysisReport.simulation_id == simulation_id))
    await db.execute(delete(Post).where(Post.simulation_id == simulation_id))
    await db.execute(delete(Persona).where(Persona.simulation_id == simulation_id))

    sim.status = SimulationStatus.pending
    sim.current_tick = 0
    sim.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()

    return SimulationResetResponse(
        simulation_id=simulation_id,
        message="Simulation wurde zurückgesetzt.",
    )


@router.get("/{simulation_id}/stats", response_model=SimulationStats)
async def get_simulation_stats(
    simulation_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> SimulationStats:
    result = await db.execute(
        select(Simulation).where(Simulation.id == simulation_id)
    )
    sim = result.scalar_one_or_none()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation nicht gefunden")

    # Count-Queries
    persona_count_result = await db.execute(
        select(func.count()).select_from(Persona).where(Persona.simulation_id == simulation_id)
    )
    persona_count = persona_count_result.scalar_one()

    post_count_result = await db.execute(
        select(func.count()).select_from(Post).where(Post.simulation_id == simulation_id)
    )
    post_count = post_count_result.scalar_one()

    post_ids_subquery = select(Post.id).where(Post.simulation_id == simulation_id)

    comment_count_result = await db.execute(
        select(func.count()).select_from(Comment).where(Comment.post_id.in_(post_ids_subquery))
    )
    comment_count = comment_count_result.scalar_one()

    reaction_count_result = await db.execute(
        select(func.count()).select_from(Reaction).where(Reaction.post_id.in_(post_ids_subquery))
    )
    reaction_count = reaction_count_result.scalar_one()

    total_ticks = sim.total_ticks or 0
    current_tick = sim.current_tick or 0
    progress_pct = int((current_tick / total_ticks) * 100) if total_ticks > 0 else 0

    return SimulationStats(
        simulation_id=simulation_id,
        status=sim.status,
        current_tick=current_tick,
        total_ticks=total_ticks,
        progress_pct=progress_pct,
        persona_count=persona_count,
        post_count=post_count,
        comment_count=comment_count,
        reaction_count=reaction_count,
    )
