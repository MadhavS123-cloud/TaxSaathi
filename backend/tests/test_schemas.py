"""One valid and one invalid example for each public pipeline schema."""

import pytest
from pydantic import ValidationError

from schemas.advisory import AdvisoryRequest, AdvisoryResponse
from schemas.extraction import ExtractedInvoice
from schemas.reconciliation import ReconciliationReport


VALID_INVOICE = {
    "document_summary": {
        "title": "TAX INVOICE",
        "invoice_number": "INV-1001",
        "invoice_date": "2026-08-01",
        "is_section_9_5_ecommerce": False,
        "reverse_charge_applicable": False,
    },
    "supplier_merchant": {
        "legal_name": "Sharma Traders",
        "gstin": "29ABCDE1234F1Z5",
        "gst_status": "REGISTERED",
    },
    "line_items": [
        {
            "particulars": "Consulting",
            "hsn_sac_code": "9983",
            "quantity": 1,
            "net_taxable_value": 25000,
            "cgst_rate": "9%",
            "cgst_amount": 2250,
            "sgst_rate": 9,
            "sgst_amount": 2250,
            "total_item_value": 29500,
        }
    ],
    "tax_summary": {
        "subtotal_net_taxable": 25000,
        "total_cgst": 2250,
        "total_sgst": 2250,
        "total_igst": 0,
        "grand_total": 29500,
    },
}

VALID_REPORT = {
    "summary": {
        "total_invoices": 1,
        "total_payments": 1,
        "exact_reference_matches": 1,
        "exact_amount_date_matches": 0,
        "fuzzy_matches": 0,
        "unmatched_invoices": 0,
        "unmatched_payments": 0,
        "match_rate_pct": 100.0,
    },
    "rows": [
        {
            "match_type": "exact_reference",
            "confidence": 1.0,
            "invoice": {
                "id": "inv_0000",
                "date": "2026-08-01",
                "amount": "29500.00",
                "reference": "INV-1001",
                "party_name": "Sharma Traders",
            },
            "payment": {
                "id": "pay_0000",
                "date": "2026-08-01",
                "amount": "29500.00",
                "reference": "INV-1001",
                "party_name": "Sharma Traders",
            },
            "amount_diff": "0.00",
            "date_diff_days": 0,
            "notes": "",
            "needs_review": False,
        }
    ],
}


def test_extracted_invoice_valid():
    invoice = ExtractedInvoice.model_validate(VALID_INVOICE)
    assert invoice.document_summary.invoice_number == "INV-1001"
    assert invoice.tax_summary.grand_total == 29500
    assert invoice.line_items[0].cgst_rate == "9%"


def test_extracted_invoice_invalid():
    with pytest.raises(ValidationError):
        ExtractedInvoice.model_validate(
            {"document_summary": {"invoice_number": "INV-1"}, "line_items": []}
        )


def test_reconciliation_report_valid():
    report = ReconciliationReport.model_validate(VALID_REPORT)
    assert report.summary.exact_reference_matches == 1
    assert report.rows[0].match_type == "exact_reference"


def test_reconciliation_report_invalid():
    bad = {
        "summary": VALID_REPORT["summary"],
        "rows": [{"match_type": "not_a_status", "confidence": 1.0, "notes": "", "needs_review": True}],
    }
    with pytest.raises(ValidationError):
        ReconciliationReport.model_validate(bad)


def test_advisory_request_valid():
    body = AdvisoryRequest.model_validate({"query": "When is ITC available under CGST?", "top_k": 7})
    assert body.top_k == 7
    assert body.query.startswith("When")


def test_advisory_request_invalid():
    with pytest.raises(ValidationError):
        AdvisoryRequest.model_validate({"query": "Section 16 CGST", "top_k": 0})


def test_advisory_response_valid():
    body = AdvisoryResponse.model_validate(
        {
            "query": "When is ITC available under CGST?",
            "answer": "The corpus excerpt for CGST Section 16 sets the conditions.",
            "citations": [
                {
                    "act": "CGST Act, 2017",
                    "section_number": "16",
                    "section_title": "Eligibility and conditions for taking input tax credit",
                }
            ],
            "confidence": 0.9,
            "is_low_confidence": False,
        }
    )
    assert body.citations[0].section_number == "16"


def test_advisory_response_invalid():
    with pytest.raises(ValidationError):
        AdvisoryResponse.model_validate(
            {
                "query": "When is ITC available?",
                "answer": "See the act.",
                "confidence": 2.0,
            }
        )
