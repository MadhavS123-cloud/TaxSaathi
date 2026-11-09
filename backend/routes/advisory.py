"""
routes/advisory.py - RAG-powered Indian Tax Advisory API.

Endpoints:
  POST /advisory/ask     - Ask statutory tax questions, receive grounded answers + citations
  GET  /advisory/history - Retrieve persisted case chat history
  POST /api/advisory     - Legacy alias for backwards compatibility
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import Optional, List
import logging

from dependencies.auth import get_current_user
from db.session import get_db
from db.models import ChatMessage, User
from advisory import ask_tax_copilot
from schemas.advisory import AdvisoryRequest, AdvisoryResponse, Citation

router = APIRouter(tags=["Advisory"])
logger = logging.getLogger(__name__)


@router.get("/advisory/history")
@router.get("/api/advisory/history", include_in_schema=False)
def get_chat_history(
    case_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return saved chat messages for a case or for the authenticated user."""
    query = db.query(ChatMessage).filter(ChatMessage.owner == current_user.email)
    if case_id:
        query = query.filter(ChatMessage.case_id == case_id)
    messages = query.order_by(ChatMessage.created_at.asc()).all()
    return [
        {
            "id": m.id,
            "case_id": m.case_id,
            "role": m.role,
            "content": m.content,
            "citations": m.citations_json or [],
            "confidence": m.confidence,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }
        for m in messages
    ]


@router.post("/advisory/ask", response_model=AdvisoryResponse)
@router.post("/api/advisory", response_model=AdvisoryResponse, include_in_schema=False)
async def ask_advisory(
    request: AdvisoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Query the RAG advisory system with a tax question.
    Grounded with citations against bare acts (Income Tax Act, CGST Act, IGST Act).
    """
    query_text = (request.question or request.query or "").strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="Question / query cannot be empty.")

    top_k = request.top_k

    try:
        result = ask_tax_copilot(query_text, top_k=top_k)
        parsed = result.get("parsed", {})

        citations: List[Citation] = []
        for sec in parsed.get("cited_sections", []):
            try:
                citations.append(
                    Citation(
                        act=sec.get("act", ""),
                        section_number=sec.get("section_number", ""),
                        section_title=sec.get("section_title", ""),
                        subsection=sec.get("subsection", ""),
                        excerpt=sec.get("excerpt", ""),
                        source_file=sec.get("source_file", ""),
                    )
                )
            except Exception:
                continue

        confidence_level = parsed.get("confidence_level", "LOW").upper()
        confidence_map = {"HIGH": 0.90, "MEDIUM": 0.65, "LOW": 0.35}
        confidence = confidence_map.get(confidence_level, 0.35)

        is_insufficient = parsed.get("is_insufficient_context", False)
        if is_insufficient:
            confidence = 0.10

        confidence = min(0.95, confidence)
        is_low_confidence = confidence < 0.7

        notes = None
        if is_insufficient:
            notes = (
                "The corpus does not contain the answer. "
                "Verify with the official bare act. Do not rely on the Income Tax Act, 1961."
            )
        elif is_low_confidence:
            notes = (
                "This answer is based on partial context. "
                "Cross-check the cited provisions against the official bare act before advising clients."
            )

        answer_text = result.get("answer", "")
        if not answer_text.strip():
            answer_text = "No statutory provisions could be retrieved for this query. Please refine your query with specific section numbers or tax terms."

        # Save to DB history
        try:
            user_msg = ChatMessage(
                case_id=request.case_id,
                owner=current_user.email,
                role="user",
                content=query_text,
            )
            db.add(user_msg)

            citations_dict = [c.model_dump() for c in citations]
            asst_msg = ChatMessage(
                case_id=request.case_id,
                owner=current_user.email,
                role="assistant",
                content=answer_text,
                citations_json=citations_dict,
                confidence=confidence,
            )
            db.add(asst_msg)
            db.commit()
        except Exception as persist_err:
            logger.warning("Failed to persist chat messages: %s", persist_err)

        return AdvisoryResponse(
            query=query_text,
            answer=answer_text,
            citations=citations,
            confidence=confidence,
            is_low_confidence=is_low_confidence,
            notes=notes,
        )

    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    except Exception as e:
        logger.error("Advisory query failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate tax advisory: {str(e)}",
        )


@router.get("/api/advisory/health")
async def advisory_health(
    current_user: User = Depends(get_current_user),
):
    """Health probe for RAG advisory."""
    return {"status": "ok", "message": "Advisory service operational"}
