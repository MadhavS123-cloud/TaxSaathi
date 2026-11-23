import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Clock, Users, Search, ChevronDown, Trash2, UserPlus, Plus } from 'lucide-react';
import MetricCard from '../components/ui/MetricCard';
import PrimaryButton from '../components/ui/PrimaryButton';
import DeskPageHeader from '../components/layout/DeskPageHeader';
import NewCaseModal from '../components/dashboard/NewCaseModal';
import NewClientModal from '../components/dashboard/NewClientModal';
import { api } from '../lib/api';

function engagementPill(status) {
  const value = (status || '').toLowerCase();
  if (value === 'matched') return { label: 'Matched', className: 'bg-[#E7F3EA] text-[#2F6B45]' };
  if (value === 'exception') return { label: 'Action needed', className: 'bg-[#F8E8D8] text-[#9A6230]' };
  if (value === 'pending') return { label: 'In progress', className: 'bg-[#F3EFE6] text-[#6B655C]' };
  return { label: status || 'In review', className: 'bg-[#F3EFE6] text-[#6B655C]' };
}

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
  const [clearError, setClearError] = useState('');

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
    await api.clients.create(newClientData);
    navigate('/app/cases?tab=clients');
  };

  const handleClearAll = async () => {
    setClearError('');
    try {
      await api.cases.deleteAll();
      setCases([]);
      setActivities([]);
      await fetchDashboardData();
    } catch (e) {
      setClearError(e.message || 'Could not clear the cases.');
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

  const attention = filteredCases.find((row) => (row.reconciliation?.exception || 0) > 0) || null;
  const latestActivity = activities[0];

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-8 pb-4">
      <DeskPageHeader
        eyebrow="Your practice / Overview"
        title="Case Dashboard"
        subtitle="A clear view of your audit engagements."
      >
        {cases.length > 0 && (
          <button type="button" onClick={handleClearAll} className="font-sans text-xs text-ink-muted hover:text-rust" data-cursor="interactive">
            <Trash2 size={13} className="mr-1 inline" /> Clear all
          </button>
        )}
        <button type="button" onClick={() => setIsClientModalOpen(true)} className="font-sans text-xs text-ink-muted hover:text-ink" data-cursor="interactive">
          <UserPlus size={13} className="mr-1 inline" /> New client
        </button>
        <PrimaryButton onClick={() => setIsCaseModalOpen(true)}>
          <Plus size={14} className="mr-1.5 inline" /> New engagement
        </PrimaryButton>
      </DeskPageHeader>
      {clearError && <p className="-mt-4 font-sans text-sm text-rust">{clearError}</p>}

      {/* 2. Metrics Row computed from DB summary */}
      <div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Matched"
            value={summary.matched.toLocaleString()}
            isMonoValue={true}
            icon={CheckCircle}
            subLabel="Across all engagements"
          />
          <MetricCard
            label="Unmatched"
            value={summary.unmatched.toLocaleString()}
            isMonoValue={true}
            icon={AlertCircle}
            subLabel="Items need attention"
          />
          <MetricCard
            label="Timing variances"
            value={summary.pending.toLocaleString()}
            isMonoValue={true}
            icon={Clock}
            subLabel="Review recommended"
          />
          <MetricCard
            label="Active engagements"
            value={(summary.active_engagements || cases.length).toString()}
            isMonoValue={true}
            icon={Users}
            subLabel="Open cases"
          />
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-2xl border border-hairline bg-paper-raised p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="font-serif text-xl text-ink">Recent engagements</h3>
              <p className="mt-1 font-sans text-xs text-ink-muted">Track progress across your active cases.</p>
            </div>
            <button type="button" onClick={() => navigate('/app/cases')} className="font-sans text-xs text-brass-deep" data-cursor="interactive">
              View all
            </button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search client, GSTIN, or scope"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-cursor="text"
                className="w-full rounded-full border border-hairline bg-paper py-2 pl-9 pr-4 font-sans text-xs text-ink placeholder:text-ink-muted focus:border-brass focus:outline-none"
              />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                data-cursor="interactive"
                className="flex items-center gap-2 rounded-full border border-hairline bg-paper px-4 py-2 font-sans text-xs text-ink"
              >
                {statusFilter === 'ALL' ? 'All statuses' : statusFilter} <ChevronDown size={14} className="text-ink-muted" />
              </button>
              {isStatusMenuOpen && (
                <div className="absolute right-0 z-20 mt-1 w-36 rounded-xl border border-hairline bg-paper-raised py-1">
                  {['ALL', 'MATCHED', 'PENDING', 'EXCEPTION'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => { setStatusFilter(st); setIsStatusMenuOpen(false); }}
                      className={`w-full px-3 py-1.5 text-left font-sans text-xs ${statusFilter === st ? 'text-brass-deep' : 'text-ink'}`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {filteredCases.length === 0 ? (
            <div className="rounded-xl border border-dashed border-hairline px-6 py-12 text-center">
              <p className="font-sans text-sm text-ink-muted">No engagements yet. Start with a new client or a new engagement.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-hairline font-sans text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  <th className="pb-3 font-medium">Client / engagement</th>
                  <th className="pb-3 font-medium">Period</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((row) => {
                  const pill = engagementPill(row.status);
                  return (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/app/cases/${row.id}/upload`)}
                      data-cursor="interactive"
                      className="cursor-pointer border-b border-hairline/70 last:border-0"
                    >
                      <td className="py-4">
                        <div className="font-sans text-sm text-ink">{row.client}</div>
                        <div className="mt-0.5 font-sans text-xs text-ink-muted">{row.scope || row.title}</div>
                      </td>
                      <td className="py-4 font-sans text-sm text-ink-muted">
                        {row.assessment_year ? `AY ${row.assessment_year}` : row.lastUpdated || '—'}
                      </td>
                      <td className="py-4">
                        <span className={`rounded-full px-2.5 py-1 font-sans text-xs ${pill.className}`}>{pill.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <aside className="rounded-2xl bg-[#1C1915] p-6 text-[#F4F1EA]">
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#C6A15B]">Reconciliation</p>
          <h3 className="mt-3 font-serif text-2xl">A clearer picture</h3>
          <p className="mt-6 font-serif text-5xl text-[#C6A15B]">{matchRatio}%</p>
          <p className="mt-3 font-sans text-xs leading-relaxed text-[#C9C2B4]">
            of records matched across your active engagements.
          </p>
          <div className="mt-8 border-t border-white/10 pt-5">
            <p className="font-sans text-sm text-[#F4F1EA]">Needs attention</p>
            <p className="mt-1 font-sans text-xs text-[#C9C2B4]">
              {summary.unmatched > 0
                ? `${summary.unmatched} item${summary.unmatched === 1 ? '' : 's'} waiting for your review.`
                : 'Nothing is waiting for review.'}
            </p>
            {(attention || latestActivity) && (
              <p className="mt-3 font-sans text-xs text-[#C6A15B]">
                {attention
                  ? `${attention.client} · ${attention.reconciliation?.exception || 0} unmatched`
                  : latestActivity.description || latestActivity.type}
              </p>
            )}
          </div>
        </aside>
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
