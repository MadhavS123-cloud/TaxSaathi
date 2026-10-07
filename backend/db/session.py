from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./taxsaathi.db"  # fallback to sqlite for local dev
else:
    # Ensure proper SSL mode and psycopg2 dialect for Supabase
    if DATABASE_URL.startswith("postgresql://"):
        # Convert to psycopg2 dialect and add SSL
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
        if "sslmode=" not in DATABASE_URL:
            DATABASE_URL += "?sslmode=require"

# Configure connection with pooling and timeouts
connect_args = {}
if DATABASE_URL.startswith("postgresql+psycopg2://"):
    connect_args = {
        "connect_timeout": 10,
    }

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,  # Verify connections before using
    pool_size=5,
    max_overflow=10,
    pool_recycle=3600,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
