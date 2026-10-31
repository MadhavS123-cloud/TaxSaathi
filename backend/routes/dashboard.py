"""
routes/dashboard.py - Dashboard summary computed from real DB data.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from db.session import get_db
from db.models import Case, Document, User
from dependencies.auth import require_jwt_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _get_user_firm_id(db: Session, caller: str) -> Optional[str]:
    user = db.query(User).filter(User.email == caller).first()
    return user.firm_id if user else None


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    caller: str = Depends(require_jwt_user),
):
    """Return real-time dashboard metrics for the authenticated firm."""
    firm_id = _get_user_firm_id(db, caller)

    if firm_id:
        cases = db.query(Case).filter(Case.firm_id == firm_id).all()
    else:
        cases = db.query(Case).filter(Case.owner == caller).all()

    case_ids = [c.id for c in cases]

    # Count documents by status
    docs_extracted = 0
    docs_failed = 0
    docs_processing = 0
    if case_ids:
        all_docs = db.query(Document).filter(Document.case_id.in_(case_ids)).all()
        for d in all_docs:
            if d.status == "extracted":
                docs_extracted += 1
            elif d.status == "failed":
                docs_failed += 1
            else:
                docs_processing += 1

    return {
        "active_engagements": len(cases),
        "matched": docs_extracted,
        "unmatched": docs_failed,
        "pending": docs_processing,
        "total_documents": docs_extracted + docs_failed + docs_processing,
    }
