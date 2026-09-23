import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from decimal import Decimal

from schemas.reconciliation import ReconciliationReport
from reconciliation.normalize import (
    load_invoice_records_from_json,
    load_invoice_records_from_table,
    load_bank_records
)
from reconciliation.reconcile import build_report

router = APIRouter(prefix="/reconciliation", tags=["Reconciliation"])

@router.post("/run", response_model=ReconciliationReport)
async def run_reconciliation(
    invoice_file: UploadFile = File(...),
    payment_file: UploadFile = File(...),
    date_tolerance_days: int = Form(3),
    amount_tolerance: float = Form(1.00)
):
    if not invoice_file.filename or not payment_file.filename:
        raise HTTPException(status_code=400, detail="Missing files")

    # save files
    inv_ext = os.path.splitext(invoice_file.filename)[1].lower()
    pay_ext = os.path.splitext(payment_file.filename)[1].lower()

    if pay_ext not in [".csv", ".xlsx", ".xls"]:
        raise HTTPException(status_code=422, detail="Payment file must be CSV or Excel (.csv, .xlsx, .xls)")

    with tempfile.NamedTemporaryFile(delete=False, suffix=inv_ext) as tmp_inv, \
         tempfile.NamedTemporaryFile(delete=False, suffix=pay_ext) as tmp_pay:
         
        shutil.copyfileobj(invoice_file.file, tmp_inv)
        shutil.copyfileobj(payment_file.file, tmp_pay)
        
        inv_path = tmp_inv.name
        pay_path = tmp_pay.name

    try:
        try:
            if inv_ext == ".json":
                invoices = load_invoice_records_from_json(inv_path)
            elif inv_ext in [".csv", ".xlsx", ".xls"]:
                invoices = load_invoice_records_from_table(inv_path)
            else:
                raise ValueError("Invoice file must be JSON, CSV, or Excel (.json, .csv, .xlsx, .xls)")
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to parse invoice file: {str(e)}")

        try:
            payments = load_bank_records(pay_path)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to parse payment file: {str(e)}")

        report_dict = build_report(
            invoices, 
            payments, 
            date_tolerance_days=date_tolerance_days, 
            amount_tolerance=Decimal(str(amount_tolerance))
        )
        return report_dict

    finally:
        for p in [inv_path, pay_path]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
