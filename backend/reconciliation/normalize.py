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

def load_invoice_records_from_json(path: str, id_prefix: str = "inv") -> list[Transaction]:
    """
    Load invoices from your Gemini extraction pipeline's JSON output.

    Expects a list of objects. Adjust the key names below (invoice_number,
    total_amount, invoice_date, vendor_name) to match your actual extraction
    schema -- these are the field names your extraction prompt should be
    producing; rename here if yours differ.
    """
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    records: list[Transaction] = []
    for i, item in enumerate(data):
        amount = _parse_amount(item.get("total_amount") or item.get("amount"))
        txn_date = _parse_date(item.get("invoice_date") or item.get("date"))
        if amount is None or txn_date is None:
            continue
        records.append(
            Transaction(
                id=f"{id_prefix}_{i:04d}",
                source=SourceType.INVOICE,
                txn_date=txn_date,
                amount=amount,
                reference=item.get("invoice_number") or item.get("invoice_no"),
                party_name=item.get("vendor_name") or item.get("party_name"),
                narration=item.get("notes"),
                raw=item,
            )
        )
    return records


def load_invoice_records_from_table(path: str, id_prefix: str = "inv") -> list[Transaction]:
    """Fallback: load invoices from a CSV/Excel export, same shape as bank records."""
    recs = load_bank_records(path, id_prefix=id_prefix)
    for r in recs:
        r.source = SourceType.INVOICE
    return recs
