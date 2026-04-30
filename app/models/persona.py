import uuid
from datetime import datetime, timezone


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Persona(Base):
    __tablename__ = "personas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    simulation_id = Column(UUID(as_uuid=True), ForeignKey("simulations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    age = Column(String(10))
    location = Column(String(255))       # z.B. "München", "Berlin", "Wien"
    occupation = Column(String(255))
    personality = Column(Text)           # Ausführliche Persönlichkeitsbeschreibung
    values = Column(JSON, default=[])    # Kernwerte als Liste
    communication_style = Column(Text)   # Wie schreibt/spricht diese Person?
    initial_opinion = Column(Text)       # Erste Haltung zum Produkt
    is_skeptic = Column(Boolean, default=False)
    social_connections = Column(JSON, default=[])  # UUIDs verbundener Personas
    # JSON-Struktur:
    # {
    #   "opinion_evolution": str,     — Meinungsentwicklung (kumulativ)
    #   "mood": str,                  — Aktuelle Stimmung (ein Wort)
    #   "recent_actions": [...],      — Ringpuffer (max 5)
    #   "platform_affinity": {"feedbook": float, "threadit": float},  — Plattform-Präferenz
    #   "connection_strength": {persona_id: float, ...}               — Dynamische Verbindungsstärke
    # }
    current_state = Column(JSON, default={})
    extra = Column(JSON, default={})     # Sonstige Attribute
    created_at = Column(DateTime, default=_utcnow)

    simulation = relationship("Simulation", back_populates="personas")
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    reactions = relationship("Reaction", back_populates="persona", cascade="all, delete-orphan")
