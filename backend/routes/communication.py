"""POST /api/communication/send-email sends a reviewed client note as plain text."""

import os
import re
import smtplib
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from db.models import User
from dependencies.auth import get_current_user

router = APIRouter(prefix="/api/communication", tags=["Communication"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_MAX_BODY = 10_000
_SMTP_VARS = ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD")


class SendEmailRequest(BaseModel):
    to_email: str
    subject: str
    body: str


def _missing_smtp_var() -> str | None:
    for name in _SMTP_VARS:
        if not os.getenv(name, "").strip():
            return name
    return None


def _smtp_port() -> int:
    raw = os.getenv("SMTP_PORT", "").strip()
    try:
        port = int(raw)
    except ValueError:
        raise HTTPException(status_code=500, detail="SMTP_PORT is missing or is not a port number.") from None
    if port < 1 or port > 65535:
        raise HTTPException(status_code=500, detail="SMTP_PORT is missing or is not a port number.")
    return port


def _validated(payload: SendEmailRequest) -> tuple[str, str, str]:
    to_email = (payload.to_email or "").strip()
    subject = (payload.subject or "").strip()
    body = payload.body if isinstance(payload.body, str) else ""
    if not _EMAIL_RE.fullmatch(to_email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if not subject:
        raise HTTPException(status_code=400, detail="Subject is required.")
    if not body.strip():
        raise HTTPException(status_code=400, detail="Body is required.")
    if len(body) > _MAX_BODY:
        raise HTTPException(status_code=400, detail="Body must be 10,000 characters or fewer.")
    return to_email, subject, body


def _send_plain(host: str, port: int, user: str, password: str, to_email: str, subject: str, body: str) -> None:
    message = EmailMessage()
    message["From"] = user
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)
    with smtplib.SMTP(host, port, timeout=15) as smtp:
        smtp.starttls()
        smtp.login(user, password)
        smtp.send_message(message)


@router.post("/send-email")
async def send_email(
    payload: SendEmailRequest,
    current_user: User = Depends(get_current_user),
):
    """Send the reviewed draft. The caller must already be signed in."""
    del current_user
    missing = _missing_smtp_var()
    if missing:
        raise HTTPException(status_code=500, detail=f"Missing environment variable: {missing}.")
    to_email, subject, body = _validated(payload)
    host = os.getenv("SMTP_HOST", "").strip()
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    port = _smtp_port()
    try:
        await run_in_threadpool(_send_plain, host, port, user, password, to_email, subject, body)
    except (smtplib.SMTPException, OSError, TimeoutError):
        raise HTTPException(status_code=502, detail="The email could not be sent.") from None
    return {"status": "sent"}
