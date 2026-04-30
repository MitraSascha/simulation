import hashlib
import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import Depends, HTTPException, Query, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.auth import ApiKey

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def generate_api_key() -> tuple[str, str]:
    """Erzeugt ein neues Key-Paar: (klartext, hash)"""
    key = f"sim_{secrets.token_urlsafe(32)}"
    return key, _hash_key(key)


async def verify_api_key(
    api_key: str | None = Security(API_KEY_HEADER),
    db: AsyncSession = Depends(get_db),
) -> ApiKey:
    """FastAPI Dependency — wirft 401 wenn Key ungültig oder inaktiv."""
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-API-Key Header fehlt",
        )

    key_hash = _hash_key(api_key)
    result = await db.execute(
        select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_active == True)
    )
    db_key = result.scalar_one_or_none()

    if not db_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiger oder deaktivierter API-Key",
        )

    # last_used_at asynchron aktualisieren (fire-and-forget, kein await nötig)
    await db.execute(
        update(ApiKey)
        .where(ApiKey.id == db_key.id)
        .values(last_used_at=datetime.now(timezone.utc).replace(tzinfo=None))
    )

    return db_key


async def verify_api_key_header_or_query(
    header_key: str | None = Security(API_KEY_HEADER),
    query_key: str | None = Query(None, alias="api_key"),
    db: AsyncSession = Depends(get_db),
) -> ApiKey:
    """Wie verify_api_key, akzeptiert aber zusätzlich `?api_key=` als Query-Param.

    Notwendig für Browser-EventSource (SSE), das keine Custom-Header senden kann.
    """
    api_key = header_key or query_key
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-API-Key Header oder ?api_key= Query-Param fehlt",
        )

    key_hash = _hash_key(api_key)
    result = await db.execute(
        select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_active == True)
    )
    db_key = result.scalar_one_or_none()

    if not db_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiger oder deaktivierter API-Key",
        )

    await db.execute(
        update(ApiKey)
        .where(ApiKey.id == db_key.id)
        .values(last_used_at=datetime.now(timezone.utc).replace(tzinfo=None))
    )

    return db_key
