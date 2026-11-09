"""
routes/documents.py - Document upload, OCR extraction, and retrieval.

Endpoints:
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
from db.models import Case, Document, User, Activity, ReviewItem
from dependencies.auth import get_current_user

router = APIRouter(tags=["Documents"])

_this_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.dirname(os.path.dirname(_this_dir))
UPLOAD_DIR = os.path.join(_root_dir, "data", "uploads")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {".pdf", ".jpg", ".jpeg", ".png"}


def _sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_hash: Optional[str] = None
    file_size: Optional[int] = None
    status: str
    extracted_json: Optional[dict] = None
    error_detail: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


@router.get("/cases/{case_id}/documents", response_model=List[DocumentResponse])
def list_documents(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all documents for a case (strictly firm-scoped)."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    firm_id = current_user.firm_id
    if firm_id and case.firm_id and case.firm_id != firm_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if not firm_id and case.owner != current_user.email:
        raise HTTPException(status_code=403, detail="Access denied.")

    docs = (
        db.query(Document)
        .filter(Document.case_id == case_id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "file_hash": d.file_hash,
            "file_size": d.file_size,
            "status": d.status,
            "extracted_json": d.extracted_json,
            "error_detail": d.error_detail,
            "created_at": d.created_at.strftime("%Y-%m-%d %H:%M:%S") if d.created_at else "",
        }
        for d in docs
    ]


@router.post("/cases/{case_id}/documents")
async def upload_document(
    case_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a document, detect duplicates, run Gemini OCR."""
    # 1. Validate case ownership
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    firm_id = current_user.firm_id
    if firm_id and case.firm_id and case.firm_id != firm_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if not firm_id and case.owner != current_user.email:
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
    tmp_path = os.path.join(UPLOAD_DIR, f"tmp_{datetime.utcnow().timestamp()}_{file.filename}")
    total = 0
    with open(tmp_path, "wb") as out:
        while chunk := await file.read(65536):
            total += len(chunk)
            if total > MAX_FILE_SIZE:
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
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
        try:
            os.remove(tmp_path)
        except Exception:
            pass
        date_str = existing.created_at.strftime("%Y-%m-%d") if existing.created_at else "earlier"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate file: this document was already uploaded as '{existing.filename}' on {date_str}.",
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

    # 7. Run Gemini OCR (synchronous — returns in same request)
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_key:
        doc.status = "failed"
        doc.error_detail = "Gemini key missing — set GEMINI_API_KEY in .env"
    else:
        try:
            from extract_invoice import extract_real_invoice
            extracted = extract_real_invoice(final_path)

            if not extracted:
                doc.status = "failed"
                doc.error_detail = "No text or invoice data found in document."
            elif isinstance(extracted, dict) and extracted.get("error"):
                doc.status = "failed"
                doc.error_detail = f"Extraction error: {extracted.get('error')}"
            else:
                doc.extracted_json = extracted
                doc.status = "extracted"
        except FileNotFoundError as e:
            doc.status = "failed"
            doc.error_detail = f"File not found: {e}"
        except Exception as e:
            err_str = str(e)
            doc.status = "failed"
            if "API_KEY" in err_str or "API key" in err_str:
                doc.error_detail = "Invalid or expired Gemini API key."
            else:
                doc.error_detail = err_str[:300]

    doc.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(doc)

    # If extraction failed, record a review item automatically
    if doc.status == "failed" and firm_id:
        review_item = ReviewItem(
            firm_id=firm_id,
            case_id=case_id,
            item_type="failed_extraction",
            title=f"Failed OCR: {doc.filename}",
            detail=doc.error_detail or "Document extraction failed.",
            status="pending",
        )
        db.add(review_item)
        db.commit()

    return {
        "id": doc.id,
        "filename": doc.filename,
        "file_hash": doc.file_hash,
        "file_size": doc.file_size,
        "status": doc.status,
        "extracted_json": doc.extracted_json,
        "error_detail": doc.error_detail,
        "created_at": doc.created_at.strftime("%Y-%m-%d %H:%M:%S") if doc.created_at else "",
    }


@router.put("/cases/{case_id}/documents/{doc_id}")
def update_document(
    case_id: str,
    doc_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save reviewed/corrected extracted_json."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    firm_id = current_user.firm_id
    if firm_id and case.firm_id and case.firm_id != firm_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if not firm_id and case.owner != current_user.email:
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
