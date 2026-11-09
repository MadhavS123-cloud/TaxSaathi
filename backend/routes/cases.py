"""
routes/cases.py - Cases CRUD scoped strictly to the authenticated user's firm.
"""
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.session import get_db
from db.models import Case, Client, Activity, User, Document, Reconciliation
from dependencies.auth import get_current_user

router = APIRouter(prefix="/cases", tags=["Cases"])


class CaseCreate(BaseModel):
    client: Optional[str] = None
    legal_name: Optional[str] = None
    client_id: Optional[str] = None
    scope: Optional[str] = None
    title: Optional[str] = None
    assessment_year: Optional[str] = "2024-25"
    gstin: Optional[str] = None
    pan: Optional[str] = None
    status: Optional[str] = "PENDING"
    reconciliation: Optional[Dict] = None


class CaseResponse(BaseModel):
    id: str
    client: str
    scope: str
    client_id: Optional[str] = None
    title: Optional[str] = None
    assessment_year: Optional[str] = None
    gstin: Optional[str] = None
    status: str
    lastUpdated: str
    reconciliation: Optional[Dict] = None

    class Config:
        from_attributes = True


def _case_to_response(c: Case, db: Session) -> dict:
    client_name = c.client or ""
    if not client_name and c.client_rel:
        client_name = c.client_rel.legal_name

    case_scope = c.scope or c.title or "General Audit"

    # Compute live reconciliation stats if available
    matched_count = 0
    exception_count = 0
    pending_count = 0

    latest_recon = (
        db.query(Reconciliation)
        .filter(Reconciliation.case_id == c.id)
        .order_by(Reconciliation.created_at.desc())
        .first()
    )
    if latest_recon and latest_recon.result_json:
        sum_data = latest_recon.result_json.get("summary", {})
        matched_count = sum_data.get("matched_count", 0)
        exception_count = sum_data.get("unmatched_count", 0)
        pending_count = sum_data.get("timing_count", 0)
    else:
        # Also include document processing counts
        docs = db.query(Document).filter(Document.case_id == c.id).all()
        for d in docs:
            if d.status == "extracted":
                matched_count += 1
            elif d.status == "failed":
                exception_count += 1
            else:
                pending_count += 1

    last_updated_dt = c.updated_at or c.created_at
    last_updated_str = last_updated_dt.strftime("%Y-%m-%d %H:%M") if last_updated_dt else "Just now"

    return {
        "id": c.id,
        "client": client_name or "Unnamed Client",
        "scope": case_scope,
        "client_id": c.client_id,
        "title": c.title or case_scope,
        "assessment_year": c.assessment_year or "2024-25",
        "gstin": c.gstin or (c.client_rel.gstin if c.client_rel else None),
        "status": c.status or "PENDING",
        "lastUpdated": last_updated_str,
        "reconciliation": {
            "matched": matched_count,
            "exception": exception_count,
            "pending": pending_count,
        },
    }


@router.get("", response_model=List[CaseResponse])
@router.get("/", response_model=List[CaseResponse], include_in_schema=False)
def get_cases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return only the cases belonging to the authenticated user's firm."""
    firm_id = current_user.firm_id
    if firm_id:
        cases = (
            db.query(Case)
            .filter(Case.firm_id == firm_id)
            .order_by(Case.created_at.desc())
            .all()
        )
    else:
        cases = (
            db.query(Case)
            .filter(Case.owner == current_user.email)
            .order_by(Case.created_at.desc())
            .all()
        )
    return [_case_to_response(c, db) for c in cases]


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=CaseResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_case(
    case_in: CaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new case owned by the authenticated user's firm."""
    firm_id = current_user.firm_id
    client_name = (case_in.client or case_in.legal_name or "").strip()
    case_scope = (case_in.scope or case_in.title or "General Tax Engagement").strip()

    if not client_name:
        raise HTTPException(status_code=422, detail="Client / legal name cannot be empty.")

    # Find or create Client record
    client_id = case_in.client_id
    if not client_id and firm_id:
        existing_client = (
            db.query(Client)
            .filter(Client.firm_id == firm_id, Client.legal_name == client_name)
            .first()
        )
        if existing_client:
            client_id = existing_client.id
        else:
            new_client = Client(
                firm_id=firm_id,
                legal_name=client_name,
                gstin=case_in.gstin,
                pan=case_in.pan,
            )
            db.add(new_client)
            db.flush()
            client_id = new_client.id

    db_case = Case(
        owner=current_user.email,
        firm_id=firm_id,
        client_id=client_id,
        client=client_name,
        scope=case_scope,
        title=case_scope,
        assessment_year=case_in.assessment_year or "2024-25",
        gstin=case_in.gstin,
        status=case_in.status or "PENDING",
    )
    db.add(db_case)
    db.commit()
    db.refresh(db_case)

    # Log initial activity
    activity = Activity(
        owner=current_user.email,
        firm_id=firm_id,
        case_id=db_case.id,
        type="upload",
        client=client_name,
        description=f"New engagement initiated ({case_scope})",
    )
    db.add(activity)
    db.commit()

    return _case_to_response(db_case, db)


@router.get("/{case_id}", response_model=CaseResponse)
def get_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a single case. Ensures strict firm-level isolation."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    # Strict isolation check
    firm_id = current_user.firm_id
    if firm_id and case.firm_id and case.firm_id != firm_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if not firm_id and case.owner != current_user.email:
        raise HTTPException(status_code=403, detail="Access denied.")

    return _case_to_response(case, db)


@router.delete("", status_code=status.HTTP_200_OK)
@router.delete("/", status_code=status.HTTP_200_OK, include_in_schema=False)
def clear_all_cases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete all cases and associated data for the caller's firm."""
    firm_id = current_user.firm_id
    if firm_id:
        cases = db.query(Case).filter(Case.firm_id == firm_id).all()
    else:
        cases = db.query(Case).filter(Case.owner == current_user.email).all()

    case_ids = [c.id for c in cases]
    if case_ids:
        db.query(Activity).filter(Activity.case_id.in_(case_ids)).delete(synchronize_session=False)
        db.query(Document).filter(Document.case_id.in_(case_ids)).delete(synchronize_session=False)
        db.query(Reconciliation).filter(Reconciliation.case_id.in_(case_ids)).delete(synchronize_session=False)
        db.query(Case).filter(Case.id.in_(case_ids)).delete(synchronize_session=False)

    db.commit()
    return {"status": "ok"}
