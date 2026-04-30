from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import generate_api_key, _hash_key
from app.models.auth import ApiKey
from app.schemas.auth import ApiKeyCreate, ApiKeyCreated, ApiKeyRead
from app.config import settings

router = APIRouter()


def require_admin(x_admin_key: str | None = Header(None)):
    if not settings.admin_master_key or x_admin_key != settings.admin_master_key:
        raise HTTPException(status_code=403, detail="Admin-Key erforderlich")


@router.post("/keys", response_model=ApiKeyCreated, status_code=201)
async def create_api_key(
    body: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    klartext, key_hash = generate_api_key()
    api_key = ApiKey(name=body.name, key_hash=key_hash)
    db.add(api_key)
    await db.flush()
    await db.refresh(api_key)
    return ApiKeyCreated(
        id=api_key.id,
        name=api_key.name,
        is_active=api_key.is_active,
        created_at=api_key.created_at,
        last_used_at=api_key.last_used_at,
        key=klartext,
    )


@router.get("/keys", response_model=list[ApiKeyRead])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(ApiKey).order_by(ApiKey.created_at.desc()))
    return result.scalars().all()


@router.delete("/keys/{key_id}", status_code=204)
async def deactivate_api_key(
    key_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    await db.execute(
        update(ApiKey).where(ApiKey.id == key_id).values(is_active=False)
    )
