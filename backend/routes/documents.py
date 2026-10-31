"""
routes/documents.py - Document upload, OCR extraction, and retrieval.

POST /cases/{case_id}/documents  - Upload PDF/JPG/PNG, run Gemini OCR
GET  /cases/{case_id}/documents  - List documents for a case
PUT  /cases/{case_id}/documents/{doc_id} - Update extracted_json (review edits)
"""
import os
import hashlib
import shutil
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db.session import get_db
from db.models import Case, Document, User
from dependencies.auth import require_jwt_user

router = APIRouter(tags=["Documents"])

UPLOAD_DIR = "data/uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {".pdf", ".jpg", ".jpeg", ".png"}


def _get_user_firm_id(db: Session, caller: str) -> Optional[str]:
    user = db.query(User).filter(User.email == caller).first()
    return user.firm_id if user else None


def _sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_hash: Optional[str]
    file_size: Optional[int]
    status: str
    extracted_json: Optional[dict] = None
    error_detail: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


@router.get("/cases/{case_id}/documents", response_model=List[DocumentResponse])
def list_documents(
    case_id: str,
    db: Session = Depends(get_db),
    caller: str = Depends(require_jwt_user),
):
    """List all documents for a case (firm-scoped)."""
    firm_id = _get_user_firm_id(db, caller)
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    if firm_id and case.firm_id and case.firm_id != firm_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    docs = db.query(Document).filter(Document.case_id == case_id).order_by(Document.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "file_hash": d.file_hash,
            "file_size": d.file_size,
            "status": d.status,
            "extracted_json": d.extracted_json,
            "error_detail": d.error_detail,
            "created_at": d.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        }
        for d in docs
    ]


@router.post("/cases/{case_id}/documents")
async def upload_document(
    case_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    caller: str = Depends(require_jwt_user),
):
    """Upload a document, detect duplicates, run Gemini OCR."""
    # 1. Validate case ownership
    firm_id = _get_user_firm_id(db, caller)
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    if firm_id and case.firm_id and case.firm_id != firm_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    # 2. Validate file extension
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed: PDF, JPG, PNG.",
        )

    # 3. Save to temp location first, check size
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    tmp_path = os.path.join(UPLOAD_DIR, f"tmp_{file.filename}")
    total = 0
    with open(tmp_path, "wb") as out:
        while chunk := await file.read(65536):
            total += len(chunk)
            if total > MAX_FILE_SIZE:
                os.remove(tmp_path)
                raise HTTPException(status_code=413, detail="File exceeds 10 MB limit.")
            out.write(chunk)

    # 4. Compute hash and check for duplicates in this case
    file_hash = _sha256(tmp_path)
    existing = (
        db.query(Document)
        .filter(Document.case_id == case_id, Document.file_hash == file_hash)
        .first()
    )
    if existing:
        os.remove(tmp_path)
        raise HTTPException(
            status_code=409,
            detail=f"Duplicate file: this document was already uploaded as '{existing.filename}' on {existing.created_at.strftime('%Y-%m-%d')}.",
        )

    # 5. Move to permanent location
    final_path = os.path.join(UPLOAD_DIR, f"{case_id}_{file_hash[:8]}_{file.filename}")
    shutil.move(tmp_path, final_path)

    # 6. Create DB record
    doc = Document(
        case_id=case_id,
        filename=file.filename,
        file_hash=file_hash,
        file_size=total,
        file_path=final_path,
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # 7. Run Gemini OCR (synchronous — runs in same request)
    try:
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        if not gemini_key:
            raise ValueError("Gemini API key missing — set GEMINI_API_KEY in .env")

        # Import lazily to avoid startup crash if key missing
        from extract_invoice import extract_real_invoice
        extracted = extract_real_invoice(final_path)

        if not extracted or "error" in extracted and extracted.get("error") == "JSONDecodeError":
            doc.status = "failed"
            doc.error_detail = "Gemini returned non-JSON output. The document may be too blurry or unsupported."
        else:
            doc.extracted_json = extracted
            doc.status = "extracted"

    except ValueError as e:
        doc.status = "failed"
        doc.error_detail = str(e)
    except FileNotFoundError as e:
        doc.status = "failed"
        doc.error_detail = f"File error: {e}"
    except Exception as e:
        doc.status = "failed"
        doc.error_detail = str(e)[:500]

    doc.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(doc)

    return {
        "id": doc.id,
        "filename": doc.filename,
        "file_hash": doc.file_hash,
        "file_size": doc.file_size,
        "status": doc.status,
        "extracted_json": doc.extracted_json,
        "error_detail": doc.error_detail,
        "created_at": doc.created_at.strftime("%Y-%m-%d %H:%M:%S"),
    }


@router.put("/cases/{case_id}/documents/{doc_id}")
def update_document(
    case_id: str,
    doc_id: str,
    body: dict,
    db: Session = Depends(get_db),
    caller: str = Depends(require_jwt_user),
):
    """Save reviewed/corrected extracted_json."""
    firm_id = _get_user_firm_id(db, caller)
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    if firm_id and case.firm_id and case.firm_id != firm_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    doc = db.query(Document).filter(Document.id == doc_id, Document.case_id == case_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if "extracted_json" in body:
        doc.extracted_json = body["extracted_json"]
        doc.status = "extracted"
        doc.updated_at = datetime.utcnow()
        db.commit()

    return {"status": "ok", "id": doc.id}
