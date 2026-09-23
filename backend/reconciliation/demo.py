"""
demo.py

Run from the `backend/` folder (one level above this `reconciliation/` folder):

    python -m reconciliation.demo

Loads the sample invoice JSON + payment CSV, runs the reconciler, and
prints a readable summary + row-by-row breakdown. Swap the sample_data
paths for real exports once you're plugging in actual data.
"""

import json
import os
from decimal import Decimal

from .normalize import load_invoice_records_from_json, load_bank_records
from .reconcile import build_report

# Path to the sample data, relative to wherever this package lives.
_HERE = os.path.dirname(os.path.abspath(__file__))
_SAMPLE_INVOICES = os.path.join(os.path.dirname(_HERE), "data", "reconciliation_samples", "invoices.json")
_SAMPLE_PAYMENTS = os.path.join(os.path.dirname(_HERE), "data", "reconciliation_samples", "payments.csv")


def main():
    invoices = load_invoice_records_from_json(_SAMPLE_INVOICES)
    payments = load_bank_records(_SAMPLE_PAYMENTS)

    report = build_report(
        invoices, payments, date_tolerance_days=3, amount_tolerance=Decimal("1.00")
    )

    print("=== SUMMARY ===")
    print(json.dumps(report["summary"], indent=2))

    print("\n=== ROWS ===")
    for row in report["rows"]:
        print(json.dumps(row, indent=2))


if __name__ == "__main__":
    main()
