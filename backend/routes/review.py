"""
routes/review.py - Review & Approve workflow backend routes.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.session import get_db
from db.models import ReviewItem, Document, Case, User
from dependencies.auth import get_current_user

router = APIRouter(prefix="/review", tags=["Review & Approve"])


class ReviewActionRequest(BaseModel):
    action: str  # 'approved' or 'rejected'


@router.get("/items")
def list_review_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all review items for the user's firm, synchronizing any failed documents."""
    firm_id = current_user.firm_id
    if not firm_id:
        return []

    # Auto-sync any failed documents in this firm's cases into review items if not present
    cases = db.query(Case).filter(Case.firm_id == firm_id).all()
    case_ids = [c.id for c in cases]
    case_map = {c.id: (c.client or "Unknown Case") for c in cases}

    if case_ids:
        failed_docs = db.query(Document).filter(
            Document.case_id.in_(case_ids),
            Document.status == "failed"
        ).all()

        for d in failed_docs:
            existing = db.query(ReviewItem).filter(
                ReviewItem.firm_id == firm_id,
                ReviewItem.case_id == d.case_id,
                ReviewItem.title == f"Failed OCR: {d.filename}"
            ).first()
            if not existing:
                new_item = ReviewItem(
                    firm_id=firm_id,
                    case_id=d.case_id,
                    item_type="failed_extraction",
                    title=f"Failed OCR: {d.filename}",
                    detail=d.error_detail or "Extraction failed.",
                    status="pending",
                )
                db.add(new_item)
        db.commit()

    items = (
        db.query(ReviewItem)
        .filter(ReviewItem.firm_id == firm_id)
        .order_by(ReviewItem.created_at.desc())
        .all()
    )

    return [
        {
            "id": it.id,
            "firm_id": it.firm_id,
            "case_id": it.case_id,
            "case_name": case_map.get(it.case_id, "General"),
            "item_type": it.item_type,
            "title": it.title,
            "detail": it.detail,
            "status": it.status,
            "reviewer": it.reviewer,
            "reviewed_at": it.reviewed_at.strftime("%Y-%m-%d %H:%M") if it.reviewed_at else None,
            "created_at": it.created_at.strftime("%Y-%m-%d %H:%M") if it.created_at else None,
        }
        for it in items
    ]


@router.post("/items/{item_id}/action")
def take_review_action(
    item_id: str,
    body: ReviewActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Approve or reject a review item; records reviewer and timestamp."""
    action = body.action.lower().strip()
    if action not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Action must be 'approved' or 'rejected'.")

    item = db.query(ReviewItem).filter(ReviewItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Review item not found.")

    if item.firm_id != current_user.firm_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    item.status = action
    item.reviewer = current_user.name or current_user.email
    item.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(item)

    return {
        "id": item.id,
        "status": item.status,
        "reviewer": item.reviewer,
        "reviewed_at": item.reviewed_at.strftime("%Y-%m-%d %H:%M") if item.reviewed_at else None,
    }
