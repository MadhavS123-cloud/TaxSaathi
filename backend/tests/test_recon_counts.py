from reconciliation.counts import counts_from_summary


def test_partial_and_unmatched_invoice_are_both_counted():
    matched, unmatched, pending = counts_from_summary({
        "exact_reference_matches": 0,
        "exact_amount_date_matches": 0,
        "fuzzy_matches": 0,
        "partial_payment_matches": 1,
        "unmatched_invoices": 1,
        "unmatched_payments": 0,
        "match_rate_pct": 50.0,
    })
    assert (matched, unmatched, pending) == (1, 1, 0)


def test_legacy_keys_still_count_when_the_report_has_no_breakdown():
    assert counts_from_summary({"matched_count": 4, "unmatched_count": 2, "timing_count": 1}) == (4, 2, 1)


def test_empty_summary_is_zero():
    assert counts_from_summary(None) == (0, 0, 0)
