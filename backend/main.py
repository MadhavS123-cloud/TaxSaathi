import os
import sys
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from db.session import engine, Base, SessionLocal
from routes.auth import router as auth_router
from routes.clients import router as clients_router
from routes.cases import router as cases_router
from routes.documents import router as documents_router
from routes.reconciliation import router as reconciliation_router
from routes.advisory import router as advisory_router
from routes.dashboard import router as dashboard_router
from routes.activities import router as activities_router
from routes.review import router as review_router
from routes.extract import router as extract_router
from routes.draft import router as draft_router

logger = logging.getLogger(__name__)

# Env
ENV = os.getenv("ENV", "development").lower()
IS_DEV = ENV == "development"

# JWT guard
_jwt_secret = os.getenv("JWT_SECRET", "")
if not _jwt_secret and not IS_DEV:
    logger.critical("JWT_SECRET is not set. Refusing to start in production.")
    sys.exit(1)
elif not _jwt_secret:
    logger.warning("JWT_SECRET not set — protected routes will return HTTP 500.")

# Docs visibility
_docs_url = "/docs" if IS_DEV else None
_redoc_url = "/redoc" if IS_DEV else None
_openapi_url = "/openapi.json" if IS_DEV else None

# FastAPI app
app = FastAPI(
    title="TaxSaathi API",
    docs_url=_docs_url,
    redoc_url=_redoc_url,
    openapi_url=_openapi_url,
)

# CORS
_DEFAULT_PROD_ORIGIN = "https://tax-saathi-gamma.vercel.app"
_DEFAULT_DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

_env_origins_raw = os.getenv("CORS_ALLOWED_ORIGINS", "")
_extra_origins = [o.strip() for o in _env_origins_raw.split(",") if o.strip()]

allowed_origins = [_DEFAULT_PROD_ORIGIN] + _extra_origins
if IS_DEV:
    allowed_origins = list(dict.fromkeys(allowed_origins + _DEFAULT_DEV_ORIGINS))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(auth_router)
app.include_router(clients_router)
app.include_router(cases_router)
app.include_router(documents_router)
app.include_router(reconciliation_router)
app.include_router(advisory_router)
app.include_router(dashboard_router)
app.include_router(activities_router)
app.include_router(review_router)
app.include_router(extract_router)
app.include_router(draft_router)

# Auto-create tables on startup
Base.metadata.create_all(bind=engine)

# Ensure upload directory exists
_this_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.dirname(_this_dir)
os.makedirs(os.path.join(_root_dir, "data", "uploads"), exist_ok=True)
os.makedirs("data/uploads", exist_ok=True)


@app.get("/health")
def health():
    """Public health probe required by Step 2."""
    db_ok = False
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception:
        pass

    gemini_key = bool(os.getenv("GEMINI_API_KEY", "").strip())

    chroma_loaded = False
    try:
        import chromadb
        chroma_loaded = True
    except Exception:
        pass

    return {
        "status": "ok" if db_ok else "error",
        "db": db_ok,
        "gemini_key_present": gemini_key,
        "chroma_loaded": chroma_loaded,
    }
