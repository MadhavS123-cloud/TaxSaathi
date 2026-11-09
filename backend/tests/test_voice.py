"""Voice intent and spoken totals. No network and no model."""

from decimal import Decimal

from voice.answers import amount_due, partial_answer, partial_rows, reminder_answer, total_due, unpaid_rows
from voice.intent import parse_intent, spoken_client
from voice.numbers import inr_words


def _partial(invoice_id, shortfall, party="Sharma Traders"):
    return {
        "match_type": "partial_payment",
        "needs_review": True,
        "shortfall": shortfall,
        "invoice": {"id": invoice_id, "party_name": party, "amount": "20000", "reference": invoice_id},
        "review_status": None,
    }


def test_hinglish_partial_question_names_the_client():
    text = "Sharma Traders ke kaun se invoice partly paid hain?"
    assert parse_intent(text) == "query_partial"
    assert spoken_client(text) == "Sharma Traders"


def test_approve_and_reject_phrases():
    assert parse_intent("yeh match approve karo") == "approve"
    assert parse_intent("yeh reject karo") == "reject"
    assert parse_intent("approve mat karo") == "reject"


def test_partial_total_is_the_sum_of_shortfalls():
    rows = [_partial("inv-1", "10000"), _partial("inv-2", "8500"), _partial("inv-3", "500", party="Other Co")]
    chosen, name = partial_rows(rows, "Sharma Traders ke kaun se invoice partly paid hain?", "Sharma Traders")
    assert name == "Sharma Traders"
    assert [row["invoice"]["id"] for row in chosen] == ["inv-1", "inv-2", "inv-3"]
    assert total_due(chosen) == Decimal("19000")
    assert inr_words(Decimal("18500")) == "atharah hazar paanch sau rupaye"
    spoken = partial_answer(chosen[:2], None)
    assert spoken == "do invoice partly paid hain, total atharah hazar paanch sau rupaye baaki."
    assert "18500" not in spoken


def test_unpaid_reminder_adds_an_unmatched_invoice_and_skips_an_approved_row():
    rows = [
        _partial("inv-1", "1000"),
        {**_partial("inv-2", "500"), "review_status": "approved"},
        {
            "match_type": "unmatched_invoice",
            "needs_review": True,
            "invoice": {"id": "inv-9", "amount": "2500", "party_name": "Sharma Traders"},
        },
    ]
    chosen, _name = unpaid_rows(rows, "", "Sharma Traders")
    assert total_due(chosen) == Decimal("3500")
    assert amount_due(chosen[1]) == Decimal("2500")
    hindi = reminder_answer(chosen, "hi-IN")
    english = reminder_answer(chosen, "en-IN")
    assert hindi.startswith("Aapke do invoice ka payment baaki hai")
    assert "three thousand five hundred rupees" in english
