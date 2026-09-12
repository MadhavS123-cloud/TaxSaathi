import React from 'react';
import { LayoutGrid, List, CheckCircle, AlertCircle, Clock, Users, Search, ChevronDown, Calendar } from 'lucide-react';
import MetricCard from '../components/ui/MetricCard';
import DataTable from '../components/ui/DataTable';
import StatusTag from '../components/ui/StatusTag';
import PrimaryButton from '../components/ui/PrimaryButton';
import SecondaryButton from '../components/ui/SecondaryButton';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import { MOCK_CASES, MOCK_ACTIVITY } from '../data/mockCases';

const COLUMNS = [
  { 
    header: 'Client / Scope', 
    cell: (row) => (
      <div className="flex flex-col gap-1">
        <span className="font-sans font-medium text-ink">{row.client}</span>
        <span className="font-sans text-xs text-ink-muted">{row.scope}</span>
      </div>
    )
  },
  { 
    header: 'Status', 
    cell: (row) => <StatusTag status={row.status} label={row.status} /> 
  },
  { 
    header: 'Last Updated', 
    accessor: 'lastUpdated', 
    type: 'mono' 
  },
  {
    header: 'Reconciliation',
    cell: (row) => (
      <div className="flex items-center gap-3 text-xs font-mono">
        <span className="text-forest flex items-center gap-1" title="Matched"><CheckCircle size={10} /> {row.reconciliation.matched}</span>
        <span className="text-rust flex items-center gap-1" title="Exceptions"><AlertCircle size={10} /> {row.reconciliation.exception}</span>
        <span className="text-amber-flag flex items-center gap-1" title="Pending"><Clock size={10} /> {row.reconciliation.pending}</span>
      </div>
    )
  },
  {
    header: 'Action',
    align: 'right',
    cell: () => <SecondaryButton className="!py-1.5 !px-3 !text-xs">Open</SecondaryButton>
  }
];

export default function DashboardPage() {
  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-8 pb-12">
      
      {/* 1. Page Header Row */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-3xl font-serif text-ink tracking-tight">Audit Engagements</h2>
            <span className="border border-hairline px-2 py-0.5 text-xs font-mono text-ink-muted uppercase tracking-widest bg-paper-raised">
              FY 2024-25 Pipeline
            </span>
          </div>
          <p className="text-ink-muted font-sans text-sm">
            Overview of all active audit assignments, ledger reconciliations, and compliance tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SecondaryButton>Preview mode toggle</SecondaryButton>
          <SecondaryButton>Empty state toggle</SecondaryButton>
          <PrimaryButton>+ New Client Case</PrimaryButton>
        </div>
      </div>

      {/* 2. Metrics Row */}
      <div className="relative">
        <div className="absolute -top-7 right-0 text-xs font-mono text-ink-muted">
          Overall Match Ratio: <span className="text-ink font-medium">87.1%</span>
        </div>
        <div className="grid grid-cols-4 gap-6">
          <MetricCard 
            label="Matched Entries" 
            value="84,192" 
            isMonoValue={true}
            icon={CheckCircle} 
            subLabel="verified"
          />
          <MetricCard 
            label="Unmatched Variances" 
            value="104" 
            isMonoValue={true}
            icon={AlertCircle} 
            subLabel="exceptions"
          />
          <MetricCard 
            label="Timing Variances" 
            value="496" 
            isMonoValue={true}
            icon={Clock} 
            subLabel="in transit"
          />
          <MetricCard 
            label="Active Engagements" 
            value="12" 
            isMonoValue={true}
            icon={Users} 
            subLabel="clients"
          />
        </div>
      </div>

      {/* 3. Filter/Search Row */}
      <div className="flex items-center justify-between bg-paper-raised border border-hairline p-2">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
            <input 
              type="text" 
              placeholder="Search by legal entity name, GSTIN, or PAN..." 
              className="w-full pl-9 pr-4 py-2 bg-paper border border-hairline rounded-[2px] text-xs font-sans focus:outline-none focus:border-brass w-full text-ink placeholder:text-ink-muted"
            />
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-paper border border-hairline rounded-[2px] text-xs font-sans text-ink hover:border-brass/50 transition-colors">
            Status: All <ChevronDown size={14} className="text-ink-muted" />
          </button>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-paper border border-hairline rounded-[2px] text-xs font-sans text-ink hover:border-brass/50 transition-colors">
            <Calendar size={14} className="text-ink-muted" /> Last 30 Days <ChevronDown size={14} className="text-ink-muted" />
          </button>
        </div>

        <div className="flex items-center gap-1 border-l border-hairline pl-4">
          <button className="p-2 bg-ink text-paper rounded-[2px]">
            <List size={16} strokeWidth={1.5} />
          </button>
          <button className="p-2 text-ink-muted hover:bg-paper rounded-[2px] border border-transparent hover:border-hairline transition-all">
            <LayoutGrid size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* 4. Two-column split */}
      <div className="flex gap-6 items-start">
        <div className="w-[70%] bg-paper-raised border border-hairline p-6">
          <div className="flex items-center justify-between mb-6 border-b border-hairline pb-4">
            <h3 className="font-serif text-lg text-ink">Client Cases</h3>
            <span className="text-xs font-mono text-ink-muted">{MOCK_CASES.length} records</span>
          </div>
          <DataTable columns={COLUMNS} data={MOCK_CASES} />
        </div>
        
        <div className="w-[30%] sticky top-[96px]">
          <ActivityFeed activities={MOCK_ACTIVITY} />
        </div>
      </div>

    </div>
  );
}
