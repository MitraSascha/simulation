import asyncio
import json
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, get_db
from app.models.simulation import Simulation, SimulationStatus

router = APIRouter()


async def event_generator(simulation_id: UUID):
    """Yield SSE-formatted JSON every 2 seconds until the simulation ends."""
    while True:
        async with AsyncSessionLocal() as db:
            sim = await db.get(Simulation, simulation_id)
            if not sim:
                break
            progress = int((sim.current_tick / sim.total_ticks) * 100) if sim.total_ticks else 0
            data = {
                "simulation_id": str(simulation_id),
                "status": sim.status.value,
                "current_tick": sim.current_tick,
                "total_ticks": sim.total_ticks,
                "progress_pct": progress,
            }
            yield f"data: {json.dumps(data)}\n\n"
            if sim.status in (SimulationStatus.completed, SimulationStatus.failed):
                break
        await asyncio.sleep(2)


@router.get("/simulations/{simulation_id}/stream", tags=["stream"])
async def stream_simulation(
    simulation_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """SSE endpoint — streams live simulation progress every 2 seconds.

    The `db` dependency is kept so FastAPI validates the session factory is
    available; the actual per-poll queries use a fresh AsyncSessionLocal
    context inside `event_generator` to avoid holding a single session open
    across multiple awaits.
    """
    return StreamingResponse(
        event_generator(simulation_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
