"""Spoken answers. Every figure comes from the reconciliation rows."""

from decimal import Decimal

from voice.intent import spoken_client
from voice.numbers import count_words, english_count, english_inr, inr_words, parse_money

REMINDER_LANGUAGES = ("hi-IN", "en-IN")


def row_key(row: dict) -> str:
    invoice = row.get("invoice") or {}
    payment = row.get("payment") or {}
    return str(invoice.get("id") or payment.get("id") or "")


def is_exception(row: dict) -> bool:
    if row.get("review_status") == "approved":
        return False
    return row.get("needs_review") or row.get("match_type") in {
        "partial_payment",
        "unmatched_invoice",
        "unmatched_payment",
    }


def _same_name(left: str, right: str) -> bool:
    a = " ".join(left.lower().split())
    b = " ".join(right.lower().split())
    return bool(a) and (a in b or b in a)


def _row_has_name(row: dict, name: str) -> bool:
    invoice = row.get("invoice") or {}
    payment = row.get("payment") or {}
    blob = " ".join(
        str(part)
        for part in (
            invoice.get("party_name"),
            invoice.get("reference"),
            payment.get("party_name"),
            payment.get("reference"),
        )
        if part
    )
    return _same_name(name, blob)


def _named_rows(rows: list[dict], name: str | None, case_client: str | None) -> list[dict]:
    if not name:
        return rows
    if case_client and _same_name(name, case_client):
        return rows
    return [row for row in rows if _row_has_name(row, name)]


def partial_rows(rows: list[dict], transcript: str, case_client: str | None) -> tuple[list[dict], str | None]:
    name = spoken_client(transcript)
    chosen = [
        row for row in rows
        if row.get("match_type") == "partial_payment" and row.get("review_status") != "approved"
    ]
    return _named_rows(chosen, name, case_client), name


def unpaid_rows(rows: list[dict], transcript: str, case_client: str | None) -> tuple[list[dict], str | None]:
    """Partly paid shortfalls and invoices with no payment. Approved rows stay out."""
    name = spoken_client(transcript)
    chosen = []
    for row in rows:
        if row.get("review_status") == "approved":
            continue
        if row.get("match_type") == "partial_payment":
            chosen.append(row)
        elif row.get("match_type") == "unmatched_invoice":
            chosen.append(row)
    return _named_rows(chosen, name, case_client), name


def amount_due(row: dict) -> Decimal:
    """Shortfall for a partial match, otherwise the unpaid invoice amount."""
    if row.get("match_type") == "partial_payment":
        return parse_money(row.get("shortfall"))
    invoice = row.get("invoice") or {}
    return parse_money(invoice.get("amount"))


def total_due(rows: list[dict]) -> Decimal:
    return sum((amount_due(row) for row in rows), Decimal("0"))


def partial_answer(rows: list[dict], client_name: str | None) -> str:
    count = len(rows)
    who = f"{client_name} ke " if client_name else ""
    if count == 0:
        return f"{who}koi invoice partly paid nahi hai."
    amount = inr_words(total_due(rows))
    if count == 1:
        return f"{who}ek invoice partly paid hai, total {amount} baaki."
    return f"{who}{count_words(count)} invoice partly paid hain, total {amount} baaki."


def reminder_answer(rows: list[dict], language: str) -> str:
    count = len(rows)
    if language == "en-IN":
        if count == 0:
            return "There is no unpaid invoice on this case."
        verb = "is" if count == 1 else "are"
        noun = "invoice" if count == 1 else "invoices"
        return (
            f"There {verb} {english_count(count)} unpaid {noun}. "
            f"The total still due is {english_inr(total_due(rows))}."
        )
    if count == 0:
        return "Aapke koi invoice ka payment baaki nahi hai."
    noun = "invoice" if count == 1 else "invoice"
    return f"Aapke {count_words(count)} {noun} ka payment baaki hai, kul {inr_words(total_due(rows))}."


def decision_answer(action: str) -> str:
    if action == "approved":
        return "Yeh match approve ho gaya."
    return "Yeh match reject ho gaya."
