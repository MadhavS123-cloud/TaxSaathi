from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from db.session import get_db
from db.models import Activity, User
from dependencies.auth import get_current_user

router = APIRouter(prefix="/activities", tags=["Activities"])


class ActivityResponse(BaseModel):
    id: int
    type: str
    client: str | None
    description: str
    timestamp: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[ActivityResponse])
@router.get("/", response_model=List[ActivityResponse], include_in_schema=False)
def get_activities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return activities belonging to the authenticated user's firm."""
    firm_id = current_user.firm_id
    if firm_id:
        activities = (
            db.query(Activity)
            .filter(Activity.firm_id == firm_id)
            .order_by(Activity.timestamp.desc())
            .limit(20)
            .all()
        )
    else:
        activities = (
            db.query(Activity)
            .filter(Activity.owner == current_user.email)
            .order_by(Activity.timestamp.desc())
            .limit(20)
            .all()
        )

    results = []
    for a in activities:
        results.append({
            "id": a.id,
            "type": a.type,
            "client": a.client,
            "description": a.description,
            "timestamp": a.timestamp.strftime("%Y-%m-%d %H:%M") if a.timestamp else "Just now",
        })
    return results
