import React from 'react';
import { ZoomIn, ZoomOut, Maximize, X } from 'lucide-react';

export default function DocumentPreview({ activeField, onClearHighlight, imageUrl, filename = '' }) {
  const getHighlightClass = (fieldName) => {
    return activeField === fieldName ? 'ring-2 ring-brass bg-brass/5' : 'border border-transparent';
  };

  const isPdf = filename.toLowerCase().endsWith('.pdf') || (imageUrl && imageUrl.toLowerCase().includes('pdf'));

  return (
    <div className="flex flex-col h-full bg-paper-raised border-r border-hairline relative">
      {/* Small Toolbar */}
      <div className="h-12 border-b border-hairline flex items-center justify-between px-4 bg-paper/50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 border border-hairline bg-paper-raised p-0.5">
            <button className="p-1 hover:bg-paper text-ink-muted transition-colors"><ZoomOut size={14} /></button>
            <span className="text-[10px] font-mono px-2 text-ink">100%</span>
            <button className="p-1 hover:bg-paper text-ink-muted transition-colors"><ZoomIn size={14} /></button>
            <button className="p-1 hover:bg-paper text-ink-muted transition-colors border-l border-hairline ml-1 pl-2"><Maximize size={14} /></button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-sans text-ink-muted tracking-widest">Active Source Region</span>
            <span className="text-[10px] font-mono bg-ink text-paper px-2 py-0.5">
              {activeField ? `[${activeField.toUpperCase()}]` : '[NONE]'}
            </span>
          </div>
        </div>

        {activeField && (
          <button 
            onClick={onClearHighlight}
            className="flex items-center gap-1 text-[11px] font-sans text-ink-muted hover:text-ink transition-colors"
          >
            <X size={12} /> Clear highlight
          </button>
        )}
      </div>

      {/* Simulated Document Preview Area */}
      <div className="flex-1 overflow-auto p-8 bg-paper flex justify-center">
        {imageUrl ? (
          isPdf ? (
            <iframe src={`${imageUrl}#toolbar=0`} className="w-full h-full shadow-[0_0_10px_rgba(0,0,0,0.03)] border border-hairline" title="Document Preview" />
          ) : (
            <img src={imageUrl} alt="Document Preview" className="max-w-full h-auto object-contain shadow-[0_0_10px_rgba(0,0,0,0.03)] border border-hairline" />
          )
        ) : (
        <div className="w-full max-w-[800px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.03)] border border-hairline p-10 flex flex-col gap-8 text-ink h-max font-sans">
          {/* Header Block */}
          <div className="flex justify-between items-start border-b border-hairline pb-6">
            <div className={`p-2 transition-colors ${getHighlightClass('vendorName')}`}>
              <h2 className="text-2xl font-serif font-bold uppercase tracking-wide">Micronet Hardware Pvt. Ltd.</h2>
              <p className="text-sm text-ink-muted mt-1">123 Tech Park, Phase 1, Hinjewadi, Pune 411057</p>
              <div className={`mt-2 p-1 inline-block transition-colors ${getHighlightClass('vendorGstin')}`}>
                <p className="text-xs font-mono">GSTIN: 27AABCM1234N1Z2</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-serif text-ink/20 uppercase tracking-widest mb-4">Tax Invoice</h1>
              <div className="flex flex-col items-end gap-2">
                <div className={`p-1 transition-colors ${getHighlightClass('invoiceNo')}`}>
                  <span className="text-xs text-ink-muted mr-2 uppercase">Invoice No.</span>
                  <span className="text-sm font-mono font-medium">INV-24-0891</span>
                </div>
                <div className={`p-1 transition-colors ${getHighlightClass('date')}`}>
                  <span className="text-xs text-ink-muted mr-2 uppercase">Date</span>
                  <span className="text-sm font-mono font-medium">12 Oct 2024</span>
                </div>
              </div>
            </div>
          </div>

          {/* Billed To Block */}
          <div className="grid grid-cols-2 gap-8">
            <div className="p-2 border border-transparent">
              <h3 className="text-xs uppercase tracking-widest text-ink-muted mb-2 border-b border-hairline pb-1 inline-block">Billed To</h3>
              <p className="text-sm font-medium mt-2">Boutique & Partners LLP</p>
              <p className="text-xs text-ink-muted mt-1">45 Commerce Blvd, Mumbai 400001</p>
              <p className="text-xs font-mono mt-1">GSTIN: 27AABCB9876P1Z9</p>
            </div>
          </div>

          {/* Line Items */}
          <div className={`p-2 transition-colors ${getHighlightClass('lineItems')}`}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y border-hairline text-xs uppercase text-ink-muted font-medium">
                  <th className="py-2 px-2">Description</th>
                  <th className="py-2 px-2 text-right">Qty</th>
                  <th className="py-2 px-2 text-right">Rate</th>
                  <th className="py-2 px-2 text-right">GST %</th>
                  <th className="py-2 px-2 text-right">Taxable</th>
                  <th className="py-2 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                <tr className="border-b border-hairline border-dashed">
                  <td className="py-3 px-2 font-sans">ThinkPad T14 Gen 4</td>
                  <td className="py-3 px-2 text-right">2</td>
                  <td className="py-3 px-2 text-right">85000.00</td>
                  <td className="py-3 px-2 text-right">18%</td>
                  <td className="py-3 px-2 text-right">170000.00</td>
                  <td className="py-3 px-2 text-right">200600.00</td>
                </tr>
                <tr className="border-b border-hairline border-dashed">
                  <td className="py-3 px-2 font-sans">Dell UltraSharp 27 Monitor</td>
                  <td className="py-3 px-2 text-right">2</td>
                  <td className="py-3 px-2 text-right">25000.00</td>
                  <td className="py-3 px-2 text-right">18%</td>
                  <td className="py-3 px-2 text-right">50000.00</td>
                  <td className="py-3 px-2 text-right">59000.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Block */}
          <div className="flex justify-end mt-4">
            <div className="w-1/2 border border-hairline p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs uppercase text-ink-muted tracking-wide">Taxable Value</span>
                <span className={`font-mono text-sm p-1 transition-colors ${getHighlightClass('taxableValue')}`}>₹220,000.00</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs uppercase text-ink-muted tracking-wide">CGST (9%)</span>
                <span className={`font-mono text-sm p-1 transition-colors ${getHighlightClass('cgst')}`}>₹19,800.00</span>
              </div>
              <div className="flex justify-between items-center mb-2 border-b border-hairline pb-2">
                <span className="text-xs uppercase text-ink-muted tracking-wide">SGST (9%)</span>
                <span className={`font-mono text-sm p-1 transition-colors ${getHighlightClass('sgst')}`}>₹19,800.00</span>
              </div>
              <div className="flex justify-between items-center mb-2 text-ink-muted opacity-50">
                <span className="text-xs uppercase tracking-wide">IGST</span>
                <span className={`font-mono text-sm p-1 transition-colors ${getHighlightClass('igst')}`}>₹0.00</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm font-bold uppercase tracking-widest text-ink">Invoice Total</span>
                <span className={`font-mono font-bold text-lg p-1 transition-colors ${getHighlightClass('totalAmount')}`}>₹259,600.00</span>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="mt-8 border-t border-hairline pt-6 flex justify-between items-end text-xs text-ink-muted font-sans">
            <div>
              <p>E-Way Bill: <span className="font-mono">131456789012</span></p>
              <p className="mt-1">Generated by TaxSaathi OCR Engine</p>
            </div>
            <div className="text-right">
              <div className="w-32 h-10 border-b border-ink/20 mb-2"></div>
              <p>Authorised Signatory</p>
            </div>
          </div>

        </div>
        )}
      </div>
    </div>
  );
}
