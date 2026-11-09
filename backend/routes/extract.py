import os
import shutil
import tempfile

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import ValidationError

from extract_invoice import extract_real_invoice
from dependencies.auth import require_jwt_user
from schemas.extraction import ExtractedInvoice

router = APIRouter(prefix="/api", tags=["Extract"])


@router.post("/extract", response_model=ExtractedInvoice, dependencies=[Depends(require_jwt_user)])
async def extract_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    ext = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        try:
            data = extract_real_invoice(tmp_path)
        except FileNotFoundError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        except (ValueError, RuntimeError) as e:
            raise HTTPException(status_code=503, detail=str(e)) from e
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Extraction failed: {e}") from e

        if not isinstance(data, dict):
            raise HTTPException(status_code=422, detail="Extraction did not return a JSON object.")
        if data.get("error"):
            raise HTTPException(
                status_code=422,
                detail=f"Model output was not valid invoice JSON ({data.get('error')}).",
            )
        try:
            return ExtractedInvoice.model_validate(data)
        except ValidationError as e:
            first = e.errors()[0] if e.errors() else {}
            loc = ".".join(str(part) for part in first.get("loc", ()))
            msg = first.get("msg", "schema mismatch")
            where = f"{loc}: {msg}" if loc else msg
            raise HTTPException(
                status_code=422,
                detail=f"Extraction did not match the invoice schema ({where}).",
            ) from e
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass
