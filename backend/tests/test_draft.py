"""Client draft text. No database and no network."""

from communication.draft import REVIEW_BANNER, compose_client_draft


def test_draft_includes_reconciliation_counts_and_review_banner():
    report = {
        "summary": {
            "total_invoices": 2,
            "total_payments": 3,
            "exact_reference_matches": 1,
            "exact_amount_date_matches": 0,
            "fuzzy_matches": 0,
            "partial_payment_matches": 1,
            "unmatched_invoices": 0,
            "unmatched_payments": 1,
            "match_rate_pct": 50.0,
        },
        "rows": [
            {
                "match_type": "partial_payment",
                "invoice": {"reference": "INV-1"},
                "shortfall": "10",
            }
        ],
    }
    draft = compose_client_draft("Sharma Stores", report, None)
    assert draft["review_banner"] == REVIEW_BANNER
    assert draft["body"].startswith(REVIEW_BANNER)
    assert draft["body"].endswith(REVIEW_BANNER)
    assert "Invoices reviewed: 2." in draft["body"]
    assert "partial payments" in draft["body"]
    assert "shortfall 10" in draft["body"]
    assert "Sharma Stores" in draft["subject"]


def test_draft_includes_advisory_text():
    draft = compose_client_draft("Asha", None, "Section 16 of the CGST Act sets the conditions.")
    assert "Section 16 of the CGST Act" in draft["body"]
    assert REVIEW_BANNER in draft["body"]


def test_draft_is_empty_without_stored_results():
    assert compose_client_draft("Asha", None, "  ") is None
    assert compose_client_draft("Asha", {}, None) is None
