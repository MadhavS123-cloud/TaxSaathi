"""
reconcile.py

Top-level orchestrator. This is the function your FastAPI endpoint will
call: give it invoice records and payment records, get back a JSON-ready
report. Keeping this separate from matcher.py so the matching algorithm
stays independently testable/importable.
"""

from __future__ import annotations

from decimal import Decimal

from .models import Transaction, MatchResult, MatchType
from .matcher import Reconciler


def build_report(
    invoices: list[Transaction],
    payments: list[Transaction],
    date_tolerance_days: int = 3,
    amount_tolerance: Decimal = Decimal("1.00"),
) -> dict:
    """Run reconciliation and shape the output for an API response / frontend table."""
    reconciler = Reconciler(
        date_tolerance_days=date_tolerance_days, amount_tolerance=amount_tolerance
    )
    results = reconciler.reconcile(invoices, payments)

    summary = {
        "total_invoices": len(invoices),
        "total_payments": len(payments),
        "exact_reference_matches": sum(1 for r in results if r.match_type == MatchType.EXACT_REFERENCE),
        "exact_amount_date_matches": sum(1 for r in results if r.match_type == MatchType.EXACT_AMOUNT_DATE),
        "fuzzy_matches": sum(1 for r in results if r.match_type == MatchType.FUZZY_AMOUNT_DATE),
        "partial_payment_matches": sum(1 for r in results if r.match_type == MatchType.PARTIAL_PAYMENT),
        "unmatched_invoices": sum(1 for r in results if r.match_type == MatchType.UNMATCHED_INVOICE),
        "unmatched_payments": sum(1 for r in results if r.match_type == MatchType.UNMATCHED_PAYMENT),
    }
    matched_count = (
        summary["exact_reference_matches"]
        + summary["exact_amount_date_matches"]
        + summary["fuzzy_matches"]
        + summary["partial_payment_matches"]
    )
    total = max(len(invoices), 1)
    summary["match_rate_pct"] = round(100 * matched_count / total, 1)

    rows = [_result_to_row(r) for r in results]

    return {"summary": summary, "rows": rows}


def _result_to_row(r: MatchResult) -> dict:
    return {
        "match_type": r.match_type.value,
        "confidence": r.confidence,
        "invoice": _txn_to_dict(r.invoice),
        "payment": _txn_to_dict(r.payment),
        "amount_diff": str(r.amount_diff) if r.amount_diff is not None else None,
        "date_diff_days": r.date_diff_days,
        "notes": r.notes,
        "payment_ids": list(r.payment_ids),
        "payments": [_txn_to_dict(p) for p in r.payments],
        "total_paid": str(r.total_paid) if r.total_paid is not None else None,
        "shortfall": str(r.shortfall) if r.shortfall is not None else None,
        # Anything below a confident exact match should get a human look before
        # being marked reconciled. Partial payments are always reviewed.
        "needs_review": True if r.match_type == MatchType.PARTIAL_PAYMENT else r.confidence < 0.9,
    }


def _txn_to_dict(t) -> dict | None:
    if t is None:
        return None
    return {
        "id": t.id,
        "date": t.txn_date.isoformat(),
        "amount": str(t.amount),
        "reference": t.reference,
        "party_name": t.party_name,
    }
