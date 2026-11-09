"""
tests/test_e2e.py - End-to-end integration tests for the TaxSaathi API.

The advisory test needs live Gemini and Chroma. It is skipped unless
RUN_LIVE_TESTS=1.
"""
import io
import os
import sys
from unittest.mock import patch

_this_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_this_dir)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

os.environ["JWT_SECRET"] = "test-secret-for-e2e-testing-32-characters-min"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from main import app
from db.session import Base, get_db

test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

MOCK_INVOICE = {
    "document_summary": {
        "title": "TAX INVOICE",
        "invoice_number": "INV-1001",
        "invoice_date": "2024-03-10",
    },
    "tax_summary": {
        "subtotal_net_taxable": 45000.0,
        "total_cgst": 0.0,
        "total_sgst": 0.0,
        "total_igst": 0.0,
        "grand_total": 45000.0,
    },
    "supplier_merchant": {
        "legal_name": "Apex Suppliers",
        "gstin": "27AABCR1234F1Z5",
    },
    "line_items": [
        {"particulars": "Audit support", "quantity": 1, "net_taxable_value": 45000.0, "total_item_value": 45000.0}
    ],
}


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _setup_database():
    import db.models  # register tables on Base before create_all
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db


def _teardown_database():
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=test_engine)


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _csv(rows: list[dict]) -> bytes:
    import csv
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    return buf.getvalue().encode("utf-8")


@pytest.fixture
def client():
    _setup_database()
    try:
        yield TestClient(app)
    finally:
        _teardown_database()


@pytest.fixture
def firm_a(client):
    registered = client.post("/auth/register", json={
        "name": "CA Rajesh Sharma",
        "email": "rajesh@firm-a.in",
        "password": "FirmPassword123",
        "firm_name": "Sharma & Associates LLP",
    })
    assert registered.status_code == 201, registered.text
    token = registered.json()["access_token"]
    headers = auth_header(token)
    created_client = client.post("/clients", json={
        "legal_name": "Reliance Retail Ltd",
        "gstin": "27AABCR1234F1Z5",
        "pan": "AABCR1234F",
    }, headers=headers)
    assert created_client.status_code == 201, created_client.text
    created_case = client.post("/cases", json={
        "client": "Reliance Retail Ltd",
        "scope": "Statutory Audit FY25",
        "gstin": "27AABCR1234F1Z5",
        "assessment_year": "2024-25",
        "status": "PENDING",
    }, headers=headers)
    assert created_case.status_code == 201, created_case.text
    return {
        "client": client,
        "headers": headers,
        "case_id": created_case.json()["id"],
    }


def test_auth(client):
    health = client.get("/health")
    assert health.status_code == 200
    assert "status" in health.json() and "db" in health.json()

    missing = client.get("/cases")
    assert missing.status_code == 401
    assert "detail" in missing.json()
    assert client.get("/dashboard/summary").status_code == 401

    payload = {
        "name": "CA Rajesh Sharma",
        "email": "rajesh@firm-a.in",
        "password": "FirmPassword123",
        "firm_name": "Sharma & Associates LLP",
    }
    registered = client.post("/auth/register", json=payload)
    assert registered.status_code == 201, registered.text
    body = registered.json()
    assert body["firm"]["name"] == "Sharma & Associates LLP"
    assert body["user"]["email"] == "rajesh@firm-a.in"
    assert body["access_token"]

    duplicate = client.post("/auth/register", json=payload)
    assert duplicate.status_code == 409

    logged_in = client.post("/auth/login", json={
        "email": "rajesh@firm-a.in",
        "password": "FirmPassword123",
    })
    assert logged_in.status_code == 200, logged_in.text
    assert logged_in.json()["user"]["email"] == "rajesh@firm-a.in"
    assert logged_in.json()["access_token"]


def test_isolation(firm_a):
    client = firm_a["client"]
    other = client.post("/auth/register", json={
        "name": "CA Priya Verma",
        "email": "priya@firm-b.in",
        "password": "PasswordFirmB123",
        "firm_name": "Verma & Co",
    })
    assert other.status_code == 201, other.text
    token_b = auth_header(other.json()["access_token"])
    listed = client.get("/cases", headers=token_b)
    assert listed.status_code == 200
    assert all(row["id"] != firm_a["case_id"] for row in listed.json())
    denied = client.get(f"/cases/{firm_a['case_id']}", headers=token_b)
    assert denied.status_code == 403


