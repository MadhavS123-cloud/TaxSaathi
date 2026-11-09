import React, { useState } from 'react';
import { X, Building2, FileSpreadsheet, Hash, Calendar } from 'lucide-react';
import PrimaryButton from '../ui/PrimaryButton';
import SecondaryButton from '../ui/SecondaryButton';

export default function NewCaseModal({ isOpen, onClose, onCreateCase }) {
  const [client, setClient] = useState('');
  const [scope, setScope] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [assessmentYear, setAssessmentYear] = useState('2024-25');
  const [status, setStatus] = useState('pending');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!client.trim()) return;

    onCreateCase({
      client: client.trim(),
      legal_name: client.trim(),
      scope: scope.trim() || 'Statutory Tax Audit',
      title: scope.trim() || 'Statutory Tax Audit',
      gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
      pan: pan.trim() ? pan.trim().toUpperCase() : null,
      assessment_year: assessmentYear.trim() || '2024-25',
      status: status.toUpperCase(),
      reconciliation: {
        matched: 0,
        exception: 0,
        pending: 0,
      }
    });

    // Reset form
    setClient('');
    setScope('');
    setGstin('');
    setPan('');
    setAssessmentYear('2024-25');
    setStatus('pending');
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

          {/* Legal / Client Name */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5">
              Legal Entity Name <span className="text-rust">*</span>
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

          {/* Scope / Title */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5">
              Engagement Scope / Title <span className="text-rust">*</span>
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

          {/* GSTIN and PAN */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5">
                GSTIN (Optional)
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
                PAN (Optional)
              </label>
              <div className="relative">
                <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="e.g. AAACT1234F"
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-paper border border-hairline rounded-[2px] text-xs font-mono text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-brass uppercase"
                />
              </div>
            </div>
          </div>

          {/* Assessment Year and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5">
                Assessment Year
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="e.g. 2024-25"
                  value={assessmentYear}
                  onChange={(e) => setAssessmentYear(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-paper border border-hairline rounded-[2px] text-xs font-mono text-ink focus:outline-none focus:border-brass"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5">
                Status
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
