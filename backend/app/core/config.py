from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from environment variables or backend/.env. Never commit real values."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str = Field(
        ...,
        description="SQLAlchemy URL, e.g. postgresql+psycopg://user:pass@host:5432/db",
    )

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, value: str) -> str:
        """Hosting providers (for example Neon on Vercel) give postgresql:// URLs.

        Use the psycopg 3 driver the application is built for.
        """
        for plain in ("postgresql://", "postgres://"):
            if value.startswith(plain):
                return "postgresql+psycopg://" + value[len(plain) :]
        return value

    frontend_origin: str = "http://localhost:3000"

    # Sessions: idle timeout and absolute lifetime (master prompt Phase 4).
    session_idle_minutes: int = 30
    session_max_hours: int = 8
    cookie_secure: bool = False  # set true in production (HTTPS only)

    # Password reset: links expire after this many minutes. In development the link is logged, not emailed (A-12).
    password_reset_minutes: int = 30
    log_password_reset_links: bool = True

    # Rate limiting for sensitive endpoints (requests per minute per client IP and endpoint).
    rate_limit_per_minute: int = 10

    # Journal encryption key (Fernet, 32 url-safe base64 bytes). Required; generated once per environment.
    journal_key: str = Field(..., min_length=40)

    # Development seeding only (scripts/seed_demo.py). Passwords come from the local .env, never from code.
    seed_admin_password: str | None = None
    seed_demo_password: str | None = None
    test_database_url: str | None = None

    # Cancellation window default (A-15 placeholder) until an administrator changes it.
    default_cancellation_window_hours: int = 24


@lru_cache
def get_settings() -> Settings:
    return Settings()
