from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.extract import router as extract_router
from routes.reconciliation import router as reconciliation_router
from routes.advisory import router as advisory_router

app = FastAPI(title="TaxSaathi API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(extract_router)
app.include_router(reconciliation_router)
app.include_router(advisory_router)

@app.get("/health")
def health():
    return {"status": "ok"}
