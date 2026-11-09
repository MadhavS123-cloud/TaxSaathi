import React, { useState } from 'react';
import { X, Building2, Hash } from 'lucide-react';
import PrimaryButton from '../ui/PrimaryButton';
import SecondaryButton from '../ui/SecondaryButton';

export default function NewClientModal({ isOpen, onClose, onCreateClient }) {
  const [legalName, setLegalName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!legalName.trim()) return;

    onCreateClient({
      legal_name: legalName.trim(),
      gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
      pan: pan.trim() ? pan.trim().toUpperCase() : null,
    });

    setLegalName('');
    setGstin('');
    setPan('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-xs p-4">
      <div className="bg-paper-raised border border-hairline w-full max-w-md shadow-2xl rounded-[4px] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-hairline bg-paper">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border border-hairline flex items-center justify-center bg-forest/10 text-forest">
              <Building2 size={18} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-serif text-lg text-ink">New Client Master</h3>
              <p className="text-xs font-sans text-ink-muted">Add a client profile to your firm registry.</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5">
              Legal Entity Name <span className="text-rust">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Reliance Retail Ventures Limited"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              className="w-full px-3 py-2 bg-paper border border-hairline rounded-[2px] text-xs font-sans text-ink focus:outline-none focus:border-brass"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5">
              GSTIN (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 27AABCR1234F1Z5"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              className="w-full px-3 py-2 bg-paper border border-hairline rounded-[2px] text-xs font-mono text-ink focus:outline-none focus:border-brass uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5">
              Permanent Account Number (PAN) (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. AABCR1234F"
              value={pan}
              onChange={(e) => setPan(e.target.value)}
              className="w-full px-3 py-2 bg-paper border border-hairline rounded-[2px] text-xs font-mono text-ink focus:outline-none focus:border-brass uppercase"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-hairline">
            <SecondaryButton onClick={onClose} type="button">
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit">
              + Save Client
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
