from uuid import UUID
from app.schemas.common import UUIDModel, TimestampMixin

class PersonaRead(UUIDModel, TimestampMixin):
    simulation_id: UUID
    name: str
    age: str | None
    location: str | None
    occupation: str | None
    personality: str | None
    values: list[str]
    communication_style: str | None
    initial_opinion: str | None
    is_skeptic: bool
    current_state: dict
    social_connections: list
