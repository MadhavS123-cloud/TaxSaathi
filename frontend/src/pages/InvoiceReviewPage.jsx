import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileCheck, Save, Check } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import DocumentPreview from '../components/invoiceReview/DocumentPreview';
import FieldPanel from '../components/invoiceReview/FieldPanel';
import PrimaryButton from '../components/ui/PrimaryButton';
import { api } from '../lib/api';

const EMPTY_FIELDS = {
  invoiceNo: { value: '', confidence: 0 },
  date: { value: '', confidence: 0 },
  vendorName: { value: '', confidence: 0 },
  vendorGstin: { value: '', confidence: 0 },
  taxableValue: { value: '', confidence: 0 },
  cgst: { value: '', confidence: 0 },
  sgst: { value: '', confidence: 0 },
  igst: { value: '', confidence: 0 },
  totalAmount: { value: '', confidence: 0 },
};

function fieldsFromExtracted(extracted) {
  if (!extracted) return EMPTY_FIELDS;
  const doc = extracted.document_summary || {};
  const supplier = extracted.supplier_merchant || extracted.issuer_entity || {};
  const tax = extracted.tax_summary || {};
  const money = (value) => (value != null && value !== '' ? Number(value).toFixed(2) : '');
  return {
    invoiceNo: { value: doc.invoice_number || '', confidence: 0 },
    date: { value: doc.invoice_date || '', confidence: 0 },
    vendorName: { value: supplier.legal_name || supplier.trade_name || '', confidence: 0 },
    vendorGstin: { value: supplier.gstin || '', confidence: 0 },
    taxableValue: { value: money(tax.subtotal_net_taxable), confidence: 0 },
    cgst: { value: money(tax.total_cgst), confidence: 0 },
    sgst: { value: money(tax.total_sgst), confidence: 0 },
    igst: { value: money(tax.total_igst), confidence: 0 },
    totalAmount: { value: money(tax.grand_total), confidence: 0 },
  };
}

function linesFromExtracted(extracted) {
  if (!extracted?.line_items?.length) return [];
  return extracted.line_items.map((item, idx) => {
    const qty = item.quantity ?? 1;
    const rate = item.unit_rate ?? item.unit_price ?? 0;
    const taxable = item.net_taxable_value ?? (qty * rate);
    const gstPct = String(item.gst_rate ?? (item.cgst_rate ? item.cgst_rate * 2 : (item.igst_rate ?? '')));
    return {
      description: item.particulars || `Line Item ${idx + 1}`,
      qty: String(qty),
      rate: String(rate),
      gstPercent: gstPct,
      taxable: String(taxable),
      total: String(item.total_item_value ?? taxable),
    };
  });
}

