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
            - top_k: Number of top results to retrieve (optional, default: 3)
    
    Returns:
        AdvisoryResponse with:
            - query: Echo of the user's question
            - answer: Grounded tax advice
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
        
        # Parse citations from the result
        citations = []
        for citation_str in result.get("citations", []):
            # citation_str format: "Income Tax Act, 1961, Section 80C (Deduction for life insurance premium)"
            try:
                parts = citation_str.split("Section ")
                if len(parts) == 2:
                    act_name = parts[0].strip().rstrip(",")
                    section_info = parts[1]  # "80C (Deduction for life insurance premium)"
                    
                    # Parse section number and title
                    if "(" in section_info and ")" in section_info:
                        section_num = section_info.split("(")[0].strip()
                        section_title = section_info.split("(")[1].rstrip(")").strip()
                    else:
                        section_num = section_info.strip()
                        section_title = ""
                    
                    citations.append(Citation(
                        act=act_name,
                        section_number=section_num,
                        section_title=section_title
                    ))
            except Exception as e:
                logger.warning(f"Failed to parse citation '{citation_str}': {str(e)}")
                continue
        
        # Determine confidence score based on answer length and structure
        # Simple heuristic: longer, structured answers are more confident
        answer_text = result.get("answer", "")
        answer_length = len(answer_text)
        
        # Score components:
        # - At least 100 chars = 0.3 points
        # - Has bullet points or sections = 0.3 points
        # - Has citations = 0.2 points
        # - Has disclaimer/caution = 0.2 points
        confidence = 0.0
        
        if answer_length > 100:
            confidence += 0.3
        if "•" in answer_text or "\n" in answer_text:
            confidence += 0.3
        if len(citations) > 0:
            confidence += 0.2
        if any(word in answer_text.lower() for word in ["however", "note:", "caution", "disclaimer", "subject to", "may vary"]):
            confidence += 0.2
        
        # Cap confidence at 0.95 (never fully confident due to LLM uncertainty)
        confidence = min(0.95, confidence)
        
        # Flag low confidence if below 0.7
        is_low_confidence = confidence < 0.7
        
        # Add disclaimer for low-confidence answers
        notes = None
        if is_low_confidence:
            notes = "This answer has lower confidence. Please verify with official tax documentation or consult with a qualified CA."
        
        return AdvisoryResponse(
            query=request.query,
            answer=answer_text,
            citations=citations,
            confidence=confidence,
            is_low_confidence=is_low_confidence,
            notes=notes
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
        # Try a simple test query
        test_result = ask_tax_copilot("What is GST?", top_k=1)
        
        if test_result and "answer" in test_result:
            return {
                "status": "ok",
                "message": "Advisory service is operational",
                "rag_backend": "chromadb",
                "llm_model": "gemini-3.6-flash"
            }
        else:
            return {
                "status": "degraded",
                "message": "Advisory service returned empty response",
                "rag_backend": "chromadb",
                "llm_model": "gemini-3.6-flash"
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Advisory service unavailable: {str(e)}",
            "rag_backend": "chromadb",
            "llm_model": "gemini-3.6-flash"
        }
