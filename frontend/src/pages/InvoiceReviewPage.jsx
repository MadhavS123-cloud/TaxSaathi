import React, { useState } from 'react';
import { ArrowLeft, FileCheck, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import DocumentPreview from '../components/invoiceReview/DocumentPreview';
import FieldPanel from '../components/invoiceReview/FieldPanel';

export default function InvoiceReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const extracted = location.state?.extractedData;
  const sampleName = location.state?.filename || 'Extracted Invoice';
  const fileUrl = location.state?.fileUrl;

  const [activeField, setActiveField] = useState(null);
  
  const [fields, setFields] = useState(() => {
    if (!extracted) {
      return {
        invoiceNo: { value: 'INV-24-0891', confidence: 98 },
        date: { value: '12 Oct 2024', confidence: 99 },
        vendorName: { value: 'Micronet Hardware Pvt. Ltd.', confidence: 96 },
        vendorGstin: { value: '27AABCM1234N1Z2', confidence: 100 },
        taxableValue: { value: '220000.00', confidence: 99 },
        cgst: { value: '19800.00', confidence: 98 },
        sgst: { value: '19800.00', confidence: 98 },
        igst: { value: '0.00', confidence: 99 },
        totalAmount: { value: '259600.00', confidence: 100 },
      };
    }

    const doc = extracted.document_summary || {};
    const supplier = extracted.supplier_merchant || extracted.issuer_entity || {};
    const tax = extracted.tax_summary || {};

    return {
      invoiceNo: { value: doc.invoice_number || 'N/A', confidence: 98 },
      date: { value: doc.invoice_date || 'N/A', confidence: 99 },
      vendorName: { value: supplier.legal_name || supplier.trade_name || 'N/A', confidence: 96 },
      vendorGstin: { value: supplier.gstin || 'N/A', confidence: 100 },
      taxableValue: { value: tax.subtotal_net_taxable != null ? String(tax.subtotal_net_taxable) : '0.00', confidence: 99 },
      cgst: { value: tax.total_cgst != null ? String(tax.total_cgst) : '0.00', confidence: 98 },
      sgst: { value: tax.total_sgst != null ? String(tax.total_sgst) : '0.00', confidence: 98 },
      igst: { value: tax.total_igst != null ? String(tax.total_igst) : '0.00', confidence: 99 },
      totalAmount: { value: tax.grand_total != null ? String(tax.grand_total) : '0.00', confidence: 100 },
    };
  });

  const [lineItems, setLineItems] = useState(() => {
    if (!extracted?.line_items || extracted.line_items.length === 0) {
      return [
        {
          description: 'ThinkPad T14 Gen 4',
          qty: '2',
          rate: '85000.00',
          gstPercent: '18',
          taxable: '170000.00',
          total: '200600.00'
        },
        {
          description: 'Dell UltraSharp 27 Monitor',
          qty: '2',
          rate: '25000.00',
          gstPercent: '18',
          taxable: '50000.00',
          total: '59000.00'
        }
      ];
    }

    return extracted.line_items.map((item, idx) => {
      const qty = item.quantity || 1;
      const taxable = item.net_taxable_value ?? item.gross_value ?? 0;
      const rate = qty > 0 ? (taxable / qty).toFixed(2) : taxable;
      
      let gstPct = '18';
      if (item.cgst_rate) {
        const parsed = parseFloat(item.cgst_rate);
        if (!isNaN(parsed)) gstPct = String(parsed * 2);
      }

      return {
        description: item.particulars || `Line Item ${idx + 1}`,
        qty: String(qty),
        rate: String(rate),
        gstPercent: gstPct,
        taxable: String(taxable),
        total: String(item.total_item_value ?? taxable)
      };
    });
  });

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      
      {/* 1. Header Row */}
      <div className="bg-paper-raised border-b border-hairline px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex gap-4 items-center">
          <div className="w-10 h-10 border border-hairline flex items-center justify-center bg-paper text-ink-muted">
            <FileCheck size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-serif text-ink tracking-tight">Extracted Invoice Data Review & Verification</h2>
            <p className="text-xs font-sans text-ink-muted">Compare the OCR extracted fields against the original voucher scan.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 px-3 py-1.5 border border-hairline bg-paper text-xs font-sans text-ink">
            {sampleName} <ChevronDown size={14} className="text-ink-muted" />
          </button>
          
          <div className="flex items-center gap-2 border-l border-hairline pl-6">
            <button className="text-[10px] font-sans text-ink-muted border border-hairline px-2 py-1 rounded-[2px] hover:bg-paper transition-colors">
              Toggle Review Needed
            </button>
            <button className="text-[10px] font-sans text-ink-muted border border-hairline px-2 py-1 rounded-[2px] hover:bg-paper transition-colors">
              Simulate Loading
            </button>
            <button className="text-[10px] font-sans text-ink-muted border border-hairline px-2 py-1 rounded-[2px] hover:bg-paper transition-colors">
              Simulate Error
            </button>
          </div>
        </div>
      </div>

      {/* 2. Persistent Toolbar Row */}
      <div className="h-10 border-b border-hairline bg-paper flex items-center px-8 shrink-0">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-sans font-medium text-ink hover:text-brass transition-colors"
        >
          <ArrowLeft size={14} /> Back to Upload Queue
        </button>
      </div>

      {/* 3. Two-Column Split */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT: Document Preview */}
        <div className="w-1/2 h-full overflow-hidden">
          <DocumentPreview 
            activeField={activeField} 
            onClearHighlight={() => setActiveField(null)} 
            imageUrl={fileUrl}
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
