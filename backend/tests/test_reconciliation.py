"""Reconciliation loader and matcher checks. No network and no database."""

import csv
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

from reconciliation.models import SourceType, Transaction
from reconciliation.normalize import (
    NO_INVOICE_REFERENCE_COLUMN,
    load_invoice_records_from_table,
)
from reconciliation.reconcile import build_report
from schemas.reconciliation import ReconciliationReport


def _write_csv(tmp_path: Path, name: str, rows: list[dict]) -> str:
    path = tmp_path / name
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    return str(path)


def _txn(txn_id, source, day, amount, reference=None, party=None):
    return Transaction(
        id=txn_id,
        source=source,
        txn_date=day,
        amount=Decimal(amount),
        reference=reference,
        party_name=party,
    )


def test_invoice_csv_invoice_number_sets_reference(tmp_path):
    path = _write_csv(tmp_path, "invoices.csv", [
        {
            "  INVOICE_NUMBER  ": "INV-001",
            "date": "2024-03-10",
            "vendor": "Apex Suppliers",
            "amount": "45000.00",
        },
    ])
    records, warnings = load_invoice_records_from_table(path)
    assert warnings == []
    assert records[0].reference == "INV-001"
    assert records[0].party_name == "Apex Suppliers"
    assert records[0].amount == Decimal("45000.0")
    assert records[0].txn_date == date(2024, 3, 10)
    assert records[0].source == SourceType.INVOICE


def test_missing_invoice_number_column_warns(tmp_path):
    path = _write_csv(tmp_path, "invoices.csv", [
        {"date": "2024-03-10", "amount": "45000.00", "vendor": "Apex Suppliers"},
    ])
    records, warnings = load_invoice_records_from_table(path)
    assert records[0].reference is None
    assert warnings == [NO_INVOICE_REFERENCE_COLUMN]
    report = build_report(records, [])
    report["warnings"] = warnings
    parsed = ReconciliationReport.model_validate(report)
    assert parsed.warnings == [NO_INVOICE_REFERENCE_COLUMN]
    assert parsed.summary.exact_reference_matches == 0


def test_exact_reference_match_when_dates_differ_by_one_day(tmp_path):
    invoices = _write_csv(tmp_path, "invoices.csv", [
        {"invoice_number": "INV-001", "date": "2024-03-10", "vendor": "Apex Suppliers", "amount": "45000.00"},
        {"invoice_number": "INV-002", "date": "2024-03-12", "vendor": "Zenith Tech", "amount": "12500.00"},
    ])
    payments = _write_csv(tmp_path, "bank.csv", [
        {"reference": "INV-001", "date": "2024-03-11", "description": "NEFT Apex", "amount": "45000.00"},
    ])
    invoice_rows, warnings = load_invoice_records_from_table(invoices)
    from reconciliation.normalize import load_bank_records
    payment_rows = load_bank_records(payments)
    assert warnings == []
    report = build_report(invoice_rows, payment_rows, date_tolerance_days=3, amount_tolerance=Decimal("1.0"))
    assert report["summary"]["exact_reference_matches"] == 1
    assert report["summary"]["fuzzy_matches"] == 0


def test_reference_normalization_ignores_case_spaces_and_punctuation():
    day = date(2024, 3, 10)
    invoice = _txn("inv", SourceType.INVOICE, day, "100", "INV-001")
    spaced = _txn("pay-spaced", SourceType.PAYMENT, day, "100", "inv 001")
    compact = _txn("pay-compact", SourceType.PAYMENT, day + timedelta(days=1), "100", "INV001")
    assert invoice.normalized_reference() == spaced.normalized_reference() == compact.normalized_reference() == "INV001"
    spaced_report = build_report([invoice], [spaced])
    compact_report = build_report([invoice], [compact])
    assert spaced_report["summary"]["exact_reference_matches"] == 1
    assert compact_report["summary"]["exact_reference_matches"] == 1


def test_duplicate_invoice_reference_first_wins_and_other_is_reviewed():
    day = date(2024, 3, 10)
    first = _txn("inv-first", SourceType.INVOICE, day, "45000.00", "INV-001")
    second = _txn("inv-second", SourceType.INVOICE, day, "45000.00", "INV-001")
    payment = _txn("pay", SourceType.PAYMENT, day, "45000.00", "INV-001")
    report = build_report([first, second], [payment])
    rows = report["rows"]
    exact = [row for row in rows if row["match_type"] == "exact_reference"]
    reviewed = [row for row in rows if row["invoice"] and row["invoice"]["id"] == "inv-second"]
    assert len(exact) == 1
    assert exact[0]["invoice"]["id"] == "inv-first"
    assert len(reviewed) == 1
    assert reviewed[0]["match_type"] == "unmatched_invoice"
    assert reviewed[0]["notes"]
    assert reviewed[0]["needs_review"] is True


