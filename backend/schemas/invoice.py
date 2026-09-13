from pydantic import BaseModel
from typing import Optional, List, Any, Dict

class DocumentSummary(BaseModel):
    title: Optional[str] = "TAX INVOICE"
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    order_id: Optional[str] = None
    is_section_9_5_ecommerce: Optional[bool] = False
    reverse_charge_applicable: Optional[bool] = False

class IssuerEntity(BaseModel):
    legal_name: Optional[str] = None
    trade_name: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    cin: Optional[str] = None
    fssai_license: Optional[str] = None

class SupplierMerchant(BaseModel):
    legal_name: Optional[str] = None
    trade_name: Optional[str] = None
    gst_status: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    fssai_license: Optional[str] = None

class LineItem(BaseModel):
    particulars: Optional[str] = None
    hsn_sac_code: Optional[str] = None
    quantity: Optional[float] = 0.0
    gross_value: Optional[float] = 0.0
    discount: Optional[float] = 0.0
    net_taxable_value: Optional[float] = 0.0
    cgst_rate: Optional[str] = None
    cgst_amount: Optional[float] = 0.0
    sgst_rate: Optional[str] = None
    sgst_amount: Optional[float] = 0.0
    total_item_value: Optional[float] = 0.0

class TaxSummary(BaseModel):
    subtotal_net_taxable: Optional[float] = 0.0
    total_cgst: Optional[float] = 0.0
    total_sgst: Optional[float] = 0.0
    total_igst: Optional[float] = 0.0
    grand_total: Optional[float] = 0.0
    amount_in_words: Optional[str] = None

class ExtractionResponse(BaseModel):
    success: bool
    document_summary: Optional[Dict[str, Any]] = None
    issuer_entity: Optional[Dict[str, Any]] = None
    supplier_merchant: Optional[Dict[str, Any]] = None
    line_items: Optional[List[Dict[str, Any]]] = None
    tax_summary: Optional[Dict[str, Any]] = None
    auditor_notes: Optional[List[str]] = None
    error: Optional[str] = None
