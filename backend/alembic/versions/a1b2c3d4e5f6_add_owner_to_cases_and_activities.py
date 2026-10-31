"""add owner to cases and activities

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-10-14

Adds a nullable `owner` column (indexed) to the `cases` and `activities`
tables. Nullable so existing rows survive without needing a default value.

Idempotency (three scenarios handled):
  1. Existing DB, column absent  — ALTER TABLE runs normally.
  2. Fresh DB where create_all already ran before Alembic  — column exists,
     _column_exists() returns True, add_column and create_index are skipped.
  3. Fresh DB where Alembic runs BEFORE create_all (or table does not exist
     yet for any other reason)  — _table_exists() returns False, the whole
     block is skipped; create_all will create the table with the owner column.

How to run on Render:
    Set the pre-deploy command in the Render service dashboard to:
        cd backend && alembic upgrade head
    Alembic reads DATABASE_URL from the environment via alembic/env.py.
    The migration runs before Uvicorn starts, so the column exists before
    the first request arrives.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# Alembic revision identifiers.
revision = "a1b2c3d4e5f6"
down_revision = None
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    """Return True if table_name exists in the database."""
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def _column_exists(table_name: str, column_name: str) -> bool:
    """Return True if column_name exists on table_name.

    Callers must have already verified the table exists via _table_exists()
    before calling this, otherwise get_columns() raises NoSuchTableError.
    """
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    # ── cases.owner ──────────────────────────────────────────────────────────
    # Skip entirely if the table is absent: create_all will create it with
    # the owner column already present (from the updated ORM model).
    if _table_exists("cases") and not _column_exists("cases", "owner"):
        op.add_column(
            "cases",
            sa.Column("owner", sa.String(), nullable=True),
        )
        op.create_index(
            "ix_cases_owner",
            "cases",
            ["owner"],
            unique=False,
        )

    # ── activities.owner ─────────────────────────────────────────────────────
    if _table_exists("activities") and not _column_exists("activities", "owner"):
        op.add_column(
            "activities",
            sa.Column("owner", sa.String(), nullable=True),
        )
        op.create_index(
            "ix_activities_owner",
            "activities",
            ["owner"],
            unique=False,
        )


def downgrade() -> None:
    # ── activities.owner ─────────────────────────────────────────────────────
    if _table_exists("activities") and _column_exists("activities", "owner"):
        op.drop_index("ix_activities_owner", table_name="activities")
        op.drop_column("activities", "owner")

    # ── cases.owner ──────────────────────────────────────────────────────────
    if _table_exists("cases") and _column_exists("cases", "owner"):
        op.drop_index("ix_cases_owner", table_name="cases")
        op.drop_column("cases", "owner")
