from fastapi import APIRouter, HTTPException
from schemas.advisory import AdvisoryRequest, AdvisoryResponse, Citation
from advisory import ask_tax_copilot
import logging

router = APIRouter(prefix="/api", tags=["Advisory"])

# Configure logging
logger = logging.getLogger(__name__)


@router.post("/advisory", response_model=AdvisoryResponse)
async def get_tax_advisory(request: AdvisoryRequest):
    """
    Get grounded tax advisory based on Indian tax law (Income Tax Act, GST Act).

    Query the RAG system with a tax question and receive grounded answers with
    citations to specific sections of the Income Tax Act, CGST Act, and IGST Act.

    Args:
        request: AdvisoryRequest containing:
            - query: The tax question (required)
            - top_k: Number of top results to retrieve (optional, default: 5)

    Returns:
        AdvisoryResponse with:
            - query: Echo of the user question
            - answer: Grounded tax advice (summary + detailed + CA action note)
            - citations: List of source citations (act, section_number, section_title)
            - confidence: Confidence score (0.0 to 1.0)
            - is_low_confidence: True if confidence < 0.7
            - notes: Any disclaimers or caveats

    Raises:
        HTTPException: 400 if query is empty or invalid
        HTTPException: 500 if RAG retrieval or LLM generation fails
    """

    # Validate request
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    if request.top_k < 1 or request.top_k > 10:
        raise HTTPException(status_code=400, detail="top_k must be between 1 and 10")

    try:
        # Call the advisory function
        result = ask_tax_copilot(request.query, top_k=request.top_k)
        parsed = result.get("parsed", {})

        # Build citations from parsed structured output.
        # advisory.py already extracted these from SECTION_REF lines
        # (with fallback to ChromaDB metadata) - no fragile regex here.
        citations = []
        for sec in parsed.get("cited_sections", []):
            try:
                citations.append(Citation(
                    act=sec.get("act", ""),
                    section_number=sec.get("section_number", ""),
                    section_title=sec.get("section_title", ""),
                ))
            except Exception as e:
                logger.warning(f"Failed to build Citation object from {sec}: {e}")
                continue

        # Map confidence level (HIGH / MEDIUM / LOW) to float score
        confidence_level = parsed.get("confidence_level", "LOW").upper()
        confidence_map = {"HIGH": 0.90, "MEDIUM": 0.65, "LOW": 0.35}
        confidence = confidence_map.get(confidence_level, 0.35)

        # Reduce sharply if context was insufficient
        if parsed.get("is_insufficient_context", False):
            confidence = 0.10

        # Cap at 0.95 (never fully confident due to LLM uncertainty)
        confidence = min(0.95, confidence)
        is_low_confidence = confidence < 0.7

        # Notes / disclaimers
        notes = None
        if parsed.get("is_insufficient_context", False):
            notes = (
                "The retrieved statutory context did not contain sufficient "
                "information for this query. Please verify with official tax "
                "documentation or consult a qualified CA."
            )
        elif is_low_confidence:
            notes = (
                "This answer has lower confidence. Please verify with official "
                "tax documentation or consult a qualified CA."
            )

        answer_text = result.get("answer", "")

        return AdvisoryResponse(
            query=request.query,
            answer=answer_text,
            citations=citations,
            confidence=confidence,
            is_low_confidence=is_low_confidence,
            notes=notes,
        )

    except Exception as e:
        logger.error(f"Advisory query failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate tax advisory: {str(e)}"
        )


@router.get("/advisory/health")
async def advisory_health():
    """
    Health check for advisory service.
    Verifies that ChromaDB and Gemini API are accessible.
    """
    try:
        test_result = ask_tax_copilot("What is GST?", top_k=1)

        if test_result and "answer" in test_result:
            return {
                "status": "ok",
                "message": "Advisory service is operational",
                "rag_backend": "chromadb",
                "llm_model": "gemini-2.0-flash",
            }
        else:
            return {
                "status": "degraded",
                "message": "Advisory service returned empty response",
                "rag_backend": "chromadb",
                "llm_model": "gemini-2.0-flash",
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Advisory service unavailable: {str(e)}",
            "rag_backend": "chromadb",
            "llm_model": "gemini-2.0-flash",
        }
