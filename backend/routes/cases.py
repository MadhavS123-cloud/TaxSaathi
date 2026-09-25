from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from typing import Optional, Dict

from db.session import get_db
from db.models import Case, Activity

router = APIRouter(prefix="/cases", tags=["cases"])

class CaseCreate(BaseModel):
    client: str
    scope: str
    gstin: Optional[str] = None
    status: Optional[str] = "PENDING"
    reconciliation: Optional[Dict] = None

class CaseResponse(BaseModel):
    id: str
    client: str
    scope: str
    gstin: Optional[str] = None
    status: str
    lastUpdated: str
    reconciliation: Optional[Dict] = None
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[CaseResponse])
def get_cases(db: Session = Depends(get_db)):
    cases = db.query(Case).order_by(Case.created_at.desc()).all()
    results = []
    for c in cases:
        # Dummy reconciliation stats until full logic implemented
        results.append({
            "id": c.id,
            "client": c.client,
            "scope": c.scope,
            "gstin": c.gstin,
            "status": c.status,
            "lastUpdated": c.updated_at.strftime("%Y-%m-%d %H:%M"),
            "reconciliation": {"matched": 0, "exception": 0, "pending": 0}
        })
    return results

@router.post("/", response_model=CaseResponse)
def create_case(case_in: CaseCreate, db: Session = Depends(get_db)):
    db_case = Case(
        client=case_in.client,
        scope=case_in.scope,
        gstin=case_in.gstin,
        status=case_in.status
    )
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    
    # Also log activity
    activity = Activity(
        case_id=db_case.id,
        type="upload",
        client=db_case.client,
        description=f"New engagement initiated ({db_case.scope})"
    )
    db.add(activity)
    db.commit()
    
    return {
        "id": db_case.id,
        "client": db_case.client,
        "scope": db_case.scope,
        "gstin": db_case.gstin,
        "status": db_case.status,
        "lastUpdated": db_case.updated_at.strftime("%Y-%m-%d %H:%M"),
        "reconciliation": case_in.reconciliation or {"matched": 0, "exception": 0, "pending": 0}
    }

@router.delete("/")
def clear_all_cases(db: Session = Depends(get_db)):
    db.query(Activity).delete()
    db.query(Case).delete()
    db.commit()
    return {"status": "ok"}