def test_amount_rounding_within_tolerance_matches():
    day = date(2024, 3, 10)
    invoice = _txn("inv", SourceType.INVOICE, day, "45000.00", "BILL-1")
    payment = _txn("pay", SourceType.PAYMENT, day, "45000.004", "OTHER")
    report = build_report(
        [invoice],
        [payment],
        date_tolerance_days=3,
        amount_tolerance=Decimal("1.00"),
    )
    assert report["summary"]["fuzzy_matches"] == 1
    assert report["summary"]["unmatched_invoices"] == 0
    assert report["summary"]["unmatched_payments"] == 0


def test_date_window_just_inside_and_just_outside_tolerance():
    start = date(2024, 3, 10)
    invoice = _txn("inv", SourceType.INVOICE, start, "1000.00", "BILL-9")
    inside = _txn("pay-in", SourceType.PAYMENT, start + timedelta(days=3), "1000.00", "UTR-1")
    outside = _txn("pay-out", SourceType.PAYMENT, start + timedelta(days=4), "1000.00", "UTR-2")
    inside_report = build_report([invoice], [inside], date_tolerance_days=3, amount_tolerance=Decimal("1"))
    outside_report = build_report([invoice], [outside], date_tolerance_days=3, amount_tolerance=Decimal("1"))
    assert inside_report["summary"]["fuzzy_matches"] == 1
    assert inside_report["summary"]["unmatched_invoices"] == 0
    assert outside_report["summary"]["fuzzy_matches"] == 0
    assert outside_report["summary"]["unmatched_invoices"] == 1
    assert outside_report["summary"]["unmatched_payments"] == 1


def test_unmatched_invoice_and_unmatched_payment_are_both_reported():
    day = date(2024, 3, 1)
    invoice = _txn("inv", SourceType.INVOICE, day, "10.00", "INV-9")
    payment = _txn("pay", SourceType.PAYMENT, day + timedelta(days=30), "999.00", "UTR-9")
    report = build_report([invoice], [payment], date_tolerance_days=3, amount_tolerance=Decimal("1"))
    types = {row["match_type"] for row in report["rows"]}
    assert "unmatched_invoice" in types
    assert "unmatched_payment" in types
    assert report["summary"]["unmatched_invoices"] == 1
    assert report["summary"]["unmatched_payments"] == 1


def _partial_rows(report):
    return [row for row in report["rows"] if row["match_type"] == "partial_payment"]


def test_two_payments_same_reference_sum_exactly():
    day = date(2024, 3, 10)
    invoice = _txn("inv", SourceType.INVOICE, day, "100.00", "INV-1")
    first = _txn("pay-a", SourceType.PAYMENT, day, "40.00", "INV-1")
    second = _txn("pay-b", SourceType.PAYMENT, day + timedelta(days=2), "60.00", "INV-1")
    report = build_report([invoice], [first, second], amount_tolerance=Decimal("1"))
    rows = _partial_rows(report)
    assert len(rows) == 1
    assert rows[0]["payment_ids"] == ["pay-a", "pay-b"]
    assert Decimal(rows[0]["total_paid"]) == Decimal("100")
    assert Decimal(rows[0]["shortfall"]) == Decimal("0")
    assert rows[0]["confidence"] == 0.9
    assert rows[0]["needs_review"] is True
    assert report["summary"]["partial_payment_matches"] == 1
    assert report["summary"]["exact_reference_matches"] == 0


def test_same_reference_sum_below_invoice_reports_shortfall():
    day = date(2024, 3, 10)
    invoice = _txn("inv", SourceType.INVOICE, day, "100.00", "INV-1")
    first = _txn("pay-a", SourceType.PAYMENT, day, "40.00", "INV-1")
    second = _txn("pay-b", SourceType.PAYMENT, day, "50.00", "INV-1")
    report = build_report([invoice], [first, second], amount_tolerance=Decimal("1"))
    row = _partial_rows(report)[0]
    assert Decimal(row["shortfall"]) == Decimal("10")
    assert Decimal(row["total_paid"]) == Decimal("90")
    assert row["confidence"] == 0.7
    assert row["needs_review"] is True


def test_same_reference_sum_above_invoice_is_overpayment_note():
    day = date(2024, 3, 10)
    invoice = _txn("inv", SourceType.INVOICE, day, "100.00", "INV-1")
    first = _txn("pay-a", SourceType.PAYMENT, day, "70.00", "INV-1")
    second = _txn("pay-b", SourceType.PAYMENT, day, "50.00", "INV-1")
    report = build_report([invoice], [first, second], amount_tolerance=Decimal("1"))
    assert _partial_rows(report) == []
    notes = [row["notes"] for row in report["rows"] if row["invoice"] and row["invoice"]["id"] == "inv"]
    assert notes and "overpayment" in notes[0].lower()
    assert report["summary"]["exact_reference_matches"] == 0


