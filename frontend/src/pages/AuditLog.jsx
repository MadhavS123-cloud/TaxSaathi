import React from 'react';
import DataTable from '../components/ui/DataTable';

const AUDIT_LOG = [
  { timestamp: '2024-10-15 09:23', user: 'J. Doe', action: 'Created Case CAS-2024-091' },
  { timestamp: '2024-10-15 09:45', user: 'System', action: 'Auto-reconciliation started' },
  { timestamp: '2024-10-15 10:12', user: 'S. Smith', action: 'Flagged exception on Invoice #10293' },
];

const COLUMNS = [
  { header: 'Timestamp', accessor: 'timestamp', type: 'mono' },
  { header: 'User', accessor: 'user', type: 'text' },
  { header: 'Action', accessor: 'action', type: 'text' },
];

export default function AuditLog() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-3xl font-serif text-ink tracking-tight mb-2">Audit Log</h2>
      <p className="text-ink-muted font-sans text-sm mb-6">Immutable record of system and user actions.</p>
      
      <div className="bg-paper-raised border border-hairline p-6">
        <DataTable columns={COLUMNS} data={AUDIT_LOG} />
      </div>
    </div>
  );
}
