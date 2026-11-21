"""
routes/dashboard.py - Dashboard summary computed from real DB data.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from db.session import get_db
from db.models import Case, Document, Reconciliation, User
from dependencies.auth import get_current_user
from reconciliation.counts import counts_from_summary

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return real-time dashboard metrics for the authenticated user's firm."""
    firm_id = current_user.firm_id

    if firm_id:
        cases = db.query(Case).filter(Case.firm_id == firm_id).all()
    else:
        cases = db.query(Case).filter(Case.owner == current_user.email).all()

    case_ids = [c.id for c in cases]

    docs_extracted = 0
    docs_failed = 0
    docs_processing = 0
    if case_ids:
        docs = db.query(Document).filter(Document.case_id.in_(case_ids)).all()
        for d in docs:
            if d.status == "extracted":
                docs_extracted += 1
            elif d.status == "failed":
                docs_failed += 1
            else:
                docs_processing += 1

    # Ledger matches come from the reconciliation report. An extracted
    # document is not a matched bank line.
    recon_matched = 0
    recon_exceptions = 0
    recon_timing = 0
    if case_ids:
        reconciliations = db.query(Reconciliation).filter(Reconciliation.case_id.in_(case_ids)).all()
        for r in reconciliations:
            if r.result_json and isinstance(r.result_json, dict):
                matched, unmatched, timing = counts_from_summary(r.result_json.get("summary"))
                recon_matched += matched
                recon_exceptions += unmatched
                recon_timing += timing

    total_matched = recon_matched
    total_unmatched = docs_failed + recon_exceptions
    total_timing = docs_processing + recon_timing

    return {
        "active_engagements": len(cases),
        "matched": total_matched,
        "unmatched": total_unmatched,
        "pending": total_timing,
        "total_documents": docs_extracted + docs_failed + docs_processing,
    }
