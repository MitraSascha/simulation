from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    database_url: str = "postgresql://sim_user:sim_pass@db:5432/simulation"
    default_tick_duration_days: int = 15
    default_agent_concurrent_calls: int = 10
    max_concurrent_calls: int = 20
    max_concurrent_simulations: int = 3
    debug: bool = False
    admin_master_key: str = "change-me-in-production"
    cors_origins: list[str] = ["*"]  # In Produktion auf eigene Domain einschränken

    class Config:
        env_file = ".env"


settings = Settings()
