import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Drafts() {
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState('');
  const [draft, setDraft] = useState(null);
  const [loadingCases, setLoadingCases] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState(null);

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
      <h2 className="text-3xl font-serif text-ink tracking-tight mb-2">Client Communication</h2>
      <p className="text-ink-muted font-sans text-sm mb-6">
        A plain-language note from the case&apos;s latest reconciliation and advisory reply.
        It is queued for review and is not sent to the client.
      </p>

      <form onSubmit={handleDraft} className="bg-paper-raised border border-hairline p-4 flex flex-wrap items-end gap-3 mb-6">
        <label className="flex flex-col gap-1 text-xs font-mono text-ink-muted uppercase tracking-wider">
          Case
          <select
            value={caseId}
            onChange={(event) => {
              setCaseId(event.target.value);
              setDraft(null);
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
          className="bg-ink text-paper px-4 py-2 font-mono text-xs uppercase tracking-wider disabled:opacity-50 hover:bg-brass"
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
        </article>
      )}
    </div>
  );
}
