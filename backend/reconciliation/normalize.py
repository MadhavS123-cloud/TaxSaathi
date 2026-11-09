"""
normalize.py

Converts raw inputs -- CSV/Excel bank statements and Gemini-OCR invoice JSON --
into a list of `Transaction` objects the matcher can work with.

Column/field names below are guesses based on common bank-export and
invoice-extraction shapes. Adjust the COLUMN_MAP / JSON key lookups to match
your actual Gemini OCR output schema and bank export headers -- that's the
one place you should need to edit when you plug in real data.
"""

from __future__ import annotations

import json
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from typing import Optional

import pandas as pd

from .models import Transaction, SourceType


# ---------------------------------------------------------------------------
# Bank/payment records: CSV or Excel export
# ---------------------------------------------------------------------------

# Map your bank export's actual column headers to these logical fields.
# Add alternate header spellings here as you encounter real exports.
BANK_COLUMN_ALIASES = {
    "date": ["date", "txn date", "transaction date", "value date"],
    "amount": ["amount", "credit", "amount (inr)", "credit amount"],
    "reference": ["reference", "ref no", "utr", "cheque no", "chq/ref no"],
    "narration": ["narration", "description", "particulars", "remarks"],
    "party_name": ["party", "payer", "payee", "beneficiary"],
}

# Invoice CSV/Excel headers. Do not reuse BANK_COLUMN_ALIASES: an invoice
# number is not a bank reference, and "vendor" is not a bank party column.
INVOICE_COLUMN_ALIASES = {
    "reference": [
        "invoice_number",
        "invoice no",
        "invoice no.",
        "inv no",
        "inv_no",
        "invoice #",
        "bill no",
        "bill number",
        "document number",
    ],
    "amount": [
        "amount",
        "total",
        "total amount",
        "grand total",
        "invoice amount",
        "amount (inr)",
    ],
    "date": ["date", "invoice date", "bill date"],
    "party_name": ["vendor", "supplier", "party", "vendor name", "supplier name"],
    "narration": ["description", "particulars", "remarks"],
}

NO_INVOICE_REFERENCE_COLUMN = (
    "no invoice number column found; exact-reference matching skipped"
)


def _find_column(df: pd.DataFrame, aliases: list[str]) -> Optional[str]:
    lower_cols = {c.lower().strip(): c for c in df.columns}
    for alias in aliases:
        if alias in lower_cols:
            return lower_cols[alias]
    return None


def _parse_amount(value) -> Optional[Decimal]:
    if pd.isna(value):
        return None
    try:
        cleaned = str(value).replace(",", "").replace("₹", "").strip()
        amt = Decimal(cleaned)
        return abs(amt)
    except (InvalidOperation, ValueError):
        return None


def _parse_date(value) -> Optional[date]:
    if pd.isna(value):
        return None
    if isinstance(value, (datetime, date)):
        return value if isinstance(value, date) and not isinstance(value, datetime) else value.date()
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d %b %Y", "%d-%b-%Y"):
        try:
            return datetime.strptime(str(value).strip(), fmt).date()
        except ValueError:
            continue
    # last resort: let pandas guess
    try:
        return pd.to_datetime(value).date()
    except Exception:
        return None


def load_bank_records(path: str, id_prefix: str = "pay") -> list[Transaction]:
    """Load a bank/payment CSV or Excel export into normalized Transactions."""
    if path.lower().endswith((".xlsx", ".xls")):
        df = pd.read_excel(path)
    else:
        df = pd.read_csv(path)

    col_date = _find_column(df, BANK_COLUMN_ALIASES["date"])
    col_amount = _find_column(df, BANK_COLUMN_ALIASES["amount"])
    col_reference = _find_column(df, BANK_COLUMN_ALIASES["reference"])
    col_narration = _find_column(df, BANK_COLUMN_ALIASES["narration"])
    col_party = _find_column(df, BANK_COLUMN_ALIASES["party_name"])

    if not col_date or not col_amount:
        raise ValueError(
            f"Could not find date/amount columns in {path}. "
            f"Found columns: {list(df.columns)}. "
            f"Update BANK_COLUMN_ALIASES in normalize.py."
        )

    records: list[Transaction] = []
    for i, row in df.iterrows():
        txn_date = _parse_date(row[col_date])
        amount = _parse_amount(row[col_amount])
        if txn_date is None or amount is None:
            continue  # skip malformed rows rather than crash the whole batch
        records.append(
            Transaction(
                id=f"{id_prefix}_{i:04d}",
                source=SourceType.PAYMENT,
                txn_date=txn_date,
                amount=amount,
                reference=str(row[col_reference]) if col_reference and pd.notna(row[col_reference]) else None,
                party_name=str(row[col_party]) if col_party and pd.notna(row[col_party]) else None,
                narration=str(row[col_narration]) if col_narration and pd.notna(row[col_narration]) else None,
                raw=row.to_dict(),
            )
        )
    return records


