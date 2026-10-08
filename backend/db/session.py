import os
import sys
import logging
from typing import Generator
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

# Configure module-level logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv()

def build_database_url() -> str:
    """Retrieves and formats the DATABASE_URL for SQLAlchemy."""
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        logger.warning("DATABASE_URL environment variable is missing. Will fall back to SQLite.")
        return ""
        
    # Ensure proper psycopg2 dialect and SSL mode for Supabase
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        if "sslmode=" not in database_url:
            database_url += "?sslmode=require"
            
    return database_url

def create_db_engine():
    """Initializes and verifies the SQLAlchemy engine, with a safe fallback."""
    url = build_database_url()
    
    if url:
        connect_args = {}
        if url.startswith("postgresql+psycopg2://"):
            connect_args = {"connect_timeout": 5}
            
        try:
            logger.info("Connecting to primary PostgreSQL database...")
            engine = create_engine(
                url,
                connect_args=connect_args,
                pool_pre_ping=True,  # Proactively test connections before checkout
                pool_size=10,        # Default pool size
                max_overflow=20,     # Max overflow connections
                pool_recycle=1800,   # Recycle connections every 30 minutes
            )
            
            with engine.connect() as conn:
                logger.info("Successfully connected to the primary database.")
            return engine
            
        except Exception as e:
            logger.error(f"Failed to connect to primary database: {e}")
            logger.warning("Falling back to local SQLite database to prevent backend failure.")
            
    # Fallback SQLite configuration
    sqlite_url = "sqlite:///./taxsaathi_fallback.db"
    logger.info("Using SQLite fallback database.")
    return create_engine(
        sqlite_url, 
        connect_args={"check_same_thread": False}
    )

# Initialize engine and session factory
engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for providing database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
