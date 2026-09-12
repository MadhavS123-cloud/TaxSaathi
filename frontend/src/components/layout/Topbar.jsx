import React from 'react';
import { Search, LogOut } from 'lucide-react';
import { useLocation, matchPath } from 'react-router-dom';

const PATH_MAP = {
  '/dashboard': 'Case Dashboard',
  '/extract': 'Document Upload & OCR',
  '/cases': 'Invoice Data Review',
  '/reconcile': 'Ledger Reconciliation',
  '/advisory': 'Tax Advisory Chat',
  '/drafts': 'Client Communication',
  '/approve': 'Review & Approve',
  '/audit': 'Audit Trail',
};

export default function Topbar() {
  const location = useLocation();
  const currentModule = PATH_MAP[location.pathname] || 'Module';
  
  const isCaseUploadRoute = matchPath('/cases/:caseId/upload', location.pathname);

  if (isCaseUploadRoute) {
    return (
      <header className="h-[80px] bg-paper-raised border-b border-hairline flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-serif font-medium text-lg text-ink">Reliance Industries Ltd.</span>
            <span className="border border-hairline px-2 py-0.5 text-[10px] font-sans text-ink uppercase tracking-widest bg-paper/50">Active Case</span>
          </div>
          <span className="text-xs font-mono text-ink-muted">GSTIN: 27AABCR1234F1Z5</span>
        </div>
        <div className="flex flex-col items-end text-right">
          <span className="text-sm font-sans font-medium text-ink">Document Upload & OCR</span>
          <span className="text-xs font-sans text-ink-muted">Secure ingestion and extraction of tax invoices and receipts.</span>
        </div>
      </header>
    );
  }

  return (
    <header className="h-[72px] bg-paper-raised border-b border-hairline flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-3">
          <span className="font-serif font-medium text-lg text-ink">Boutique & Partners LLP</span>
          <span className="border border-hairline px-2 py-0.5 text-[10px] font-mono text-ink uppercase tracking-widest bg-paper/50">AY 2025-26</span>
        </div>
        <span className="text-xs font-sans text-ink-muted mt-0.5">{currentModule}</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-8 pr-3 py-1.5 bg-paper border border-hairline rounded-[2px] text-xs font-sans focus:outline-none focus:border-brass/50 w-[200px] text-ink placeholder:text-ink-muted/70"
          />
        </div>

        <div className="flex items-center gap-2 border border-hairline px-2 py-1 rounded-[2px] bg-paper/50">
          <div className="w-1.5 h-1.5 rounded-full bg-forest"></div>
          <span className="text-[10px] font-mono text-forest uppercase tracking-wider">Engine Connected</span>
        </div>

        <div className="flex items-center gap-4 pl-4 border-l border-hairline">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm border border-hairline bg-paper flex items-center justify-center text-ink font-sans font-medium text-xs">
              JD
            </div>
            <div className="flex flex-col">
              <span className="text-ink text-sm font-sans leading-tight">J. Doe</span>
              <span className="text-ink-muted text-[10px] font-sans">Partner</span>
            </div>
          </div>
          <button className="text-ink-muted hover:text-ink transition-colors ml-2">
            <LogOut size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
