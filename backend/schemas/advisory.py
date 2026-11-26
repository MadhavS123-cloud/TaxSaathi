"""Single advisory contract. Routes import these models; do not duplicate them."""

from typing import List, Optional
from pydantic import BaseModel, Field

DEFAULT_TOP_K = 7


class Citation(BaseModel):
    """A source citation from the tax-law corpus or general statutory reference."""

    act: str
    section_number: str
    section_title: str = ""
    subsection: str = ""
    excerpt: str = ""
    source_file: str = ""
    chunk_id: Optional[str] = None


class AdvisoryRequest(BaseModel):
    """Tax question.

    `query` is the canonical field. `question` is accepted because the
    UI sends that name.
    """

    query: Optional[str] = None
    question: Optional[str] = None
    top_k: int = Field(default=DEFAULT_TOP_K, ge=1, le=10)
    case_id: Optional[str] = None


class AdvisoryResponse(BaseModel):
    """Grounded tax advice. Draft for CA review."""

    query: str
    answer: str
    citations: List[Citation] = Field(default_factory=list)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    is_low_confidence: bool = False
    notes: Optional[str] = None

    # CA-friendly structured fields
    response_mode: Optional[str] = None
    is_corpus_verified: bool = False
    executive_summary: Optional[str] = None
    detailed_analysis: Optional[str] = None
    compliance_actionables: List[str] = Field(default_factory=list)
    assumptions_and_caveats: List[str] = Field(default_factory=list)
    follow_up_questions: List[str] = Field(default_factory=list)
