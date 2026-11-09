import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, FolderKanban, Plus, UserPlus, FileText, ArrowRight } from 'lucide-react';
import PrimaryButton from '../components/ui/PrimaryButton';
import SecondaryButton from '../components/ui/SecondaryButton';
import StatusTag from '../components/ui/StatusTag';
import NewCaseModal from '../components/dashboard/NewCaseModal';
import NewClientModal from '../components/dashboard/NewClientModal';
import { api } from '../lib/api';

export default function Cases() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' | 'clients'
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [casesRes, clientsRes] = await Promise.all([
        api.cases.list().catch(() => []),
        api.clients.list().catch(() => []),
      ]);
      setCases(casesRes || []);
      setClients(clientsRes || []);
    } catch (e) {
      console.error("Failed to load cases/clients:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCase = async (newCaseData) => {
    try {
      await api.cases.create(newCaseData);
      await loadData();
    } catch (e) {
      console.error("Failed to create case:", e);
    }
  };

  const handleCreateClient = async (newClientData) => {
    try {
      await api.clients.create(newClientData);
      await loadData();
    } catch (e) {
      console.error("Failed to create client:", e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif text-ink tracking-tight mb-2">Practice Registry</h2>
          <p className="text-ink-muted font-sans text-sm">
            Manage your firm's corporate clients and audit assignments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SecondaryButton onClick={() => setIsClientModalOpen(true)}>
            <UserPlus size={14} className="inline mr-1.5" /> + New Client
          </SecondaryButton>
          <PrimaryButton onClick={() => setIsCaseModalOpen(true)}>
            <Plus size={14} className="inline mr-1.5" /> + Create New Case
          </PrimaryButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-hairline mb-6">
        <button
          onClick={() => setActiveTab('cases')}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-mono uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'cases'
              ? 'border-brass text-ink font-semibold bg-paper-raised'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <FolderKanban size={14} /> Audit Cases ({cases.length})
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-mono uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'clients'
              ? 'border-brass text-ink font-semibold bg-paper-raised'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Building2 size={14} /> Clients Directory ({clients.length})
        </button>
      </div>

      {loading && (
        <div className="bg-paper-raised border border-hairline p-8 text-center text-xs font-mono text-ink-muted">
          Loading registry records…
        </div>
      )}

      {/* CASES TAB */}
      {!loading && activeTab === 'cases' && (
        <div className="space-y-4">
          {cases.length === 0 ? (
            <div className="bg-paper-raised border border-dashed border-hairline p-12 text-center">
              <FolderKanban size={32} className="mx-auto text-ink-muted mb-3" strokeWidth={1.5} />
              <p className="text-sm font-sans text-ink mb-2">No audit cases recorded yet.</p>
              <p className="text-xs font-sans text-ink-muted mb-4">Create your first engagement to begin uploading vouchers.</p>
              <PrimaryButton onClick={() => setIsCaseModalOpen(true)}>+ Create First Case</PrimaryButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {cases.map((c) => (
                <div
                  key={c.id}
                  className="bg-paper-raised border border-hairline p-5 flex items-center justify-between hover:border-brass/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-serif font-medium text-ink text-base">{c.client}</span>
                      <StatusTag status={c.status.toLowerCase()} label={c.status} />
                      {c.assessment_year && (
                        <span className="border border-hairline px-2 py-0.5 text-[10px] font-mono text-ink-muted uppercase">
                          AY {c.assessment_year}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-sans text-ink-muted flex items-center gap-4">
                      <span>Scope: {c.scope || c.title}</span>
                      {c.gstin && <span className="font-mono">GSTIN: {c.gstin}</span>}
                      <span className="font-mono text-[10px]">Updated: {c.lastUpdated}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <SecondaryButton
                      onClick={() => navigate(`/app/cases/${c.id}/upload`)}
                      className="!py-1.5 !px-3 !text-xs"
                    >
                      Open Case <ArrowRight size={12} className="inline ml-1" />
                    </SecondaryButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CLIENTS TAB */}
      {!loading && activeTab === 'clients' && (
        <div className="space-y-4">
          {clients.length === 0 ? (
            <div className="bg-paper-raised border border-dashed border-hairline p-12 text-center">
              <Building2 size={32} className="mx-auto text-ink-muted mb-3" strokeWidth={1.5} />
              <p className="text-sm font-sans text-ink mb-2">No client profiles found.</p>
              <p className="text-xs font-sans text-ink-muted mb-4">Add your corporate clients to manage tax files.</p>
              <PrimaryButton onClick={() => setIsClientModalOpen(true)}>+ Add New Client</PrimaryButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clients.map((cl) => (
                <div key={cl.id} className="bg-paper-raised border border-hairline p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-serif text-ink font-medium">{cl.legal_name}</h4>
                    <span className="text-[10px] font-mono text-ink-muted">{cl.created_at}</span>
                  </div>
                  <div className="text-xs font-mono text-ink-muted space-y-1">
                    <div>GSTIN: <span className="text-ink">{cl.gstin || '—'}</span></div>
                    <div>PAN: <span className="text-ink">{cl.pan || '—'}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <NewCaseModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        onCreateCase={handleCreateCase}
      />

      <NewClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onCreateClient={handleCreateClient}
      />
    </div>
  );
}
