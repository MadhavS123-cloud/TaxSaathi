import React, { useState } from 'react';
import { X, Building2, FileSpreadsheet, Hash } from 'lucide-react';
import PrimaryButton from '../ui/PrimaryButton';
import SecondaryButton from '../ui/SecondaryButton';

export default function NewCaseModal({ isOpen, onClose, onCreateCase }) {
  const [client, setClient] = useState('');
  const [scope, setScope] = useState('');
  const [gstin, setGstin] = useState('');
  const [status, setStatus] = useState('pending');
  const [matched, setMatched] = useState(0);
  const [exception, setException] = useState(0);
  const [pending, setPending] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!client.trim() || !scope.trim()) return;

    onCreateCase({
      client: client.trim(),
      scope: scope.trim(),
      gstin: gstin.trim() || null,
      status,
      reconciliation: {
        matched: Number(matched) || 0,
        exception: Number(exception) || 0,
        pending: Number(pending) || 0,
      }
    });

    // Reset form
    setClient('');
    setScope('');
    setGstin('');
    setStatus('pending');
    setMatched(0);
    setException(0);
    setPending(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-xs p-4">
      <div className="bg-paper-raised border border-hairline w-full max-w-lg shadow-2xl rounded-[4px] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-hairline bg-paper">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border border-hairline flex items-center justify-center bg-brass/10 text-brass">
              <Building2 size={18} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-serif text-lg text-ink">New Client Engagement</h3>
              <p className="text-xs font-sans text-ink-muted">Create a new statutory audit or tax reconciliation dossier.</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink hover:bg-paper transition-colors rounded-[2px]"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Client Name */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5">
              Client / Entity Name <span className="text-rust">*</span>
            </label>
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
              <input
                type="text"
                required
                placeholder="e.g. Tata Motors Ltd."
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-paper border border-hairline rounded-[2px] text-xs font-sans text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-brass"
              />
            </div>
          </div>

          {/* Audit Scope */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5">
              Audit Scope / Assignment <span className="text-rust">*</span>
            </label>
            <div className="relative">
              <FileSpreadsheet size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
              <input
                type="text"
                required
                placeholder="e.g. Statutory Audit FY25, GST Reconciliation Q3"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-paper border border-hairline rounded-[2px] text-xs font-sans text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-brass"
              />
            </div>
          </div>

          {/* GSTIN / PAN & Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5">
                GSTIN / PAN (Optional)
              </label>
              <div className="relative">
                <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="e.g. 27AAACT1234F1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-paper border border-hairline rounded-[2px] text-xs font-mono text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-brass uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-hairline rounded-[2px] text-xs font-sans text-ink focus:outline-none focus:border-brass"
              >
                <option value="pending">Pending</option>
                <option value="matched">Matched</option>
                <option value="exception">Exception</option>
              </select>
            </div>
          </div>

          {/* Initial Reconciliation Metrics */}
          <div className="pt-2 border-t border-hairline">
            <label className="block text-xs font-mono uppercase tracking-wider text-ink-muted mb-2">
              Initial Reconciliation Ledger Counts
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-mono text-forest block mb-1">Matched Entries</span>
                <input
                  type="number"
                  min="0"
                  value={matched}
                  onChange={(e) => setMatched(e.target.value)}
                  className="w-full px-2 py-1.5 bg-paper border border-hairline rounded-[2px] text-xs font-mono text-ink focus:outline-none focus:border-brass"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono text-rust block mb-1">Exceptions</span>
                <input
                  type="number"
                  min="0"
                  value={exception}
                  onChange={(e) => setException(e.target.value)}
                  className="w-full px-2 py-1.5 bg-paper border border-hairline rounded-[2px] text-xs font-mono text-ink focus:outline-none focus:border-brass"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono text-amber-flag block mb-1">Pending</span>
                <input
                  type="number"
                  min="0"
                  value={pending}
                  onChange={(e) => setPending(e.target.value)}
                  className="w-full px-2 py-1.5 bg-paper border border-hairline rounded-[2px] text-xs font-mono text-ink focus:outline-none focus:border-brass"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-hairline">
            <SecondaryButton onClick={onClose} type="button">
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit">
              + Create Case
            </PrimaryButton>
          </div>

        </form>

      </div>
    </div>
  );
}
