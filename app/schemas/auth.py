from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)


class ApiKeyRead(BaseModel):
    id: UUID
    name: str
    is_active: bool
    created_at: datetime
    last_used_at: datetime | None

    model_config = {"from_attributes": True}


class ApiKeyCreated(ApiKeyRead):
    key: str   # Nur bei Erstellung, danach nie wieder!
    warning: str = "Speichere diesen Key sicher — er wird nicht nochmal angezeigt."
