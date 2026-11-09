import React, { useState, useEffect } from 'react';
import { Search, LogOut } from 'lucide-react';
import { useLocation, matchPath, useNavigate } from 'react-router-dom';
import { clearToken, getUser, getFirm } from '../../lib/api';
import { api } from '../../lib/api';

const PATH_MAP = {
  '/app/dashboard': 'Case Dashboard',
  '/app/cases': 'Invoice Data Review',
  '/app/extract': 'Document Processing',
  '/app/reconcile': 'Ledger Reconciliation',
  '/app/advisory': 'Tax Advisory Chat',
  '/app/drafts': 'Client Communication',
  '/app/approve': 'Review & Approve',
  '/app/audit': 'Audit Trail',
};

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentModule = PATH_MAP[location.pathname] || 'Module';

  const user = getUser();
  const firm = getFirm();

  const displayName = user?.name || user?.email || 'Signed in';
  const firmName = firm?.name || 'TaxSaathi';

  // Build initials from user name or email
  const initials = (() => {
    if (user?.name) {
      return user.name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
    }
    if (user?.email) {
      return user.email.split('@')[0].split(/[._-]/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
    }
    return '?';
  })();

  const [healthStatus, setHealthStatus] = useState('checking'); // 'ok' | 'degraded' | 'error' | 'checking'

  useEffect(() => {
    let cancelled = false;
    const checkHealth = async () => {
      try {
        const h = await api.health();
        if (cancelled) return;
        if (h.status === 'ok') setHealthStatus('ok');
        else setHealthStatus('degraded');
      } catch {
        if (!cancelled) setHealthStatus('error');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const healthDot = healthStatus === 'ok'
    ? { color: 'bg-forest', text: 'text-forest', label: 'Engine Connected' }
    : healthStatus === 'degraded'
    ? { color: 'bg-amber-500', text: 'text-amber-600', label: 'Engine Degraded' }
    : healthStatus === 'checking'
    ? { color: 'bg-ink-muted', text: 'text-ink-muted', label: 'Checking...' }
    : { color: 'bg-rust', text: 'text-rust', label: 'Backend Unreachable' };

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  const isCaseUploadRoute = matchPath('/app/cases/:caseId/upload', location.pathname);

  if (isCaseUploadRoute) {
    return (
      <header className="h-[80px] bg-paper-raised border-b border-hairline flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-serif font-medium text-lg text-ink">{firmName}</span>
            <span className="border border-hairline px-2 py-0.5 text-[10px] font-sans text-ink uppercase tracking-widest bg-paper/50">Active Case</span>
          </div>
          <span className="text-xs font-mono text-ink-muted">Document Upload &amp; OCR</span>
        </div>
        <div className="flex flex-col items-end text-right">
          <span className="text-sm font-sans font-medium text-ink">Document Upload &amp; OCR</span>
          <span className="text-xs font-sans text-ink-muted">Secure ingestion and extraction of tax invoices and receipts.</span>
        </div>
      </header>
    );
  }

  return (
    <header className="h-[72px] bg-paper-raised border-b border-hairline flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-3">
          <span className="font-serif font-medium text-lg text-ink">{firmName}</span>
          <span className="border border-hairline px-2 py-0.5 text-[10px] font-mono text-ink uppercase tracking-widest bg-paper/50">AY 2025-26</span>
        </div>
        <span className="text-xs font-sans text-ink-muted mt-0.5">{currentModule}</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search..."
            className="pl-8 pr-3 py-1.5 bg-paper border border-hairline rounded-[2px] text-xs font-sans focus:outline-none focus:border-brass/50 w-[200px] text-ink placeholder:text-ink-muted/70"
          />
        </div>

        {/* Live health badge */}
        <div className="flex items-center gap-2 border border-hairline px-2 py-1 rounded-[2px] bg-paper/50">
          <div className={`w-1.5 h-1.5 rounded-full ${healthDot.color}`}></div>
          <span className={`text-[10px] font-mono uppercase tracking-wider ${healthDot.text}`}>{healthDot.label}</span>
        </div>

        <div className="flex items-center gap-4 pl-4 border-l border-hairline">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm border border-hairline bg-paper flex items-center justify-center text-ink font-sans font-medium text-xs">
              {initials}
            </div>
            <div className="flex flex-col">
              <span className="text-ink text-sm font-sans leading-tight">{displayName}</span>
              <span className="text-ink-muted text-[10px] font-sans">{user?.role || 'Member'}</span>
            </div>
          </div>
          <button
            id="logout-btn"
            onClick={handleLogout}
            title="Sign out"
            className="text-ink-muted hover:text-ink transition-colors ml-2"
          >
            <LogOut size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
