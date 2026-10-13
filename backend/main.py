import os
import sys
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from db.session import engine, Base, SessionLocal
from routes.extract import router as extract_router
from routes.reconciliation import router as reconciliation_router
from routes.advisory import router as advisory_router
from routes.cases import router as cases_router
from routes.activities import router as activities_router

logger = logging.getLogger(__name__)

# ── Environment ────────────────────────────────────────────────────────────────
ENV = os.getenv("ENV", "production").lower()
IS_DEV = ENV == "development"

# Fail loudly at startup if ADMIN_API_TOKEN is absent in production.
# Phase 2 will replace this guard with a proper JWT check.
_admin_token = os.getenv("ADMIN_API_TOKEN", "")
if not _admin_token and not IS_DEV:
    logger.critical(
        "ADMIN_API_TOKEN env var is not set. "
        "Refusing to start in production without it."
    )
    sys.exit(1)

# ── Docs visibility ────────────────────────────────────────────────────────────
# In production: /docs, /redoc, /openapi.json return 404.
# In development: they remain accessible for local debugging.
_docs_url    = "/docs"     if IS_DEV else None
_redoc_url   = "/redoc"    if IS_DEV else None
_openapi_url = "/openapi.json" if IS_DEV else None

# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="TaxSaathi API",
    docs_url=_docs_url,
    redoc_url=_redoc_url,
    openapi_url=_openapi_url,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
# Build an explicit origin allowlist from environment variables.
# No wildcard regex — only the origins named here are accepted.
_DEFAULT_PROD_ORIGIN = "https://tax-saathi-gamma.vercel.app"
_DEFAULT_DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

_env_origins_raw = os.getenv("CORS_ALLOWED_ORIGINS", "")
if _env_origins_raw:
    _extra_origins = [o.strip() for o in _env_origins_raw.split(",") if o.strip()]
else:
    _extra_origins = []

allowed_origins: list[str] = [_DEFAULT_PROD_ORIGIN] + _extra_origins
if IS_DEV:
    allowed_origins = list(dict.fromkeys(allowed_origins + _DEFAULT_DEV_ORIGINS))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,       # explicit list — no regex
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(extract_router)
app.include_router(reconciliation_router)
app.include_router(advisory_router)
app.include_router(cases_router)
app.include_router(activities_router)

# ── Create DB tables ───────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)


# ── Health endpoint ────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    """Public health probe. Returns only {status: ok/error} — no internal details."""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception:
        db_ok = False

    return {"status": "ok" if db_ok else "error"}
