"""
routes/clients.py - Clients CRUD scoped to the authenticated user's firm_id.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.session import get_db
from db.models import Client, User
from dependencies.auth import get_current_user

router = APIRouter(prefix="/clients", tags=["Clients"])


class ClientCreate(BaseModel):
    legal_name: str
    gstin: Optional[str] = None
    pan: Optional[str] = None


class ClientResponse(BaseModel):
    id: str
    firm_id: str
    legal_name: str
    gstin: Optional[str] = None
    pan: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[ClientResponse])
@router.get("/", response_model=List[ClientResponse], include_in_schema=False)
def list_clients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all clients for the authenticated user's firm."""
    if not current_user.firm_id:
        return []
    clients = (
        db.query(Client)
        .filter(Client.firm_id == current_user.firm_id)
        .order_by(Client.created_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "firm_id": c.firm_id,
            "legal_name": c.legal_name,
            "gstin": c.gstin,
            "pan": c.pan,
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M"),
        }
        for c in clients
    ]


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_client(
    body: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new client under the authenticated user's firm."""
    if not body.legal_name.strip():
        raise HTTPException(status_code=422, detail="Legal name cannot be empty.")
    if not current_user.firm_id:
        raise HTTPException(status_code=400, detail="User is not associated with any firm.")

    client = Client(
        firm_id=current_user.firm_id,
        legal_name=body.legal_name.strip(),
        gstin=body.gstin.strip().upper() if body.gstin else None,
        pan=body.pan.strip().upper() if body.pan else None,
    )
    db.add(client)
    db.commit()
    db.refresh(client)

    return {
        "id": client.id,
        "firm_id": client.firm_id,
        "legal_name": client.legal_name,
        "gstin": client.gstin,
        "pan": client.pan,
        "created_at": client.created_at.strftime("%Y-%m-%d %H:%M"),
    }
