"""
routes/cases.py - Cases CRUD scoped to the authenticated user firm.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict

from pydantic import BaseModel

from db.session import get_db
from db.models import Case, Activity, User
from dependencies.auth import require_jwt_user

router = APIRouter(prefix="/cases", tags=["cases"])


def _get_user_firm_id(db: Session, caller: str) -> Optional[str]:
    """Look up the firm_id for the authenticated user email."""
    user = db.query(User).filter(User.email == caller).first()
    return user.firm_id if user else None


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


def _case_to_response(c: Case) -> dict:
    return {
        "id": c.id,
        "client": c.client,
        "scope": c.scope,
        "gstin": c.gstin,
        "status": c.status,
        "lastUpdated": c.updated_at.strftime("%Y-%m-%d %H:%M"),
        "reconciliation": {"matched": 0, "exception": 0, "pending": 0},
    }


@router.get("/", response_model=List[CaseResponse])
def get_cases(
    db: Session = Depends(get_db),
    caller: str = Depends(require_jwt_user),
):
    """Return only the cases belonging to the authenticated user firm."""
    firm_id = _get_user_firm_id(db, caller)
    if firm_id:
        cases = (
            db.query(Case)
            .filter(Case.firm_id == firm_id)
            .order_by(Case.created_at.desc())
            .all()
        )
    else:
        # Fallback: legacy owner-scoped query
        cases = (
            db.query(Case)
            .filter(Case.owner == caller)
            .order_by(Case.created_at.desc())
            .all()
        )
    return [_case_to_response(c) for c in cases]


@router.post("/", response_model=CaseResponse)
def create_case(
    case_in: CaseCreate,
    db: Session = Depends(get_db),
    caller: str = Depends(require_jwt_user),
):
    """Create a new case owned by the authenticated user firm."""
    firm_id = _get_user_firm_id(db, caller)

    db_case = Case(
        owner=caller,
        firm_id=firm_id,
        client=case_in.client,
        scope=case_in.scope,
        gstin=case_in.gstin,
        status=case_in.status or "PENDING",
    )
    db.add(db_case)
    db.commit()
    db.refresh(db_case)

    activity = Activity(
        owner=caller,
        firm_id=firm_id,
        case_id=db_case.id,
        type="upload",
        client=db_case.client,
        description=f"New engagement initiated ({db_case.scope})",
    )
    db.add(activity)
    db.commit()

    return _case_to_response(db_case)


@router.get("/{case_id}", response_model=CaseResponse)
def get_case(
    case_id: str,
    db: Session = Depends(get_db),
    caller: str = Depends(require_jwt_user),
):
    """Return a single case. Ensures firm-level isolation."""
    firm_id = _get_user_firm_id(db, caller)
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    # Firm isolation check
    if firm_id and case.firm_id and case.firm_id != firm_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if not firm_id and case.owner != caller:
        raise HTTPException(status_code=403, detail="Access denied.")
    return _case_to_response(case)


@router.delete("/")
def clear_all_cases(
    db: Session = Depends(get_db),
    caller: str = Depends(require_jwt_user),
):
    """Delete only the authenticated user firm cases and their activities."""
    firm_id = _get_user_firm_id(db, caller)

    if firm_id:
        case_ids = [row.id for row in db.query(Case.id).filter(Case.firm_id == firm_id).all()]
    else:
        case_ids = [row.id for row in db.query(Case.id).filter(Case.owner == caller).all()]

    if case_ids:
        db.query(Activity).filter(Activity.case_id.in_(case_ids)).delete(synchronize_session=False)
        if firm_id:
            db.query(Case).filter(Case.firm_id == firm_id).delete(synchronize_session=False)
        else:
            db.query(Case).filter(Case.owner == caller).delete(synchronize_session=False)

    db.query(Activity).filter(
        Activity.owner == caller, Activity.case_id.is_(None)
    ).delete(synchronize_session=False)
    db.commit()
    return {"status": "ok"}
