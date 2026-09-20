import React from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { FileText, AlertTriangle, Scale } from 'lucide-react';

export default function LiveActivityCards({ scale = 'normal' }) {
  const prefersReducedMotion = useReducedMotion();
  
  const scaleClass = scale === 'large' ? 'scale-[1.15] origin-center md:origin-left' : 'scale-100';
  const floatAnim1 = prefersReducedMotion ? '' : 'animate-[float_4s_ease-in-out_infinite]';
  const floatAnim2 = prefersReducedMotion ? '' : 'animate-[float_5s_ease-in-out_infinite_1s]';
  const floatAnim3 = prefersReducedMotion ? '' : 'animate-[float_6s_ease-in-out_infinite_2s]';
  
  return (
    <div className={`relative w-full h-[400px] md:h-[500px] flex items-center justify-center ${scaleClass}`}>
      {/* Background connecting line pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(var(--ink) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      <div className={`absolute top-[10%] right-[10%] md:right-[20%] bg-paper border border-hairline p-4 w-[280px] z-10 ${floatAnim1}`}>
        <div className="flex items-center gap-3 mb-3">
          <FileText size={16} className="text-ink-muted" strokeWidth={1.5} />
          <span className="text-xs font-mono uppercase tracking-widest text-ink-muted">Extracted</span>
        </div>
        <div className="text-sm font-sans text-ink mb-1">Invoice INV-2024-089</div>
        <div className="text-xs text-forest font-mono flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-forest rounded-sm"></div> Data confidence 98.2%
        </div>
      </div>
      
      <div className={`absolute top-[40%] left-[5%] md:left-[10%] bg-paper-raised border border-hairline p-4 w-[260px] shadow-[0_0_0_1px_rgba(20,23,31,0.02)] z-20 ${floatAnim2}`}>
        <div className="flex items-center gap-3 mb-3">
          <Scale size={16} className="text-forest" strokeWidth={1.5} />
          <span className="text-xs font-mono uppercase tracking-widest text-forest">Reconciled</span>
        </div>
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-sans text-ink">₹ 1,45,000.00</span>
            <span className="text-xs font-mono text-ink-muted">Matched to Ledger G-12</span>
          </div>
        </div>
      </div>

      <div className={`absolute bottom-[15%] right-[5%] md:right-[15%] bg-paper border border-hairline p-4 w-[280px] z-30 ${floatAnim3}`}>
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle size={16} className="text-amber-flag" strokeWidth={1.5} />
          <span className="text-xs font-mono uppercase tracking-widest text-ink-muted">Exception</span>
        </div>
        <div className="text-sm font-sans text-ink mb-1">GSTIN mismatch on Vch-42</div>
        <div className="text-xs text-amber-flag font-mono flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-amber-flag rounded-sm"></div> Flagged for partner review
        </div>
      </div>
    </div>
  );
}
