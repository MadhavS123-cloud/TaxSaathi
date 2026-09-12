import React, { useState } from 'react';
import StatusTag from '../ui/StatusTag';
import SecondaryButton from '../ui/SecondaryButton';
import LineItemsTable from './LineItemsTable';
import { Check } from 'lucide-react';

const ConfidenceBadge = ({ score }) => {
  let color = 'bg-forest';
  let text = 'High';
  if (score < 80) {
    color = 'bg-rust';
    text = 'Low';
  } else if (score < 95) {
    color = 'bg-amber-flag';
    text = 'Medium';
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-hairline h-[2px] overflow-hidden w-8">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-mono text-ink-muted w-10 text-right">{score}%</span>
    </div>
  );
};

export default function FieldPanel({ fields, setFields, items, setItems, activeField, setActiveField }) {
  const [autoRecalculate, setAutoRecalculate] = useState(true);

  const handleFieldChange = (key, value) => {
    setFields(prev => ({ ...prev, [key]: { ...prev[key], value } }));
  };

  const applyGstPreset = (type) => {
    const taxable = parseFloat(fields.taxableValue.value) || 0;
    
    let cgst = 0, sgst = 0, igst = 0;
    
    if (type === '18_cgst_sgst') {
      cgst = taxable * 0.09;
      sgst = taxable * 0.09;
    } else if (type === '18_igst') {
      igst = taxable * 0.18;
    } else if (type === '12_cgst_sgst') {
      cgst = taxable * 0.06;
      sgst = taxable * 0.06;
    } else if (type === '5_igst') {
      igst = taxable * 0.05;
    } else if (type === '28_cgst_sgst') {
      cgst = taxable * 0.14;
      sgst = taxable * 0.14;
    }

    setFields(prev => ({
      ...prev,
      cgst: { ...prev.cgst, value: cgst.toFixed(2) },
      sgst: { ...prev.sgst, value: sgst.toFixed(2) },
      igst: { ...prev.igst, value: igst.toFixed(2) },
    }));

    if (autoRecalculate) {
      recalculateTotal(taxable, cgst, sgst, igst);
    }
  };

  const recalculateTotal = (tax, c, s, i) => {
    const t = tax || parseFloat(fields.taxableValue.value) || 0;
    const cg = c !== undefined ? c : parseFloat(fields.cgst.value) || 0;
    const sg = s !== undefined ? s : parseFloat(fields.sgst.value) || 0;
    const ig = i !== undefined ? i : parseFloat(fields.igst.value) || 0;
    
    const total = t + cg + sg + ig;
    handleFieldChange('totalAmount', total.toFixed(2));
  };

  const recalculateFromLineItems = () => {
    let tax = 0;
    let cgst = 0;
    let sgst = 0;
    let total = 0;

    items.forEach(item => {
      const q = parseFloat(item.qty) || 0;
      const r = parseFloat(item.rate) || 0;
      const g = parseFloat(item.gstPercent) || 0;
      
      const itemTaxable = q * r;
      tax += itemTaxable;
      
      // simplistic assignment: assuming local supply for demo
      const itemTax = itemTaxable * (g / 100);
      cgst += itemTax / 2;
      sgst += itemTax / 2;
      total += itemTaxable + itemTax;
    });

    setFields(prev => ({
      ...prev,
      taxableValue: { ...prev.taxableValue, value: tax.toFixed(2) },
      cgst: { ...prev.cgst, value: cgst.toFixed(2) },
      sgst: { ...prev.sgst, value: sgst.toFixed(2) },
      igst: { ...prev.igst, value: '0.00' },
      totalAmount: { ...prev.totalAmount, value: total.toFixed(2) }
    }));
  };

  const isBalanced = () => {
    const t = parseFloat(fields.taxableValue.value) || 0;
    const cg = parseFloat(fields.cgst.value) || 0;
    const sg = parseFloat(fields.sgst.value) || 0;
    const ig = parseFloat(fields.igst.value) || 0;
    const total = parseFloat(fields.totalAmount.value) || 0;
    
    return Math.abs(total - (t + cg + sg + ig)) < 0.1;
  };

  const renderField = (key, label, type = 'text', isNumeric = false) => {
    const fieldData = fields[key];
    const isActive = activeField === key;
    
    return (
      <div 
        key={key} 
        className={`flex items-center gap-4 py-3 px-2 border-b border-hairline transition-colors ${isActive ? 'bg-brass/5 border-l-2 border-l-brass -ml-2 pl-4' : ''}`}
      >
        <div className="w-1/3 text-xs font-sans text-ink-muted uppercase tracking-wide flex items-center justify-between pr-2">
          {label}
        </div>
        <div className="w-1/3">
          <input 
            type={type} 
            value={fieldData.value}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            onFocus={() => setActiveField(key)}
            className={`w-full bg-paper border border-hairline rounded-[2px] px-2 py-1.5 text-sm focus:outline-none focus:border-brass/50 text-ink ${isNumeric ? 'font-mono text-right' : 'font-sans'}`}
          />
        </div>
        <div className="w-1/3 flex justify-end">
          <ConfidenceBadge score={fieldData.confidence} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-paper p-8 overflow-y-auto">
      
      {/* Header Row */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-hairline">
        <h3 className="font-serif text-xl text-ink">Extracted Structured Fields</h3>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-sans text-ink-muted tracking-widest">Auto-recalculate</span>
            <button 
              onClick={() => setAutoRecalculate(!autoRecalculate)}
              className="relative w-8 h-4 rounded-full transition-colors flex items-center px-0.5 bg-ink"
            >
              <div className={`w-3 h-3 rounded-full bg-brass transition-transform ${autoRecalculate ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
          
          {isBalanced() ? (
             <div className="flex items-center gap-1 border border-forest/30 bg-forest/5 px-2 py-0.5">
               <Check size={12} className="text-forest" />
               <span className="text-[10px] font-mono text-forest uppercase tracking-widest">Sum Balanced</span>
             </div>
          ) : (
            <StatusTag status="exception" label="Imbalanced" />
          )}
        </div>
      </div>

      {/* Field List */}
      <div className="flex flex-col">
        {renderField('invoiceNo', '1. Invoice No.')}
        {renderField('date', '2. Date')}
        {renderField('vendorName', '3. Vendor Legal Name')}
        {renderField('vendorGstin', '4. Vendor GSTIN')}
        
        <div className="mt-6 mb-2 text-xs uppercase font-sans font-semibold tracking-widest text-ink">Tax Computation</div>
        
        {renderField('taxableValue', '5. Taxable Value', 'text', true)}
        
        {/* GST Presets */}
        <div className="flex items-center justify-end gap-2 py-2 pr-[33%] border-b border-hairline border-dashed">
          <span className="text-[9px] uppercase font-sans text-ink-muted mr-2">Presets:</span>
          <button onClick={() => applyGstPreset('18_cgst_sgst')} className="text-[10px] border border-hairline px-2 py-0.5 rounded-[2px] bg-paper-raised text-ink hover:border-brass hover:text-brass transition-colors">18% (9+9)</button>
          <button onClick={() => applyGstPreset('18_igst')} className="text-[10px] border border-hairline px-2 py-0.5 rounded-[2px] bg-paper-raised text-ink hover:border-brass hover:text-brass transition-colors">18% IGST</button>
          <button onClick={() => applyGstPreset('12_cgst_sgst')} className="text-[10px] border border-hairline px-2 py-0.5 rounded-[2px] bg-paper-raised text-ink hover:border-brass hover:text-brass transition-colors">12% (6+6)</button>
          <button onClick={() => applyGstPreset('5_igst')} className="text-[10px] border border-hairline px-2 py-0.5 rounded-[2px] bg-paper-raised text-ink hover:border-brass hover:text-brass transition-colors">5% IGST</button>
        </div>

        {renderField('cgst', '6. CGST Amount', 'text', true)}
        {renderField('sgst', '7. SGST Amount', 'text', true)}
        {renderField('igst', '8. IGST Amount', 'text', true)}
        
        <div className="mt-4 pt-4 border-t-2 border-ink/20">
          <div className="flex items-center gap-4 py-2 px-2">
            <div className="w-1/3">
              <SecondaryButton onClick={() => recalculateTotal()} className="!py-1.5 !text-xs w-full">Recalculate Total</SecondaryButton>
            </div>
            <div className="w-1/3">
              <input 
                type="text" 
                value={fields.totalAmount.value}
                onChange={(e) => handleFieldChange('totalAmount', e.target.value)}
                onFocus={() => setActiveField('totalAmount')}
                className={`w-full bg-paper-raised border-2 ${activeField === 'totalAmount' ? 'border-brass' : 'border-ink'} px-2 py-2 font-mono text-lg font-bold text-right text-ink focus:outline-none focus:border-brass`}
              />
            </div>
            <div className="w-1/3 flex justify-end items-center gap-2">
              <span className="text-[10px] uppercase font-sans text-ink-muted">Total</span>
              <ConfidenceBadge score={fields.totalAmount.confidence} />
            </div>
          </div>
        </div>

      </div>

      <LineItemsTable 
        items={items} 
        onUpdateItem={setItems} 
        onRecalculateTotals={recalculateFromLineItems}
        setActiveField={setActiveField}
      />
      
    </div>
  );
}
