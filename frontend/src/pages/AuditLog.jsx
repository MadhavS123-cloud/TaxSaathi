import React, { useEffect, useState } from 'react';
import DataTable from '../components/ui/DataTable';
import { api } from '../lib/api';
import DeskPageHeader from '../components/layout/DeskPageHeader';

const COLUMNS = [
  { header: 'Timestamp', accessor: 'timestamp', type: 'mono' },
  { header: 'Client', accessor: 'client', type: 'text' },
  { header: 'Type', accessor: 'type', type: 'mono' },
  { header: 'Action', accessor: 'description', type: 'text' },
];

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.activities.list();
      setRows(
        (data || []).map((row) => ({
          ...row,
          client: row.client || '—',
          type: row.type || '—',
          description: row.description || '—',
          timestamp: row.timestamp || '—',
        }))
      );
    } catch (err) {
      setError(err.message || 'Could not load the activity log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <DeskPageHeader
        eyebrow="Your practice / History"
        title="Audit Trail"
        subtitle="Recent actions stored for this firm."
      >
        <button
          type="button"
          onClick={load}
          className="text-xs font-mono text-ink-muted hover:text-ink border border-hairline px-3 py-1.5"
        >
          Refresh
        </button>
      </DeskPageHeader>

      {loading && (
        <div className="bg-paper-raised border border-hairline p-8 text-center">
          <p className="text-ink-muted font-mono text-xs animate-pulse">Loading activity…</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rust/10 border border-rust/30 text-rust text-sm font-sans">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-paper-raised border border-hairline p-6">
          <DataTable columns={COLUMNS} data={rows} />
        </div>
      )}
    </div>
  );
}
