"""Client communication draft. Routes import this model; do not duplicate it."""

from pydantic import BaseModel, Field


class DraftRequest(BaseModel):
    case_id: str


class DraftResponse(BaseModel):
    case_id: str
    subject: str
    body: str
    review_banner: str = "Draft - requires CA review"
    review_item_id: str
    status: str = "pending"
