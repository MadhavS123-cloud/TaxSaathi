import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, List, CheckCircle, AlertCircle, Clock, Users, Search, ChevronDown, Calendar, Trash2, UserPlus } from 'lucide-react';
import MetricCard from '../components/ui/MetricCard';
import DataTable from '../components/ui/DataTable';
import StatusTag from '../components/ui/StatusTag';
import PrimaryButton from '../components/ui/PrimaryButton';
import SecondaryButton from '../components/ui/SecondaryButton';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import NewCaseModal from '../components/dashboard/NewCaseModal';
import NewClientModal from '../components/dashboard/NewClientModal';
import { api } from '../lib/api';

export default function DashboardPage() {
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState({
    active_engagements: 0,
    matched: 0,
    unmatched: 0,
    pending: 0,
    total_documents: 0,
  });

  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [casesRes, activitiesRes, summaryRes] = await Promise.all([
        api.cases.list().catch(() => []),
        api.activities.list().catch(() => []),
        api.dashboard.summary().catch(() => null),
      ]);
      setCases(casesRes || []);
      setActivities(activitiesRes || []);
      if (summaryRes) {
        setSummary(summaryRes);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateCase = async (newCaseData) => {
    try {
      await api.cases.create({
        client: newCaseData.client,
        scope: newCaseData.scope,
        title: newCaseData.title,
        gstin: newCaseData.gstin,
        pan: newCaseData.pan,
        assessment_year: newCaseData.assessment_year,
        status: newCaseData.status,
      });
      await fetchDashboardData();
    } catch (e) {
      console.error("Failed to create case:", e);
    }
  };

  const handleCreateClient = async (newClientData) => {
    try {
      await api.clients.create(newClientData);
      await fetchDashboardData();
    } catch (e) {
      console.error("Failed to create client:", e);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.cases.deleteAll();
      setCases([]);
      setActivities([]);
      await fetchDashboardData();
    } catch (e) {
      console.error("Failed to clear cases:", e);
    }
  };

  // Filtered cases
  const filteredCases = cases.filter((c) => {
    const clientName = c.client || '';
    const scopeStr = c.scope || c.title || '';
    const gstinStr = c.gstin || '';

    const matchesSearch =
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scopeStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gstinStr.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || c.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalEntries = (summary.matched || 0) + (summary.unmatched || 0) + (summary.pending || 0);
  const matchRatio = totalEntries > 0
    ? (((summary.matched || 0) / totalEntries) * 100).toFixed(1)
    : '0.0';

  const COLUMNS = [
    {
      header: 'Client / Scope',
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <span className="font-sans font-medium text-ink">{row.client}</span>
          <span className="font-sans text-xs text-ink-muted flex items-center gap-2">
            {row.scope || row.title}
            {row.gstin && (
              <span className="text-[9px] font-mono border border-hairline px-1 py-0.2 bg-paper/60 uppercase">
                {row.gstin}
              </span>
            )}
            {row.assessment_year && (
              <span className="text-[9px] font-mono border border-hairline px-1 py-0.2 bg-paper-raised text-ink-muted">
                AY {row.assessment_year}
              </span>
            )}
          </span>
        </div>
      )
    },
    {
      header: 'Status',
      cell: (row) => <StatusTag status={row.status.toLowerCase()} label={row.status} />
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
          <span className="text-forest flex items-center gap-1" title="Matched">
            <CheckCircle size={10} /> {row.reconciliation?.matched || 0}
          </span>
          <span className="text-rust flex items-center gap-1" title="Exceptions">
            <AlertCircle size={10} /> {row.reconciliation?.exception || 0}
          </span>
          <span className="text-amber-flag flex items-center gap-1" title="Pending">
            <Clock size={10} /> {row.reconciliation?.pending || 0}
          </span>
        </div>
      )
    },
    {
      header: 'Action',
      align: 'right',
      cell: (row) => (
        <SecondaryButton
          onClick={() => navigate(`/app/cases/${row.id}/upload`)}
          className="!py-1.5 !px-3 !text-xs hover:border-brass"
        >
          Open Case
        </SecondaryButton>
      )
    }
  ];

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
          {cases.length > 0 && (
            <SecondaryButton onClick={handleClearAll} title="Clear all active cases">
              <Trash2 size={14} className="inline mr-1.5 text-rust" /> Clear All
            </SecondaryButton>
          )}
          <SecondaryButton onClick={() => setIsClientModalOpen(true)}>
            <UserPlus size={14} className="inline mr-1.5 text-ink-muted" /> + New Client
          </SecondaryButton>
          <PrimaryButton onClick={() => setIsCaseModalOpen(true)}>
            + Create New Case
          </PrimaryButton>
        </div>
      </div>

      {/* 2. Metrics Row computed from DB summary */}
      <div className="relative">
        <div className="absolute -top-7 right-0 text-xs font-mono text-ink-muted">
          Overall Match Ratio: <span className="text-ink font-medium">{matchRatio}%</span>
        </div>
        <div className="grid grid-cols-4 gap-6">
          <MetricCard
            label="Matched Entries"
            value={summary.matched.toLocaleString()}
            isMonoValue={true}
            icon={CheckCircle}
            subLabel="verified"
          />
          <MetricCard
            label="Unmatched Variances"
            value={summary.unmatched.toLocaleString()}
            isMonoValue={true}
            icon={AlertCircle}
            subLabel="exceptions"
          />
          <MetricCard
            label="Timing Variances"
            value={summary.pending.toLocaleString()}
            isMonoValue={true}
            icon={Clock}
            subLabel="in transit"
          />
          <MetricCard
            label="Active Engagements"
            value={(summary.active_engagements || cases.length).toString()}
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-paper border border-hairline rounded-[2px] text-xs font-sans focus:outline-none focus:border-brass text-ink placeholder:text-ink-muted"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-paper border border-hairline rounded-[2px] text-xs font-sans text-ink hover:border-brass/50 transition-colors uppercase font-mono"
            >
              Status: {statusFilter} <ChevronDown size={14} className="text-ink-muted" />
            </button>

            {isStatusMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-paper-raised border border-hairline shadow-lg z-20 py-1 rounded-[2px]">
                {['ALL', 'MATCHED', 'PENDING', 'EXCEPTION'].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      setIsStatusMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
                      statusFilter === st ? 'bg-brass/10 text-brass font-medium' : 'text-ink hover:bg-paper'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
          </div>

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
            <span className="text-xs font-mono text-ink-muted">{filteredCases.length} records</span>
          </div>
          {filteredCases.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-hairline bg-paper/50 rounded-[2px]">
              <p className="text-sm font-sans text-ink-muted mb-3">No active client cases. Click below to add your first client case.</p>
              <div className="flex justify-center gap-3">
                <SecondaryButton onClick={() => setIsClientModalOpen(true)}>+ New Client</SecondaryButton>
                <PrimaryButton onClick={() => setIsCaseModalOpen(true)}>+ Create New Case</PrimaryButton>
              </div>
            </div>
          ) : (
            <DataTable columns={COLUMNS} data={filteredCases} />
          )}
        </div>

        <div className="w-[30%] sticky top-[96px]">
          <ActivityFeed activities={activities} />
        </div>
      </div>

      {/* New Case Modal */}
      <NewCaseModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        onCreateCase={handleCreateCase}
      />

      {/* New Client Modal */}
      <NewClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onCreateClient={handleCreateClient}
      />

    </div>
  );
}
