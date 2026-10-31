"""
alembic/env.py — Alembic migration environment.

DATABASE_URL is read from the environment (never from alembic.ini) so that
no credentials are stored in version control.

On Render, the pre-deploy command is:
    cd backend && alembic upgrade head

Alembic connects, runs any pending migrations, then the app starts via
Uvicorn. This means the owner columns exist before the first request lands.
"""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Add the backend directory to sys.path so db.models can be imported.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the application Base so Alembic sees all models for autogenerate.
from db.models import Base  # noqa: E402  (must come after sys.path update)

# Alembic Config object (wraps alembic.ini).
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# The metadata object to use for 'autogenerate' support.
target_metadata = Base.metadata


def get_url() -> str:
    """
    Return the database URL from the environment.

    Falls back to the SQLite path used in development/testing so that
    `alembic upgrade head` works locally without a PostgreSQL connection.
    """
    url = os.getenv("DATABASE_URL", "")
    if not url:
        return "sqlite:///./taxsaathi_fallback.db"
    # Ensure psycopg2 dialect for Postgres.
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql") and "sslmode=" not in url:
        url += "?sslmode=require"
    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL to stdout)."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (connect to the DB)."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
