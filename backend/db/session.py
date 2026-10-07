from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./taxsaathi.db" # fallback to sqlite for local dev
else:
    # Force psycopg v3 dialect for PostgreSQL
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Configure connection arguments to force IPv4 and improve reliability
connect_args = {}
if DATABASE_URL.startswith("postgresql+psycopg://"):
    connect_args = {
        "connect_timeout": 10,  # 10 second connection timeout
        "options": "-c jit=off",  # Disable JIT compilation for faster connection
    }

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,  # Verify connections before using them
    pool_size=5,  # Connection pool size
    max_overflow=10,  # Allow up to 10 connections beyond pool_size
    pool_recycle=3600,  # Recycle connections after 1 hour
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
