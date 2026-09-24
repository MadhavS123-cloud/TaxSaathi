import React, { useState } from 'react';
import ReconciliationPanel from '../components/reconciliation/ReconciliationPanel';

export default function Reconciliation() {
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const handleRunReconciliation = async (invoiceFile, paymentFile) => {
    setIsRunning(true);
    setError(null);
    setSummary(null);
    setRows([]);

    const formData = new FormData();
    formData.append('invoice_file', invoiceFile);
    formData.append('payment_file', paymentFile);

    try {
      const response = await fetch('http://127.0.0.1:8000/reconciliation/run', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Reconciliation failed on the server.');
      }

      const data = await response.json();
      setSummary(data.summary);
      setRows(data.rows);
    } catch (err) {
      console.error("Reconciliation error:", err);
      setError(err.message || 'An unexpected error occurred while connecting to the API.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <h2 className="text-3xl font-serif text-ink tracking-tight mb-2">Reconciliation</h2>
      <p className="text-ink-muted mb-6">Match your extracted invoices with bank statements to spot discrepancies.</p>
      
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
      />
    </div>
  );
}
