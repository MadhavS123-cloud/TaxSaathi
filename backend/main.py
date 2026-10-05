from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.extract import router as extract_router
from routes.reconciliation import router as reconciliation_router
from routes.advisory import router as advisory_router
from routes.cases import router as cases_router
from routes.activities import router as activities_router

import os
from sqlalchemy import text
from db.session import engine, Base, SessionLocal

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="TaxSaathi API")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "https://ca-tax-copilot.vercel.app",
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(extract_router)
app.include_router(reconciliation_router)
app.include_router(advisory_router)
app.include_router(cases_router)
app.include_router(activities_router)

@app.get("/health")
def health():
    db_status = "ok"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception as e:
        db_status = f"failed: {str(e)}"
        
    return {
        "status": "ok" if db_status == "ok" else "error",
        "database": db_status
    }
