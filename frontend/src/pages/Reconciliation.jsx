import React from 'react';
import ReconciliationPanel from '../components/reconciliation/ReconciliationPanel';

export default function Reconciliation() {
  return (
    <div className="max-w-6xl mx-auto pb-12">
      <h2 className="text-3xl font-serif text-ink tracking-tight mb-6">Reconciliation</h2>
      <ReconciliationPanel />
    </div>
  );
}
