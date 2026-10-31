"""
routes/auth.py — Email/password authentication for TaxSaathi.

Endpoints:
  POST /auth/register  — create firm + first user (name, email, password, firm_name)
  POST /auth/login     — returns JWT {access_token, token_type, user, firm}

JWT: HS256, 8h expiry, secret from JWT_SECRET env var.
Passwords: bcrypt via passlib.
"""
import os
import logging
from datetime import datetime, timezone, timedelta

import jwt
import bcrypt
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db.session import get_db
from db.models import User, Firm

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    firm_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET", "")
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfiguration: JWT_SECRET not set.",
        )
    return secret


def _make_token(email: str, user_id: str) -> str:
    secret = _jwt_secret()
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": email.strip().lower(),
        "uid": user_id,
        "iat": now,
        "exp": now + timedelta(hours=8),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new firm and its first user."""
    email = body.email.strip().lower()

    # Check for duplicate email
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters.",
        )

    # Create firm
    firm = Firm(name=body.firm_name.strip())
    db.add(firm)
    db.flush()  # get firm.id before committing

    # Create user
    user = User(
        name=body.name.strip(),
        email=email,
        password_hash=_hash_password(body.password),
        firm_id=firm.id,
        role="admin",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(firm)

    token = _make_token(email, str(user.id))
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": str(user.id), "name": user.name, "email": user.email, "role": user.role},
        "firm": {"id": str(firm.id), "name": firm.name},
    }


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email + password and return a JWT."""
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or not _verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    firm = db.query(Firm).filter(Firm.id == user.firm_id).first()
    firm_data = {"id": str(firm.id), "name": firm.name} if firm else {"id": "", "name": ""}

    token = _make_token(email, str(user.id))
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": str(user.id), "name": user.name, "email": user.email, "role": user.role},
        "firm": firm_data,
    }
