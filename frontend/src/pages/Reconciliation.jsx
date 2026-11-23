import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import ReconciliationPanel from '../components/reconciliation/ReconciliationPanel';
import { FolderKanban, History } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import DeskPageHeader from '../components/layout/DeskPageHeader';

export default function Reconciliation() {
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [loadedFromHistory, setLoadedFromHistory] = useState(false);
  const { hash } = useLocation();

  useEffect(() => {
    if (hash !== '#voice') return undefined;
    const node = document.getElementById('voice');
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return undefined;
  }, [hash]);

  useEffect(() => {
    api.cases.list()
      .then((c) => {
        setCases(c || []);
        if (c && c.length > 0) {
          setSelectedCaseId(c[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // When selected case changes, load its latest saved reconciliation result from DB
  useEffect(() => {
    if (!selectedCaseId) {
      setSummary(null);
      setRows([]);
      setLoadedFromHistory(false);
      return;
    }

    api.reconciliation.getCaseReconciliation(selectedCaseId)
      .then((res) => {
        if (res && res.summary) {
          setSummary(res.summary);
          setRows(res.rows || []);
          setLoadedFromHistory(true);
        } else {
          setSummary(null);
          setRows([]);
          setLoadedFromHistory(false);
        }
      })
      .catch(() => {
        setLoadedFromHistory(false);
      });
  }, [selectedCaseId]);

  const handleRunReconciliation = async (invoiceFile, paymentFile) => {
    setIsRunning(true);
    setError(null);
    setLoadedFromHistory(false);

    try {
      let result;
      if (selectedCaseId) {
        // Run case-scoped reconciliation; stores in DB
        result = await api.reconciliation.reconcileCase(selectedCaseId, paymentFile, invoiceFile);
      } else {
        // Run standalone reconciliation
        result = await api.reconciliation.run(invoiceFile, paymentFile);
      }

      if (!result || result.error) {
        throw new Error(result?.error || 'Reconciliation failed.');
      }

      setSummary(result.summary);
      setRows(result.rows || []);
    } catch (err) {
      console.error("Reconciliation error:", err);
      setError(err.message || 'An unexpected error occurred while connecting to the API.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex items-start justify-between gap-6">
        <DeskPageHeader
          eyebrow="Your practice / Ledgers"
          title={hash === '#voice' ? 'Voice Desk' : 'Ledger Reconciliation'}
          subtitle="Match tax invoices with bank payments, then ask the voice desk what is still outstanding."
        />

        {/* Case selector */}
        {cases.length > 0 && (
          <div className="flex items-center gap-2 bg-paper-raised border border-hairline p-2 rounded-[2px]">
            <FolderKanban size={16} className="text-ink-muted ml-1" />
            <span className="text-xs font-mono uppercase text-ink-muted">Case:</span>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="bg-paper border border-hairline text-xs font-sans text-ink px-2 py-1 focus:outline-none focus:border-brass rounded-[2px]"
            >
              <option value="">-- Standalone Run --</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.client} ({c.scope || c.title})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loadedFromHistory && (
        <div className="mb-4 px-4 py-2 bg-paper-raised border border-hairline text-xs font-mono text-ink-muted flex items-center gap-2">
          <History size={14} className="text-brass" />
          <span>Loaded previously saved reconciliation results for this case.</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-rust/10 border border-rust/30 text-rust rounded font-sans text-sm">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      <ReconciliationPanel
        summary={summary}
        rows={rows}
        isRunning={isRunning}
        onRunReconciliation={handleRunReconciliation}
        caseId={selectedCaseId}
        onReviewed={(rowKey, status) => {
          setRows((current) => current.map((row) => (
            (row.invoice?.id || row.payment?.id) === rowKey
              ? { ...row, review_status: status }
              : row
          )));
        }}
      />
    </div>
  );
}
