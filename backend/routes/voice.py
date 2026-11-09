"""Voice queries, spoken totals, and approve or reject on one reconciliation row."""

import base64
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from db.models import Activity, Case, Reconciliation, ReviewItem, User
from db.session import get_db
from dependencies.auth import get_current_user
from voice.answers import (
    REMINDER_LANGUAGES,
    decision_answer,
    partial_answer,
    partial_rows,
    reminder_answer,
    row_key,
    total_due,
    unpaid_rows,
)
from voice.intent import parse_intent
from voice.speech import SpeechError, synthesize, transcribe

router = APIRouter(prefix="/voice", tags=["Voice"])

_MAX_AUDIO = 8_000_000


class RemindRequest(BaseModel):
    case_id: str
    language: str = "hi-IN"


class VoiceTurnResponse(BaseModel):
    transcript: str
    intent: str
    answer: str
    audio_base64: str
    audio_mime: str = "audio/wav"
    language: str = "hi-IN"
    row_key: str | None = None
    review_status: str | None = None
    count: int = 0
    total_due: str = "0"


class RemindResponse(VoiceTurnResponse):
    transcript: str = ""
    intent: str = "remind"


def _case_for_user(db: Session, case_id: str, user: User) -> Case:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    firm_id = user.firm_id
    if firm_id and case.firm_id and case.firm_id != firm_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if not firm_id and case.owner != user.email:
        raise HTTPException(status_code=403, detail="Access denied.")
    return case


def _latest_result(db: Session, case_id: str) -> tuple[Reconciliation | None, dict]:
    recon = (
        db.query(Reconciliation)
        .filter(Reconciliation.case_id == case_id)
        .order_by(Reconciliation.created_at.desc())
        .first()
    )
    if not recon or not isinstance(recon.result_json, dict):
        return recon, {"rows": []}
    return recon, recon.result_json


def _speak(text: str, language: str) -> str:
    try:
        audio = synthesize(text, language)
    except SpeechError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return base64.b64encode(audio).decode("ascii")


def _apply_decision(db: Session, case: Case, user: User, recon: Reconciliation, result: dict, key: str, action: str) -> dict:
    if not user.firm_id:
        raise HTTPException(status_code=400, detail="A firm is required before a voice decision can be saved.")
    rows = list(result.get("rows") or [])
    chosen = next((row for row in rows if row_key(row) == key), None)
    if chosen is None:
        raise HTTPException(status_code=404, detail="That exception is not on the latest reconciliation.")
    chosen["review_status"] = action
    result = {**result, "rows": rows}
    recon.result_json = result
    flag_modified(recon, "result_json")

    title = f"Exception: {key}"
    item = (
        db.query(ReviewItem)
        .filter(ReviewItem.firm_id == user.firm_id, ReviewItem.case_id == case.id, ReviewItem.title == title)
        .first()
    )
    if item is None:
        item = ReviewItem(
            firm_id=user.firm_id,
            case_id=case.id,
            item_type="unmatched_reconciliation",
            title=title,
            detail=chosen.get("notes") or "",
            status=action,
        )
        db.add(item)
    item.status = action
    item.reviewer = user.name or user.email
    item.reviewed_at = datetime.utcnow()
    db.add(Activity(
        owner=user.email,
        firm_id=user.firm_id,
        case_id=case.id,
        type="exception",
        client=case.client,
        description=f"Voice {action} reconciliation exception {key}.",
    ))
    db.commit()
    return chosen


@router.post("/turn", response_model=VoiceTurnResponse)
async def voice_turn(
    case_id: str = Form(...),
    row_key_value: str = Form(""),
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Transcribe with Prisma, answer from the ledger, and read the answer with Timbre."""
    case = _case_for_user(db, case_id, current_user)
    audio_bytes = await audio.read()
    if len(audio_bytes) > _MAX_AUDIO:
        raise HTTPException(status_code=400, detail="The recording is too long. Keep it under 30 seconds.")
    name = audio.filename or "speech.wav"
    if not name.lower().endswith((".wav", ".mp3", ".ogg", ".flac", ".aac", ".m4a")):
        raise HTTPException(status_code=400, detail="Send a wav recording. The browser converts the microphone clip before upload.")
    try:
        transcript = transcribe(audio_bytes, name)
    except SpeechError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    intent = parse_intent(transcript)
    recon, result = _latest_result(db, case.id)
    rows = list(result.get("rows") or [])
    language = "hi-IN"
    status = None
    key = row_key_value.strip() or None
    count = 0
    due = "0"

    if not transcript:
        answer = "Kuch sunai nahi diya. Dobara boliye."
    elif intent in {"approve", "reject"}:
        if not key:
            answer = "Pehle ek exception chuniye, phir approve ya reject boliye."
        elif recon is None:
            answer = "Is case par koi reconciliation nahi hai."
        else:
            action = "approved" if intent == "approve" else "rejected"
            _apply_decision(db, case, current_user, recon, result, key, action)
            answer = decision_answer(action)
            status = action
    elif intent == "remind":
        chosen, _name = unpaid_rows(rows, transcript, case.client)
        answer = reminder_answer(chosen, "hi-IN")
        count = len(chosen)
        due = str(total_due(chosen))
    elif intent == "query_partial":
        chosen, client_name = partial_rows(rows, transcript, case.client)
        answer = partial_answer(chosen, client_name)
        count = len(chosen)
        due = str(total_due(chosen))
    elif intent == "query_unpaid":
        chosen, client_name = unpaid_rows(rows, transcript, case.client)
        answer = reminder_answer(chosen, "hi-IN")
        if client_name and chosen:
            answer = f"{client_name} ke liye {answer}"
        count = len(chosen)
        due = str(total_due(chosen))
    else:
        answer = "Main partly paid invoices, approve, reject, aur payment reminder samajh sakta hoon."

    return VoiceTurnResponse(
        transcript=transcript,
        intent=intent,
        answer=answer,
        audio_base64=_speak(answer, language),
        language=language,
        row_key=key,
        review_status=status,
        count=count,
        total_due=due,
    )


@router.post("/remind", response_model=RemindResponse)
def voice_remind(
    body: RemindRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Read a client reminder. The count and total are summed from unpaid rows."""
    language = body.language.strip() or "hi-IN"
    if language not in REMINDER_LANGUAGES:
        raise HTTPException(status_code=400, detail="Reminder language must be hi-IN or en-IN.")
    case = _case_for_user(db, body.case_id, current_user)
    _recon, result = _latest_result(db, case.id)
    chosen, _name = unpaid_rows(list(result.get("rows") or []), "", case.client)
    answer = reminder_answer(chosen, language)
    db.add(Activity(
        owner=current_user.email,
        firm_id=current_user.firm_id,
        case_id=case.id,
        type="message",
        client=case.client,
        description="Drafted a spoken client payment reminder.",
    ))
    db.commit()
    return RemindResponse(
        answer=answer,
        audio_base64=_speak(answer, language),
        language=language,
        count=len(chosen),
        total_due=str(total_due(chosen)),
    )
