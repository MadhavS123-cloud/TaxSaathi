from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class ReconciliationSummary(BaseModel):
    total_invoices: int
    total_payments: int
    exact_reference_matches: int
    exact_amount_date_matches: int
    fuzzy_matches: int
    unmatched_invoices: int
    unmatched_payments: int
    match_rate_pct: float
    partial_payment_matches: int = 0

class InvoiceModel(BaseModel):
    id: str
    date: str
    amount: str
    reference: Optional[str] = None
    party_name: Optional[str] = None

class PaymentModel(BaseModel):
    id: str
    date: str
    amount: str
    reference: Optional[str] = None
    party_name: Optional[str] = None

class ReconciliationRow(BaseModel):
    match_type: Literal[
        "exact_reference",
        "exact_amount_date",
        "fuzzy_amount_date",
        "partial_payment",
        "unmatched_invoice",
        "unmatched_payment"
    ]
    confidence: float
    invoice: Optional[InvoiceModel] = None
    payment: Optional[PaymentModel] = None
    amount_diff: Optional[str] = None
    date_diff_days: Optional[int] = None
    notes: str
    needs_review: bool
    payment_ids: List[str] = Field(default_factory=list)
    payments: List[PaymentModel] = Field(default_factory=list)
    total_paid: Optional[str] = None
    shortfall: Optional[str] = None

class ReconciliationReport(BaseModel):
    # GET /cases/{id}/reconcile returns summary=null when the case has no saved run.
    summary: Optional[ReconciliationSummary] = None
    rows: List[ReconciliationRow] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
