"""
Application configuration.

Supports three modes:
1. Local dev        — DATABASE_URL env var (set via .env or docker-compose)
2. Render.com       — DATABASE_URL env var auto-injected by Render (postgres:// scheme)
3. AWS ECS          — DB_SECRET_JSON (Secrets Manager) + DB_HOST + DB_PORT env vars

The `effective_database_url` property resolves the correct URL for each mode.
"""

import json
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


def _fix_scheme(url: str) -> str:
    """
    Render (and Heroku-style hosts) inject postgres:// URLs.
    SQLAlchemy requires postgresql+psycopg2://.
    """
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    # ─── Direct URL (local dev + Render) ───
    database_url: Optional[str] = None

    # ─── Production via Secrets Manager (AWS ECS) ───
    db_secret_json: Optional[str] = None
    db_host: Optional[str] = None
    db_port: int = 5432

    # ─── JWT ───
    jwt_secret: str = "dev-secret-change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    # ─── App ───
    app_name: str = "Job Tracker API"
    environment: str = "development"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def effective_database_url(self) -> str:
        # Priority 1: DATABASE_URL — covers local dev AND Render auto-injection
        if self.database_url:
            return _fix_scheme(self.database_url)

        # Priority 2: DB_SECRET_JSON + DB_HOST (AWS ECS / Secrets Manager)
        if self.db_secret_json:
            secret = json.loads(self.db_secret_json)
            user     = secret["username"]
            password = secret["password"]
            dbname   = secret["dbname"]
            return (
                f"postgresql+psycopg2://{user}:{password}"
                f"@{self.db_host}:{self.db_port}/{dbname}"
            )

        raise RuntimeError(
            "No database configuration found. "
            "Set DATABASE_URL (local/Render) or DB_SECRET_JSON + DB_HOST (AWS ECS)."
        )


settings = Settings()
