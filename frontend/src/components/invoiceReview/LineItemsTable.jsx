import React from 'react';
import PrimaryButton from '../ui/PrimaryButton';
import SecondaryButton from '../ui/SecondaryButton';

export default function LineItemsTable({ items, onUpdateItem, onRecalculateTotals, setActiveField }) {
  
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    
    // Convert string inputs to numbers for calculation where needed, but keep string state if empty
    let numVal = parseFloat(value) || 0;
    
    if (field === 'qty' || field === 'rate' || field === 'gstPercent') {
      item[field] = value;
      
      const q = parseFloat(item.qty) || 0;
      const r = parseFloat(item.rate) || 0;
      const g = parseFloat(item.gstPercent) || 0;
      
      item.taxable = (q * r).toFixed(2);
      item.total = (q * r * (1 + g/100)).toFixed(2);
    } else {
      item[field] = value;
    }
    
    newItems[index] = item;
    onUpdateItem(newItems);
  };

  return (
    <div className="mt-12" onFocus={() => setActiveField('lineItems')}>
      <div className="flex items-center justify-between mb-4 border-b border-hairline pb-2">
        <h4 className="font-serif text-ink tracking-wide">Extracted Line Items ({items.length})</h4>
        <SecondaryButton onClick={onRecalculateTotals} className="!py-1 !px-2 text-xs">
          Recalculate from Line Items
        </SecondaryButton>
      </div>

      <div className="w-full overflow-x-auto border border-hairline bg-paper-raised">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-[10px] uppercase tracking-widest text-ink-muted bg-paper/50 font-sans">
              <th className="py-2 px-3">Item Description</th>
              <th className="py-2 px-3 text-right">Qty</th>
              <th className="py-2 px-3 text-right">Rate</th>
              <th className="py-2 px-3 text-right">GST %</th>
              <th className="py-2 px-3 text-right">Taxable</th>
              <th className="py-2 px-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-hairline last:border-b-0">
                <td className="py-2 px-2">
                  <input 
                    type="text" 
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="w-full bg-transparent font-sans text-xs border border-transparent focus:border-brass/30 focus:outline-none px-1 py-1"
                  />
                </td>
                <td className="py-2 px-2 w-16">
                  <input 
                    type="number" 
                    value={item.qty}
                    onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                    className="w-full bg-transparent font-mono text-xs text-right border border-transparent focus:border-brass/30 focus:outline-none px-1 py-1"
                  />
                </td>
                <td className="py-2 px-2 w-24">
                  <input 
                    type="number" 
                    value={item.rate}
                    onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                    className="w-full bg-transparent font-mono text-xs text-right border border-transparent focus:border-brass/30 focus:outline-none px-1 py-1"
                  />
                </td>
                <td className="py-2 px-2 w-16">
                  <input 
                    type="number" 
                    value={item.gstPercent}
                    onChange={(e) => handleItemChange(idx, 'gstPercent', e.target.value)}
                    className="w-full bg-transparent font-mono text-xs text-right border border-transparent focus:border-brass/30 focus:outline-none px-1 py-1"
                  />
                </td>
                <td className="py-2 px-3 w-28 text-right font-mono text-xs text-ink bg-paper/30">
                  {item.taxable}
                </td>
                <td className="py-2 px-3 w-28 text-right font-mono text-xs text-ink font-medium bg-paper/50">
                  {item.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
