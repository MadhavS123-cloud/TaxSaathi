"""POST /draft writes a client email from the case's stored results."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from communication.draft import REVIEW_BANNER, compose_client_draft
from db.models import Activity, Case, ChatMessage, Reconciliation, ReviewItem, User
from db.session import get_db
from dependencies.auth import get_current_user
from schemas.draft import DraftRequest, DraftResponse

router = APIRouter(tags=["Communication"])


def _case_for_user(db: Session, case_id: str, user: User) -> Case:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    firm_id = user.firm_id
    if firm_id and case.firm_id and case.firm_id != firm_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if not firm_id and case.owner != user.email:
        raise HTTPException(status_code=403, detail="Access denied.")
    if not firm_id:
        raise HTTPException(
            status_code=400,
            detail="A firm is required before a client draft can be queued for review.",
        )
    return case


@router.post("/draft", response_model=DraftResponse)
def create_draft(
    body: DraftRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Draft a client email from the latest reconciliation and advisory reply."""
    case = _case_for_user(db, body.case_id, current_user)
    recon = (
        db.query(Reconciliation)
        .filter(Reconciliation.case_id == case.id)
        .order_by(Reconciliation.created_at.desc())
        .first()
    )
    advice = (
        db.query(ChatMessage)
        .filter(ChatMessage.case_id == case.id, ChatMessage.role == "assistant")
        .order_by(ChatMessage.created_at.desc())
        .first()
    )
    drafted = compose_client_draft(
        case.client or "",
        recon.result_json if recon else None,
        advice.content if advice else None,
    )
    if drafted is None:
        raise HTTPException(
            status_code=400,
            detail="This case has no reconciliation or advisory result to draft from.",
        )

    title = f"Client draft: {case.client or case.title or case.id}"
    item = (
        db.query(ReviewItem)
        .filter(
            ReviewItem.firm_id == current_user.firm_id,
            ReviewItem.case_id == case.id,
            ReviewItem.item_type == "draft_email",
            ReviewItem.status == "pending",
        )
        .order_by(ReviewItem.created_at.desc())
        .first()
    )
    detail = f"{drafted['subject']}\n\n{drafted['body']}"
    if item is None:
        item = ReviewItem(
            firm_id=current_user.firm_id,
            case_id=case.id,
            item_type="draft_email",
            title=title,
            detail=detail,
            status="pending",
        )
        db.add(item)
    else:
        item.title = title
        item.detail = detail

    db.add(Activity(
        owner=current_user.email,
        firm_id=current_user.firm_id,
        case_id=case.id,
        type="message",
        client=case.client,
        description="Drafted a client note for CA review.",
    ))
    db.commit()
    db.refresh(item)
    return DraftResponse(
        case_id=case.id,
        subject=drafted["subject"],
        body=drafted["body"],
        review_banner=REVIEW_BANNER,
        review_item_id=item.id,
        status=item.status,
    )
