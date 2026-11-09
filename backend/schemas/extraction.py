"""Pydantic contract for Gemini invoice extraction.

Field names follow the JSON object produced by extract_invoice.REAL_INVOICE_PROMPT.
Rates may be a printed string ("9%") or a number.
"""

from typing import List, Optional, Union

from pydantic import BaseModel, Field


class BillingMetadata(BaseModel):
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None


class DocumentSummary(BaseModel):
    title: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    order_id: Optional[str] = None
    is_section_9_5_ecommerce: Optional[bool] = None
    reverse_charge_applicable: Optional[bool] = None


class PartyEntity(BaseModel):
    legal_name: Optional[str] = None
    trade_name: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    cin: Optional[str] = None
    fssai_license: Optional[str] = None
    gst_status: Optional[str] = None
    address: Optional[str] = None


class RecipientCustomer(BaseModel):
    name: Optional[str] = None
    delivery_address: Optional[str] = None
    place_of_supply: Optional[str] = None


class LineItem(BaseModel):
    particulars: Optional[str] = None
    hsn_sac_code: Optional[str] = None
    quantity: Optional[float] = None
    gross_value: Optional[float] = None
    discount: Optional[float] = None
    net_taxable_value: Optional[float] = None
    cgst_rate: Optional[Union[str, float, int]] = None
    cgst_amount: Optional[float] = None
    sgst_rate: Optional[Union[str, float, int]] = None
    sgst_amount: Optional[float] = None
    igst_rate: Optional[Union[str, float, int]] = None
    igst_amount: Optional[float] = None
    total_item_value: Optional[float] = None


class TaxSummary(BaseModel):
    subtotal_net_taxable: Optional[float] = None
    total_cgst: Optional[float] = None
    total_sgst: Optional[float] = None
    total_igst: Optional[float] = None
    grand_total: Optional[float] = None
    amount_in_words: Optional[str] = None
    settlement_status: Optional[str] = None


class ExtractedInvoice(BaseModel):
    """One invoice extracted from an image or PDF. Draft for CA review."""

    document_summary: DocumentSummary
    issuer_entity: Optional[PartyEntity] = None
    supplier_merchant: Optional[PartyEntity] = None
    recipient_customer: Optional[RecipientCustomer] = None
    line_items: List[LineItem] = Field(default_factory=list)
    tax_summary: TaxSummary
    auditor_notes: Optional[List[str]] = None
    billing_metadata: Optional[BillingMetadata] = None
