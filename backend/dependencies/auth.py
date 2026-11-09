"""
dependencies/auth.py - JWT authentication dependencies for TaxSaathi.

Exports:
- get_current_user: Returns User ORM model (with user.id, user.firm_id, etc.).
- require_jwt_user: Returns user email string (for backwards compatibility).
"""

import os
import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
import jwt

from db.session import get_db
from db.models import User

logger = logging.getLogger(__name__)

# auto_error=False allows us to customize the exact 401 error message JSON
_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """
    Authenticate the caller using the Bearer JWT token in Authorization header.
    Returns the User ORM object with its associated firm_id.
    """
    secret = os.getenv("JWT_SECRET", "").strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfiguration: JWT_SECRET not set.",
        )

    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired, please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("sub")
    uid = payload.get("uid")

    user = None
    if uid:
        user = db.query(User).filter(User.id == str(uid)).first()
    if not user and email:
        user = db.query(User).filter(User.email == email.strip().lower()).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or session invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_jwt_user(
    current_user: User = Depends(get_current_user),
) -> str:
    """Return the authenticated caller email string (backward compatibility)."""
    return current_user.email
