import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, FileText, Mail, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

const ITEM_TYPES = {
  failed_extraction: { label: 'Failed Extraction', icon: FileText, color: 'text-rust' },
  unmatched_reconciliation: { label: 'Unmatched Row', icon: AlertCircle, color: 'text-amber-600' },
  draft_email: { label: 'Draft Email', icon: Mail, color: 'text-brass' },
};

export default function ReviewApprove() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.review.list();
      setItems(data || []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleDecision = async (id, decision) => {
    try {
      const updated = await api.review.takeAction(id, decision);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: updated.status, reviewer: updated.reviewer, reviewed_at: updated.reviewed_at }
            : item
        )
      );
    } catch (e) {
      alert(`Action failed: ${e.message || e}`);
    }
  };

  const pending = items.filter((i) => i.status === 'pending');
  const resolved = items.filter((i) => i.status !== 'pending');

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-serif text-ink tracking-tight">Review &amp; Approve</h2>
          <p className="text-ink-muted text-sm mt-1">
            Items requiring practitioner sign-off: failed extractions, unmatched reconciliation rows, and drafted communications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadItems}
            className="p-1.5 text-ink-muted hover:text-ink border border-hairline rounded-[2px]"
            title="Refresh review items"
          >
            <RefreshCw size={14} />
          </button>
          <span className="border border-hairline px-3 py-1 text-xs font-mono text-ink-muted uppercase">
            {pending.length} pending
          </span>
          <span className="border border-hairline px-3 py-1 text-xs font-mono text-ink-muted uppercase">
            {resolved.length} resolved
          </span>
        </div>
      </div>

      {loading && (
        <div className="bg-paper-raised border border-hairline p-8 text-center">
          <p className="text-ink-muted font-mono text-xs animate-pulse">Loading review items from database…</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rust/10 border border-rust/30 text-rust rounded-[2px] text-sm font-sans mb-6">
          {error}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="bg-paper-raised border border-hairline p-12 flex flex-col items-center justify-center min-h-[300px]">
          <CheckCircle size={32} className="text-forest mb-3" strokeWidth={1.5} />
          <h3 className="text-xl font-serif text-ink mb-1">Queue Clear</h3>
          <p className="text-ink-muted font-sans text-sm">No items currently require auditor review.</p>
        </div>
      )}

      {/* Pending Items */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h3 className="font-serif text-lg text-ink mb-4 border-b border-hairline pb-2">Pending Decision</h3>
          <div className="space-y-3">
            {pending.map((item) => {
              const meta = ITEM_TYPES[item.item_type] || ITEM_TYPES.failed_extraction;
              const Icon = meta.icon;
              return (
                <div key={item.id} className="bg-paper-raised border border-hairline p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`mt-0.5 shrink-0 ${meta.color}`}>
                      <Icon size={18} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono uppercase tracking-wider text-ink-muted border border-hairline px-1.5 py-0.5">
                          {meta.label}
                        </span>
                        <span className="text-xs font-mono text-ink-muted">{item.case_name}</span>
                      </div>
                      <p className="font-sans font-medium text-ink text-sm truncate">{item.title}</p>
                      <p className="text-xs font-sans text-ink-muted mt-1 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDecision(item.id, 'approved')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-forest/40 text-forest hover:bg-forest/5 transition-colors rounded-[2px]"
                    >
                      <CheckCircle size={12} /> Approve
                    </button>
                    <button
                      onClick={() => handleDecision(item.id, 'rejected')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-rust/40 text-rust hover:bg-rust/5 transition-colors rounded-[2px]"
                    >
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resolved Items */}
      {resolved.length > 0 && (
        <div>
          <h3 className="font-serif text-lg text-ink mb-4 border-b border-hairline pb-2">Audit Decision Trail</h3>
          <div className="space-y-2">
            {resolved.map((item) => {
              const meta = ITEM_TYPES[item.item_type] || ITEM_TYPES.failed_extraction;
              const Icon = meta.icon;
              return (
                <div key={item.id} className="bg-paper border border-hairline p-3 flex items-center justify-between gap-4 opacity-80">
                  <div className="flex items-center gap-3">
                    <Icon size={14} className={meta.color} strokeWidth={1.5} />
                    <span className="font-sans text-sm text-ink">{item.title}</span>
                    <span className="text-xs font-mono text-ink-muted">({item.case_name})</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    {item.status === 'approved' ? (
                      <span className="flex items-center gap-1 text-forest">
                        <CheckCircle size={12} /> Approved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rust">
                        <XCircle size={12} /> Rejected
                      </span>
                    )}
                    {item.reviewer && (
                      <span className="text-ink-muted">by {item.reviewer}</span>
                    )}
                    {item.reviewed_at && (
                      <span className="text-ink-muted">at {item.reviewed_at}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
