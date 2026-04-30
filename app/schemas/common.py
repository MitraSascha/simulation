from datetime import datetime
from typing import Generic, TypeVar
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class UUIDModel(BaseSchema):
    id: UUID

class TimestampMixin(BaseSchema):
    created_at: datetime

T = TypeVar("T")

class PaginationParams(BaseSchema):
    """Wiederverwendbare Pagination Query-Parameter."""
    limit: int = 50
    offset: int = 0

class PaginatedResponse(BaseSchema, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int
    has_more: bool
