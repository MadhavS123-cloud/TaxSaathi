"""Turn a reconciliation summary into the counts the desk displays."""

from __future__ import annotations


def counts_from_summary(summary: dict | None) -> tuple[int, int, int]:
    """Return matched, unmatched, and timing counts.

    The report stores exact, fuzzy, and partial matches separately, plus
    unmatched invoices and payments. Older rows may only have matched_count.
    """
    data = summary or {}
    specific = (
        "exact_reference_matches",
        "exact_amount_date_matches",
        "fuzzy_matches",
        "partial_payment_matches",
        "unmatched_invoices",
        "unmatched_payments",
    )
    if any(key in data for key in specific):
        matched = sum(
            int(data.get(key) or 0)
            for key in (
                "exact_reference_matches",
                "exact_amount_date_matches",
                "fuzzy_matches",
                "partial_payment_matches",
            )
        )
        unmatched = int(data.get("unmatched_invoices") or 0) + int(data.get("unmatched_payments") or 0)
    else:
        matched = int(data.get("matched_count") or 0)
        unmatched = int(data.get("unmatched_count") or 0)
    pending = int(data.get("timing_count") or 0)
    return matched, unmatched, pending
