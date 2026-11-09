import os
import shutil
import tempfile
import json
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session

from schemas.reconciliation import ReconciliationReport
from reconciliation.normalize import (
    load_invoice_records_from_json,
    load_invoice_records_from_table,
    load_bank_records,
    _parse_amount,
    _parse_date,
)
from reconciliation.models import Transaction, SourceType
from reconciliation.reconcile import build_report
from dependencies.auth import get_current_user
from db.session import get_db
from db.models import Case, Document, Reconciliation, User

router = APIRouter(tags=["Reconciliation"])


def _extract_transactions_from_documents(docs: List[Document]) -> List[Transaction]:
    """Convert case extracted_json documents into reconciliation Transaction objects."""
    transactions: List[Transaction] = []
    for d in docs:
        if not d.extracted_json or not isinstance(d.extracted_json, dict):
            continue
        data = d.extracted_json
        doc_summary = data.get("document_summary", {})
        tax_summary = data.get("tax_summary", {})
        supplier = data.get("supplier_merchant") or data.get("issuer_entity") or {}

        # Look up amount and date across potential schemas
        raw_amt = (
            tax_summary.get("grand_total")
            or doc_summary.get("total_amount")
            or data.get("total_amount")
            or data.get("amount")
        )
        raw_date = (
            doc_summary.get("invoice_date")
            or data.get("invoice_date")
            or data.get("date")
        )
        ref = (
            doc_summary.get("invoice_number")
            or data.get("invoice_number")
            or data.get("invoice_no")
            or d.filename
        )
        party = (
            supplier.get("legal_name")
            or supplier.get("trade_name")
            or data.get("vendor_name")
        )

        amount = _parse_amount(raw_amt)
        txn_date = _parse_date(raw_date)
        if amount is not None and txn_date is not None:
            transactions.append(
                Transaction(
                    id=f"doc_{d.id[:8]}",
                    source=SourceType.INVOICE,
                    txn_date=txn_date,
                    amount=amount,
                    reference=str(ref) if ref else None,
                    party_name=str(party) if party else None,
                    narration=d.filename,
                    raw=data,
                )
            )
    return transactions


@router.post("/reconciliation/run", response_model=ReconciliationReport)
async def run_reconciliation(
    invoice_file: UploadFile = File(...),
    payment_file: UploadFile = File(...),
    date_tolerance_days: int = Form(3),
    amount_tolerance: float = Form(1.00),
    current_user: User = Depends(get_current_user),
):
    """Run standalone reconciliation between two uploaded files."""
    if not invoice_file.filename or not payment_file.filename:
        raise HTTPException(status_code=400, detail="Missing files")

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
        invoice_warnings: List[str] = []
        try:
            if inv_ext == ".json":
                invoices = load_invoice_records_from_json(inv_path)
            elif inv_ext in [".csv", ".xlsx", ".xls"]:
                invoices, invoice_warnings = load_invoice_records_from_table(inv_path)
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
        if invoice_warnings:
            report_dict["warnings"] = invoice_warnings
        return report_dict

    finally:
        for p in [inv_path, pay_path]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass


@router.post("/cases/{case_id}/reconcile", response_model=ReconciliationReport)
async def reconcile_case(
    case_id: str,
    payment_file: UploadFile = File(...),
    invoice_file: Optional[UploadFile] = File(None),
    date_tolerance_days: int = Form(3),
    amount_tolerance: float = Form(1.00),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Run reconciliation for a case.
    Uses either uploaded invoices (.csv/.xlsx/.json) or documents already extracted for this case.
    Stores the output in the reconciliations table and returns it.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    firm_id = current_user.firm_id
    if firm_id and case.firm_id and case.firm_id != firm_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if not firm_id and case.owner != current_user.email:
        raise HTTPException(status_code=403, detail="Access denied.")

    # 1. Parse payment statement
    pay_ext = os.path.splitext(payment_file.filename)[1].lower() if payment_file.filename else ""
    if pay_ext not in [".csv", ".xlsx", ".xls"]:
        raise HTTPException(status_code=422, detail="Bank payment file must be CSV or Excel (.csv, .xlsx)")

    with tempfile.NamedTemporaryFile(delete=False, suffix=pay_ext) as tmp_pay:
        shutil.copyfileobj(payment_file.file, tmp_pay)
        pay_path = tmp_pay.name

    inv_path = None
    invoice_warnings: List[str] = []
    try:
        try:
            payments = load_bank_records(pay_path)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to parse payment file: {str(e)}")

        # 2. Get invoices: from uploaded file if provided, else from case documents
        invoices: List[Transaction] = []
        if invoice_file and invoice_file.filename:
            inv_ext = os.path.splitext(invoice_file.filename)[1].lower()
            with tempfile.NamedTemporaryFile(delete=False, suffix=inv_ext) as tmp_inv:
                shutil.copyfileobj(invoice_file.file, tmp_inv)
                inv_path = tmp_inv.name

            try:
                if inv_ext == ".json":
                    invoices = load_invoice_records_from_json(inv_path)
                elif inv_ext in [".csv", ".xlsx", ".xls"]:
                    invoices, invoice_warnings = load_invoice_records_from_table(inv_path)
                else:
                    raise ValueError("Invoice file must be JSON, CSV, or Excel")
            except Exception as e:
                raise HTTPException(status_code=422, detail=f"Failed to parse invoice file: {str(e)}")
        else:
            # Load from case documents in database
            case_docs = (
                db.query(Document)
                .filter(Document.case_id == case_id, Document.status == "extracted")
                .all()
            )
            invoices = _extract_transactions_from_documents(case_docs)

        if not invoices:
            raise HTTPException(
                status_code=400,
                detail="No invoices found. Please upload an invoice file or extract invoices in this case first."
            )

        # 3. Run reconciliation
        report_dict = build_report(
            invoices,
            payments,
            date_tolerance_days=date_tolerance_days,
            amount_tolerance=Decimal(str(amount_tolerance)),
        )
        if invoice_warnings:
            report_dict["warnings"] = invoice_warnings

        # 4. Save result to DB
        recon = Reconciliation(
            case_id=case_id,
            result_json=report_dict,
        )
        db.add(recon)
        db.commit()
        db.refresh(recon)

        return report_dict

    finally:
        for p in [pay_path, inv_path]:
            if p and os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass


@router.get("/cases/{case_id}/reconcile", response_model=ReconciliationReport)
def get_case_reconciliation(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve the latest saved reconciliation result for a case."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    firm_id = current_user.firm_id
    if firm_id and case.firm_id and case.firm_id != firm_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if not firm_id and case.owner != current_user.email:
        raise HTTPException(status_code=403, detail="Access denied.")

    latest = (
        db.query(Reconciliation)
        .filter(Reconciliation.case_id == case_id)
        .order_by(Reconciliation.created_at.desc())
        .first()
    )
    if not latest or not latest.result_json:
        return {"summary": None, "rows": []}

    return latest.result_json