def test_three_payments_inside_window_sum_to_invoice():
    day = date(2024, 3, 1)
    invoice = _txn("inv", SourceType.INVOICE, day, "300.00")
    payments = [
        _txn("p1", SourceType.PAYMENT, day + timedelta(days=2), "100.00"),
        _txn("p2", SourceType.PAYMENT, day + timedelta(days=5), "100.00"),
        _txn("p3", SourceType.PAYMENT, day + timedelta(days=9), "100.00"),
    ]
    report = build_report([invoice], payments, amount_tolerance=Decimal("1"))
    row = _partial_rows(report)[0]
    assert row["payment_ids"] == ["p1", "p2", "p3"]
    assert Decimal(row["shortfall"]) == Decimal("0")
    assert row["confidence"] == 0.6
    assert "p1" in row["notes"] and "p2" in row["notes"] and "p3" in row["notes"]
    assert row["needs_review"] is True


def test_same_payments_outside_window_are_not_matched():
    day = date(2024, 3, 1)
    invoice = _txn("inv", SourceType.INVOICE, day, "300.00")
    payments = [
        _txn("p1", SourceType.PAYMENT, day + timedelta(days=31), "100.00"),
        _txn("p2", SourceType.PAYMENT, day + timedelta(days=32), "100.00"),
        _txn("p3", SourceType.PAYMENT, day + timedelta(days=33), "100.00"),
    ]
    report = build_report([invoice], payments, amount_tolerance=Decimal("1"))
    assert _partial_rows(report) == []
    assert report["summary"]["unmatched_invoices"] == 1
    assert report["summary"]["unmatched_payments"] == 3


def test_two_invoices_compete_for_payments_once_each():
    first_day = date(2024, 3, 1)
    early = _txn("inv-early", SourceType.INVOICE, first_day, "100.00")
    late = _txn("inv-late", SourceType.INVOICE, first_day + timedelta(days=1), "100.00")
    payments = [
        _txn("p1", SourceType.PAYMENT, first_day, "60.00"),
        _txn("p2", SourceType.PAYMENT, first_day, "40.00"),
        _txn("p3", SourceType.PAYMENT, first_day, "60.00"),
        _txn("p4", SourceType.PAYMENT, first_day, "40.00"),
    ]
    report = build_report([late, early], payments, amount_tolerance=Decimal("1"))
    rows = _partial_rows(report)
    by_invoice = {row["invoice"]["id"]: row["payment_ids"] for row in rows}
    assert by_invoice["inv-early"] == ["p1", "p2"]
    assert by_invoice["inv-late"] == ["p3", "p4"]
    assert set(by_invoice["inv-early"]).isdisjoint(by_invoice["inv-late"])


def test_payment_used_by_earlier_tier_is_not_reused():
    day = date(2024, 3, 10)
    settled = _txn("inv-settled", SourceType.INVOICE, day, "100.00", "INV-9")
    open_invoice = _txn("inv-open", SourceType.INVOICE, day, "50.00")
    used = _txn("pay-used", SourceType.PAYMENT, day, "100.00", "INV-9")
    part_a = _txn("pay-a", SourceType.PAYMENT, day, "20.00")
    part_b = _txn("pay-b", SourceType.PAYMENT, day, "30.00")
    report = build_report([settled, open_invoice], [used, part_a, part_b], amount_tolerance=Decimal("1"))
    assert report["summary"]["exact_reference_matches"] == 1
    row = _partial_rows(report)[0]
    assert row["invoice"]["id"] == "inv-open"
    assert row["payment_ids"] == ["pay-a", "pay-b"]
    assert "pay-used" not in row["payment_ids"]


def test_twenty_candidates_stay_inside_cap():
    import time
    day = date(2024, 6, 1)
    invoice = _txn("inv", SourceType.INVOICE, day, "100.00")
    close = [
        _txn("close-01", SourceType.PAYMENT, day, "20.00"),
        _txn("close-02", SourceType.PAYMENT, day, "30.00"),
        _txn("close-03", SourceType.PAYMENT, day, "50.00"),
    ]
    far = [
        _txn(f"far-{i:02d}", SourceType.PAYMENT, day + timedelta(days=15), "7.00")
        for i in range(1, 18)
    ]
    started = time.perf_counter()
    report = build_report([invoice], close + far, amount_tolerance=Decimal("1"))
    elapsed = time.perf_counter() - started
    row = _partial_rows(report)[0]
    assert elapsed < 1
    assert row["payment_ids"] == ["close-01", "close-02", "close-03"]
    assert len(row["payment_ids"]) <= 4
