import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import DeskPageHeader from '../components/layout/DeskPageHeader';
import WhatsAppSendButton from '../components/WhatsAppSendButton';

export default function Drafts() {
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState('');
  const [draft, setDraft] = useState(null);
  const [loadingCases, setLoadingCases] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState(null);
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    api.cases.list()
      .then((rows) => setCases(rows || []))
      .catch((err) => setError(err.message || 'Could not load cases.'))
      .finally(() => setLoadingCases(false));
  }, []);

  const handleDraft = async (event) => {
    event.preventDefault();
    if (!caseId) return;
    setDrafting(true);
    setError(null);
    setDraft(null);
    setReviewed(false);
    try {
      const result = await api.drafts.create(caseId);
      setDraft(result);
    } catch (err) {
      setError(err.message || 'Could not draft the client note.');
    } finally {
      setDrafting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <DeskPageHeader
        eyebrow="Your practice / Clients"
        title="Client Communication"
        subtitle="A plain-language note from the case's latest reconciliation and advisory reply. It is queued for review and is not sent to the client."
      />

      <form onSubmit={handleDraft} className="bg-paper-raised border border-hairline p-4 flex flex-wrap items-end gap-3 mb-6">
        <label className="flex flex-col gap-1 text-xs font-mono text-ink-muted uppercase tracking-wider">
          Case
          <select
            value={caseId}
            onChange={(event) => {
              setCaseId(event.target.value);
              setDraft(null);
              setReviewed(false);
            }}
            disabled={loadingCases}
            className="bg-paper border border-hairline text-sm font-sans text-ink px-2 py-2 min-w-[240px] focus:outline-none focus:border-brass"
          >
            <option value="">{loadingCases ? 'Loading cases…' : 'Select a case'}</option>
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.client || item.title || item.id}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={!caseId || drafting}
          className="rounded-full bg-[#1C1915] px-4 py-2 font-sans text-xs text-[#F4F1EA] disabled:opacity-50"
        >
          {drafting ? 'Drafting…' : 'Draft note'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-rust/10 border border-rust/30 text-rust text-sm font-sans mb-6">
          {error}
        </div>
      )}

      {draft && (
        <article className="bg-paper-raised border border-hairline">
          <div className="border-b border-hairline px-6 py-3 flex items-center justify-between gap-4">
            <span className="text-xs font-mono uppercase tracking-wider text-brass-deep border border-brass/40 px-2 py-1">
              {draft.review_banner}
            </span>
            <span className="text-xs font-mono text-ink-muted">Queued for review</span>
          </div>
          <div className="px-6 py-5">
            <h3 className="font-serif text-xl text-ink mb-4">{draft.subject}</h3>
            <pre className="font-sans text-sm text-ink whitespace-pre-wrap leading-relaxed">{draft.body}</pre>
          </div>
          <div className="border-t border-hairline px-6 py-4">
            <label className="mb-4 flex items-center gap-2 font-sans text-sm text-ink">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(event) => setReviewed(event.target.checked)}
                className="accent-brass"
              />
              I have reviewed this draft
            </label>
            <WhatsAppSendButton draft={draft.body || ''} disabled={!reviewed || !draft.body} />
          </div>
        </article>
      )}
    </div>
  );
}
