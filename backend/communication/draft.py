"""Plain-language client notes from stored reconciliation and advisory results."""

REVIEW_BANNER = "Draft - requires CA review"


def compose_client_draft(client_name: str, reconciliation: dict | None, advisory_answer: str | None) -> dict | None:
    """Build a client email. Returns None when there is nothing stored to describe."""
    summary = {}
    rows = []
    if isinstance(reconciliation, dict):
        summary = reconciliation.get("summary") or {}
        rows = reconciliation.get("rows") or []
    advice = (advisory_answer or "").strip()
    if not summary and not advice:
        return None

    client = (client_name or "").strip() or "Client"
    lines = [
        REVIEW_BANNER,
        "",
        f"Dear {client},",
        "",
        "This note summarises the working papers prepared for you. "
        "Your Chartered Accountant still has to check it before it is sent.",
        "",
    ]
    if summary:
        lines.extend([
            "Reconciliation",
            f"Invoices reviewed: {summary.get('total_invoices', 0)}.",
            f"Payments reviewed: {summary.get('total_payments', 0)}.",
            (
                "Matched: "
                f"{summary.get('exact_reference_matches', 0)} by reference, "
                f"{summary.get('exact_amount_date_matches', 0)} by amount and date, "
                f"{summary.get('fuzzy_matches', 0)} within tolerance, and "
                f"{summary.get('partial_payment_matches', 0)} as partial payments."
            ),
            (
                "Still unmatched: "
                f"{summary.get('unmatched_invoices', 0)} invoices and "
                f"{summary.get('unmatched_payments', 0)} payments."
            ),
            f"Match rate: {summary.get('match_rate_pct', 0)}%.",
            "",
        ])
        partials = [row for row in rows if row.get("match_type") == "partial_payment"][:3]
        for row in partials:
            invoice = row.get("invoice") or {}
            label = invoice.get("reference") or invoice.get("id") or "an invoice"
            lines.append(f"Partial payment on {label}: shortfall {row.get('shortfall')}.")
        if partials:
            lines.append("")
    if advice:
        if len(advice) > 1200:
            advice = advice[:1200].rstrip() + "…"
        lines.extend(["Advisory note", advice, ""])
    lines.extend([
        "Please do not act on this note until your Chartered Accountant has approved it.",
        "",
        "Prepared in TaxSaathi.",
        REVIEW_BANNER,
    ])
    return {
        "subject": f"Update on your tax working papers — {client}",
        "body": "\n".join(lines),
        "review_banner": REVIEW_BANNER,
    }