export default function InvoiceReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { caseId, invoiceId } = useParams();

  const extracted = location.state?.extractedData;
  const fileUrl = location.state?.fileUrl;

  const [activeField, setActiveField] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loading, setLoading] = useState(!extracted);
  const [loadError, setLoadError] = useState(null);
  const [sampleName, setSampleName] = useState(location.state?.filename || '');
  const [fields, setFields] = useState(() => fieldsFromExtracted(extracted));
  const [lineItems, setLineItems] = useState(() => linesFromExtracted(extracted));

  useEffect(() => {
    if (extracted) return undefined;
    if (!caseId) {
      setLoading(false);
      setLoadError('Open a document from a case to review its extracted fields.');
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    api.documents.list(caseId)
      .then((docs) => {
        if (cancelled) return;
        const doc = (docs || []).find((item) => item.id === invoiceId);
        if (!doc) {
          setLoadError('This document is not on the case.');
          return;
        }
        setSampleName(doc.filename || '');
        if (!doc.extracted_json) {
          setLoadError(doc.error_detail || 'Extraction did not produce fields for this document.');
          return;
        }
        setFields(fieldsFromExtracted(doc.extracted_json));
        setLineItems(linesFromExtracted(doc.extracted_json));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Could not load the document.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId, invoiceId, extracted]);

  const handleSaveEdits = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updatedJson = {
        document_summary: {
          invoice_number: fields.invoiceNo?.value,
          invoice_date: fields.date?.value,
          total_amount: fields.totalAmount?.value,
        },
        supplier_merchant: {
          legal_name: fields.vendorName?.value,
          gstin: fields.vendorGstin?.value,
        },
        tax_summary: {
          subtotal_net_taxable: fields.taxableValue?.value,
          total_cgst: fields.cgst?.value,
          total_sgst: fields.sgst?.value,
          total_igst: fields.igst?.value,
          grand_total: fields.totalAmount?.value,
        },
        line_items: lineItems.map((li) => ({
          particulars: li.description,
          quantity: parseFloat(li.qty) || 1,
          unit_rate: parseFloat(li.rate) || 0,
          gst_rate: parseFloat(li.gstPercent) || 0,
          net_taxable_value: parseFloat(li.taxable) || 0,
          total_item_value: parseFloat(li.total) || 0,
        })),
      };

      const targetCaseId = caseId || location.state?.caseId;
      const targetDocId = invoiceId || location.state?.docId;

      if (!targetCaseId || !targetDocId) {
        setSaveError('This review is not linked to a stored document.');
        return;
      }
      await api.documents.update(targetCaseId, targetDocId, updatedJson);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setSaveError(String(err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">

      {/* 1. Header Row */}
      <div className="bg-paper-raised border-b border-hairline px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex gap-4 items-center">
          <div className="w-10 h-10 border border-hairline flex items-center justify-center bg-paper text-ink-muted">
            <FileCheck size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-serif text-ink tracking-tight">Extracted Invoice Data Review &amp; Verification</h2>
            <p className="text-xs font-sans text-ink-muted">Compare the OCR extracted fields against the original voucher scan.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-ink-muted border border-hairline px-2 py-1 bg-paper">
            {sampleName || 'No document'}
          </span>
          <PrimaryButton
            onClick={handleSaveEdits}
            disabled={isSaving}
            className="flex items-center gap-1.5 !py-1.5 !px-3 !text-xs"
          >
            {saveSuccess ? <Check size={14} className="text-forest" /> : <Save size={14} />}
            {isSaving ? 'Saving…' : saveSuccess ? 'Saved to DB' : 'Save Edits'}
          </PrimaryButton>
        </div>
      </div>

      {/* 2. Persistent Toolbar Row */}
      <div className="h-10 border-b border-hairline bg-paper flex items-center justify-between px-8 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-sans font-medium text-ink hover:text-brass transition-colors"
        >
          <ArrowLeft size={14} /> Back to Upload Queue
        </button>

        {saveSuccess && (
          <span className="text-xs font-mono text-forest flex items-center gap-1">
            <Check size={12} /> Extracted fields updated and stored.
          </span>
        )}
        {saveError && (
          <span className="text-xs font-mono text-rust">
            {saveError}
          </span>
        )}
        {loading && (
          <span className="text-xs font-mono text-ink-muted animate-pulse">Loading extraction…</span>
        )}
        {loadError && (
          <span className="text-xs font-mono text-rust">{loadError}</span>
        )}
      </div>

      {/* 3. Two-Column Split */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 h-full overflow-hidden">
          <DocumentPreview
            activeField={activeField}
            onClearHighlight={() => setActiveField(null)}
            imageUrl={fileUrl}
            filename={sampleName}
          />
        </div>

        {/* RIGHT: Field Panel */}
        <div className="w-1/2 h-full overflow-hidden">
          <FieldPanel
            fields={fields}
            setFields={setFields}
            items={lineItems}
            setItems={setLineItems}
            activeField={activeField}
            setActiveField={setActiveField}
          />
        </div>
      </div>
    </div>
  );
}
