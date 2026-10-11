from pydantic import BaseModel
from typing import List, Optional


class Citation(BaseModel):
    """Represents a source citation from the tax law corpus."""
    act: str                          # e.g., "CGST Act, 2017"
    section_number: str               # e.g., "16"
    section_title: str = ""          # e.g., "Eligibility and conditions for taking input tax credit"
    subsection: str = ""             # e.g., "(1)" — blank if not parsed
    excerpt: str = ""                # Short supporting quote from the chunk
    source_file: str = ""            # e.g., "cgst_act_2022.html"


class AdvisoryRequest(BaseModel):
    """Request payload for tax advisory query."""
    query: str       # Tax question from the user
    top_k: int = 7  # Number of top results to retrieve (default: 7)


class AdvisoryResponse(BaseModel):
    """Response payload for tax advisory."""
    query: str                   # Echo back the user's query
    answer: str                  # Grounded tax advice based on RAG retrieval
    citations: List[Citation]    # Sources used to ground the answer
    confidence: float = 0.5      # Confidence score (0.0 to 1.0)
    is_low_confidence: bool = False  # Flag if answer is low confidence
    notes: Optional[str] = None  # Additional caveats or disclaimers
