"""
Phase-1 temporary admin-token authentication dependency.

This guard will be replaced by real JWT verification in Phase 2.
Every write route (POST / PUT / PATCH / DELETE) depends on this.
"""
import hmac
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_bearer = HTTPBearer(auto_error=False)


def require_admin_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> None:
    """
    Verify that the request carries a valid admin Bearer token.

    The expected token is read from the ADMIN_API_TOKEN environment variable.
    Returns None on success; raises HTTPException on failure.
    """
    expected = os.getenv("ADMIN_API_TOKEN", "")
    if not expected:
        # Fail loudly if the env var was not set — safe-fail posture.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfiguration: ADMIN_API_TOKEN not set.",
        )

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Use compare_digest to prevent timing-based token enumeration.
    token_matches = hmac.compare_digest(
        credentials.credentials.encode(), expected.encode()
    )
    if not token_matches:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired admin token.",
        )
