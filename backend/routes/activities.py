from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from db.session import get_db
from db.models import Activity

router = APIRouter(prefix="/activities", tags=["activities"])

class ActivityResponse(BaseModel):
    id: int
    type: str
    client: str | None
    description: str
    timestamp: str
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[ActivityResponse])
def get_activities(db: Session = Depends(get_db)):
    activities = db.query(Activity).order_by(Activity.timestamp.desc()).all()
    results = []
    for a in activities:
        results.append({
            "id": a.id,
            "type": a.type,
            "client": a.client,
            "description": a.description,
            "timestamp": "Just now" # Should calculate difference from now, keep it simple for MVP
        })
    return results
