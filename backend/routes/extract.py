import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from extract_invoice import extract_real_invoice

router = APIRouter(prefix="/api", tags=["Extract"])

@router.post("/extract")
async def extract_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
        
    ext = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        data = extract_real_invoice(tmp_path)
        return {"success": True, "data": data}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass
