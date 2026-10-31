import os
import logging
from typing import Generator
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv()


def build_database_url():
    database_url = os.getenv("DATABASE_URL", "")

    if not database_url:
        # Default: SQLite in data/app.db (relative to where uvicorn is run from — backend/)
        os.makedirs("data", exist_ok=True)
        return "sqlite:///./data/app.db"

    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        if "sslmode=" not in database_url:
            database_url += "?sslmode=require"

    return database_url


def create_db_engine():
    url = build_database_url()

    if url.startswith("postgresql"):
        try:
            logger.info("Connecting to PostgreSQL database...")
            eng = create_engine(
                url,
                connect_args={"connect_timeout": 5},
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
                pool_recycle=1800,
            )
            with eng.connect() as _:
                logger.info("Connected to PostgreSQL.")
            return eng
        except Exception as e:
            logger.error("PostgreSQL connection failed: %s — falling back to SQLite.", e)
            os.makedirs("data", exist_ok=True)
            url = "sqlite:///./data/app.db"

    logger.info("Using SQLite database: %s", url)
    return create_engine(url, connect_args={"check_same_thread": False})


engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