def test_upload(firm_a):
    client = firm_a["client"]
    pdf = b"%PDF-1.4 sample invoice voucher raw bytes for taxsaathi e2e"
    with patch("extract_invoice.extract_real_invoice", return_value=MOCK_INVOICE):
        uploaded = client.post(
            f"/cases/{firm_a['case_id']}/documents",
            files={"file": ("inv_march_2025.pdf", io.BytesIO(pdf), "application/pdf")},
            headers=firm_a["headers"],
        )
    assert uploaded.status_code == 200, uploaded.text
    body = uploaded.json()
    assert body["status"] == "extracted"
    assert body["extracted_json"]["document_summary"]["invoice_number"] == "INV-1001"
    assert "grand_total" in body["extracted_json"]["tax_summary"]

    again = client.post(
        f"/cases/{firm_a['case_id']}/documents",
        files={"file": ("inv_march_2025.pdf", io.BytesIO(pdf), "application/pdf")},
        headers=firm_a["headers"],
    )
    assert again.status_code == 409
    assert "Duplicate file" in again.json()["detail"]


def test_upload_failed_extraction(firm_a):
    client = firm_a["client"]
    pdf = b"%PDF-1.4 broken"
    with patch("extract_invoice.extract_real_invoice", side_effect=RuntimeError("mocked extraction failure")):
        uploaded = client.post(
            f"/cases/{firm_a['case_id']}/documents",
            files={"file": ("bad.pdf", io.BytesIO(pdf), "application/pdf")},
            headers=firm_a["headers"],
        )
    assert uploaded.status_code == 200, uploaded.text
    assert uploaded.json()["status"] == "failed"
    items = client.get("/review/items", headers=firm_a["headers"])
    assert items.status_code == 200, items.text
    assert any(item["item_type"] == "failed_extraction" for item in items.json())


def test_reconcile(firm_a):
    client = firm_a["client"]
    invoices = _csv([
        {"invoice_number": "INV-001", "date": "2024-03-10", "vendor": "Apex Suppliers", "amount": "45000.00"},
        {"invoice_number": "INV-002", "date": "2024-03-12", "vendor": "Zenith Tech", "amount": "12500.00"},
    ])
    payments = _csv([
        {"reference": "INV-001", "date": "2024-03-11", "description": "NEFT Apex", "amount": "45000.00"},
    ])
    reconciled = client.post(
        f"/cases/{firm_a['case_id']}/reconcile",
        files={
            "invoice_file": ("invoices.csv", io.BytesIO(invoices), "text/csv"),
            "payment_file": ("bank.csv", io.BytesIO(payments), "text/csv"),
        },
        data={"date_tolerance_days": "3", "amount_tolerance": "1.0"},
        headers=firm_a["headers"],
    )
    assert reconciled.status_code == 200, reconciled.text
    summary = reconciled.json()["summary"]
    assert summary["exact_reference_matches"] == 1
    assert summary["fuzzy_matches"] == 0

    saved = client.get(f"/cases/{firm_a['case_id']}/reconcile", headers=firm_a["headers"])
    assert saved.status_code == 200, saved.text
    assert saved.json()["summary"]["exact_reference_matches"] == 1
    assert saved.json()["summary"]["fuzzy_matches"] == 0


def test_dashboard(firm_a):
    summary = firm_a["client"].get("/dashboard/summary", headers=firm_a["headers"])
    assert summary.status_code == 200, summary.text
    assert summary.json()["active_engagements"] >= 1


@pytest.mark.live
@pytest.mark.skipif(
    os.getenv("RUN_LIVE_TESTS") != "1",
    reason="needs live Gemini and Chroma",
)
def test_advisory(firm_a):
    client = firm_a["client"]
    asked = client.post("/advisory/ask", json={
        "question": "What is Section 194Q of the Income Tax Act?",
        "case_id": firm_a["case_id"],
    }, headers=firm_a["headers"])
    assert asked.status_code == 200, asked.text
    body = asked.json()
    assert "answer" in body
    assert "citations" in body
    history = client.get(
        f"/advisory/history?case_id={firm_a['case_id']}",
        headers=firm_a["headers"],
    )
    assert history.status_code == 200
    assert len(history.json()) >= 2
