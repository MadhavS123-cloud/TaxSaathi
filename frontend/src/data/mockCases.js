export const MOCK_CASES = [
  {
    id: 'CAS-2024-001',
    client: 'Reliance Industries Ltd.',
    scope: 'Statutory Audit FY24',
    status: 'matched',
    lastUpdated: '2024-10-15 10:23',
    reconciliation: {
      matched: 14502,
      exception: 12,
      pending: 0,
    }
  },
  {
    id: 'CAS-2024-002',
    client: 'Tata Consultancy Services',
    scope: 'GST Reconciliation Q2',
    status: 'pending',
    lastUpdated: '2024-10-14 16:45',
    reconciliation: {
      matched: 8934,
      exception: 0,
      pending: 450,
    }
  },
  {
    id: 'CAS-2024-003',
    client: 'Infosys Limited',
    scope: 'ITR Filing AY25',
    status: 'exception',
    lastUpdated: '2024-10-15 09:12',
    reconciliation: {
      matched: 2310,
      exception: 89,
      pending: 12,
    }
  },
  {
    id: 'CAS-2024-004',
    client: 'HDFC Bank Ltd.',
    scope: 'Concurrent Audit Oct',
    status: 'matched',
    lastUpdated: '2024-10-13 11:30',
    reconciliation: {
      matched: 45091,
      exception: 3,
      pending: 0,
    }
  },
  {
    id: 'CAS-2024-005',
    client: 'Larsen & Toubro',
    scope: 'Transfer Pricing Report',
    status: 'pending',
    lastUpdated: '2024-10-15 08:00',
    reconciliation: {
      matched: 1204,
      exception: 0,
      pending: 34,
    }
  }
];

export const MOCK_ACTIVITY = [
  { id: 1, type: 'upload', client: 'Reliance Industries Ltd.', description: 'Uploaded 450 invoice PDFs', timestamp: '12m ago' },
  { id: 2, type: 'exception', client: 'Infosys Limited', description: 'Flagged variance in Ledger vs 26AS', timestamp: '1h ago' },
  { id: 3, type: 'match', client: 'HDFC Bank Ltd.', description: 'Auto-reconciled 4,500 entries', timestamp: '2h ago' },
  { id: 4, type: 'message', client: 'Tata Consultancy Services', description: 'Client replied to query on ITC', timestamp: '3h ago' },
  { id: 5, type: 'report', client: 'Larsen & Toubro', description: 'Draft audit report generated', timestamp: '5h ago' },
];
