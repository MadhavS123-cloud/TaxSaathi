"""
schema.py

Common data shapes used across the reconciliation pipeline.

Both invoices (from the Gemini OCR extraction pipeline or manual CSV/Excel
upload) and bank/payment records (usually CSV/Excel bank statement exports)
get normalized into the same `Transaction` shape before matching. This is
what lets the matcher stay source-agnostic.
"""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from enum import Enum
from typing import Optional


class SourceType(str, Enum):
    INVOICE = "invoice"
    PAYMENT = "payment"


@dataclass
class Transaction:
    """A single normalized invoice or payment record."""

    id: str                      # stable unique id, e.g. "inv_0007" or "pay_0132"
    source: SourceType
    txn_date: date
    amount: Decimal               # always positive, in rupees, 2dp
    reference: Optional[str] = None    # invoice no. / UTR / cheque no. / txn ref
    party_name: Optional[str] = None   # vendor/customer/counterparty name
    narration: Optional[str] = None    # free-text bank narration or invoice notes
    raw: dict = field(default_factory=dict)  # original record, kept for audit trail

    def normalized_reference(self) -> Optional[str]:
        """Reference stripped of spaces/punctuation and uppercased, for hash lookups."""
        if not self.reference:
            return None
        return "".join(ch for ch in self.reference if ch.isalnum()).upper() or None


class MatchType(str, Enum):
    EXACT_REFERENCE = "exact_reference"       # Tier 1
    EXACT_AMOUNT_DATE = "exact_amount_date"   # Tier 2
    FUZZY_AMOUNT_DATE = "fuzzy_amount_date"   # Tier 3 (two-pointer, within tolerance)
    UNMATCHED_INVOICE = "unmatched_invoice"   # Tier 4
    UNMATCHED_PAYMENT = "unmatched_payment"   # Tier 4


@dataclass
class MatchResult:
    """One row of the reconciliation output."""

    match_type: MatchType
    invoice: Optional[Transaction] = None
    payment: Optional[Transaction] = None
    confidence: float = 1.0            # 1.0 = certain, lower for fuzzy tier
    amount_diff: Optional[Decimal] = None
    date_diff_days: Optional[int] = None
    notes: str = ""