# ---------------------------------------------------------------------------
# Invoices: Gemini OCR pipeline JSON (or CSV/Excel fallback)
# ---------------------------------------------------------------------------

def _first_present(*values):
    """First value that is not None and not a blank string."""
    for value in values:
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        return value
    return None


def _as_invoice_items(data) -> list:
    """Accept a list, one invoice object, or the {\"data\": ...} extract envelope."""
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        inner = data.get("data")
        if isinstance(inner, list):
            return inner
        if isinstance(inner, dict):
            return [inner]
        if any(
            key in data
            for key in ("document_summary", "tax_summary", "invoice_number", "total_amount", "amount")
        ):
            return [data]
    raise ValueError(
        "Invoice JSON must be a list of invoices or one extracted invoice object."
    )


def _invoice_fields(item: dict) -> tuple:
    """Read amount, date, reference, and party from a flat row or a Gemini object."""
    doc = item.get("document_summary") if isinstance(item.get("document_summary"), dict) else {}
    tax = item.get("tax_summary") if isinstance(item.get("tax_summary"), dict) else {}
    supplier = item.get("supplier_merchant") if isinstance(item.get("supplier_merchant"), dict) else {}
    issuer = item.get("issuer_entity") if isinstance(item.get("issuer_entity"), dict) else {}
    amount = _parse_amount(
        _first_present(
            tax.get("grand_total"),
            doc.get("total_amount"),
            item.get("total_amount"),
            item.get("amount"),
        )
    )
    txn_date = _parse_date(
        _first_present(doc.get("invoice_date"), item.get("invoice_date"), item.get("date"))
    )
    reference = _first_present(
        doc.get("invoice_number"), item.get("invoice_number"), item.get("invoice_no")
    )
    party = _first_present(
        supplier.get("legal_name"),
        supplier.get("trade_name"),
        issuer.get("legal_name"),
        issuer.get("trade_name"),
        item.get("vendor_name"),
        item.get("party_name"),
    )
    return amount, txn_date, reference, party


def load_invoice_records_from_json(path: str, id_prefix: str = "inv") -> list[Transaction]:
    """
    Load invoices from a JSON file.

    Accepts:
      - a list of flat rows (invoice_number, total_amount, invoice_date, vendor_name)
      - one Gemini extraction object (document_summary / tax_summary / supplier_merchant)
      - a list of those objects
      - the extract API envelope {"data": <object or list>}
    """
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = _as_invoice_items(data)
    records: list[Transaction] = []
    for i, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        amount, txn_date, reference, party = _invoice_fields(item)
        if amount is None or txn_date is None:
            continue
        records.append(
            Transaction(
                id=f"{id_prefix}_{i:04d}",
                source=SourceType.INVOICE,
                txn_date=txn_date,
                amount=amount,
                reference=str(reference) if reference is not None else None,
                party_name=str(party) if party is not None else None,
                narration=item.get("notes"),
                raw=item,
            )
        )
    return records


def load_invoice_records_from_table(path: str, id_prefix: str = "inv") -> tuple[list[Transaction], list[str]]:
    """Load an invoice CSV or Excel file using INVOICE_COLUMN_ALIASES.

    Returns the records and any warnings. A missing invoice-number column does
    not drop the rows; the warning tells the caller that exact-reference
    matching cannot run.
    """
    if path.lower().endswith((".xlsx", ".xls")):
        df = pd.read_excel(path)
    else:
        df = pd.read_csv(path)

    col_date = _find_column(df, INVOICE_COLUMN_ALIASES["date"])
    col_amount = _find_column(df, INVOICE_COLUMN_ALIASES["amount"])
    col_reference = _find_column(df, INVOICE_COLUMN_ALIASES["reference"])
    col_narration = _find_column(df, INVOICE_COLUMN_ALIASES["narration"])
    col_party = _find_column(df, INVOICE_COLUMN_ALIASES["party_name"])

    if not col_date or not col_amount:
        raise ValueError(
            f"Could not find date/amount columns in {path}. "
            f"Found columns: {list(df.columns)}. "
            f"Update INVOICE_COLUMN_ALIASES in normalize.py."
        )

    warnings: list[str] = []
    if not col_reference:
        warnings.append(NO_INVOICE_REFERENCE_COLUMN)

    records: list[Transaction] = []
    for i, row in df.iterrows():
        txn_date = _parse_date(row[col_date])
        amount = _parse_amount(row[col_amount])
        if txn_date is None or amount is None:
            continue
        reference = None
        if col_reference and pd.notna(row[col_reference]):
            reference = str(row[col_reference])
        records.append(
            Transaction(
                id=f"{id_prefix}_{i:04d}",
                source=SourceType.INVOICE,
                txn_date=txn_date,
                amount=amount,
                reference=reference,
                party_name=str(row[col_party]) if col_party and pd.notna(row[col_party]) else None,
                narration=str(row[col_narration]) if col_narration and pd.notna(row[col_narration]) else None,
                raw=row.to_dict(),
            )
        )
    return records, warnings
