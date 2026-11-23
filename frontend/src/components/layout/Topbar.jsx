import React, { useState, useEffect } from 'react';
import { Search, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearToken, getUser, getFirm, api } from '../../lib/api';

export default function Topbar() {
  const navigate = useNavigate();
  const user = getUser();
  const firm = getFirm();
  const firmName = firm?.name || 'TaxSaathi';

  const initials = (() => {
    if (user?.name) {
      return user.name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
    }
    if (user?.email) {
      return user.email.split('@')[0].split(/[._-]/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
    }
    return '?';
  })();

  const [healthStatus, setHealthStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;
    const checkHealth = async () => {
      try {
        const h = await api.health();
        if (cancelled) return;
        setHealthStatus(h.status === 'ok' ? 'ok' : 'degraded');
      } catch {
        if (!cancelled) setHealthStatus('error');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const health = healthStatus === 'ok'
    ? { color: 'bg-[#3D8F5A]', label: 'Engine online' }
    : healthStatus === 'degraded'
      ? { color: 'bg-amber-flag', label: 'Engine degraded' }
      : healthStatus === 'checking'
        ? { color: 'bg-ink-muted', label: 'Checking' }
        : { color: 'bg-rust', label: 'Engine offline' };

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between bg-[#F4F1EA]/90 px-8 backdrop-blur-sm">
      <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-ink">
        {firmName}
        <span className="text-ink-muted"> / Workspace</span>
      </p>

      <div className="flex items-center gap-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ink-muted" title="Search lives on each page">
          <Search size={15} strokeWidth={1.5} />
        </span>
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${health.color}`} />
          <span className="font-sans text-xs text-ink">{health.label}</span>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1C1915] font-sans text-xs text-[#F4F1EA]" title={user?.name || user?.email || 'Signed in'}>
          {initials}
        </div>
        <button
          id="logout-btn"
          type="button"
          onClick={handleLogout}
          title="Sign out"
          data-cursor="interactive"
          className="text-ink-muted transition-colors hover:text-ink"
        >
          <LogOut size={16} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
