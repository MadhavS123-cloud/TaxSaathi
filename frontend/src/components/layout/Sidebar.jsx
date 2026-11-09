import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileSearch,
  Scale,
  MessageSquare,
  Users,
  CheckSquare,
  History
} from 'lucide-react';
import { getUser } from '../../lib/api';

const NAV_ITEMS = [
  { path: '/app/dashboard', label: 'Case Dashboard', icon: LayoutDashboard },
  { path: '/app/extract', label: 'Document Upload & OCR', icon: UploadCloud },
  { path: '/app/cases', label: 'Invoice Data Review', icon: FileSearch },
  { path: '/app/reconcile', label: 'Ledger Reconciliation', icon: Scale },
  { path: '/app/advisory', label: 'Tax Advisory Chat', icon: MessageSquare },
  { path: '/app/drafts', label: 'Client Communication', icon: Users },
  { path: '/app/approve', label: 'Review & Approve', icon: CheckSquare },
  { path: '/app/audit', label: 'Audit Trail', icon: History },
];

export default function Sidebar() {
  const user = getUser();
  const displayName = user?.name || 'Signed in';
  const displayEmail = user?.email || '';
  const initials = (() => {
    if (user?.name) {
      return user.name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
    }
    if (user?.email) {
      return user.email.split('@')[0].slice(0, 2).toUpperCase();
    }
    return 'CA';
  })();

  return (
    <aside className="w-[240px] h-screen bg-taupe border-r border-hairline flex flex-col fixed left-0 top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-ink text-paper flex items-center justify-center font-serif font-bold text-lg rounded-[2px]">
          CA
        </div>
        <h1 className="text-ink font-serif text-lg tracking-wide">TaxSaathi</h1>
      </div>

      <nav className="flex-1 mt-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            data-cursor="interactive"
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-2.5 text-sm font-sans transition-all border-l-2 ${
                isActive
                  ? 'border-brass text-ink bg-[rgba(169,129,46,0.06)]'
                  : 'border-transparent text-ink-muted hover:text-ink hover:bg-paper'
              }`
            }
          >
            <item.icon size={18} strokeWidth={1.5} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 mt-auto flex flex-col gap-4 border-t border-hairline">
        <div className="border border-hairline p-3 bg-paper">
          <div className="text-[10px] uppercase font-serif text-ink-muted tracking-widest mb-1">Active Context</div>
          <div className="text-xs font-mono text-ink">Statutory Audit Dossier</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-brass flex items-center justify-center text-ink font-sans font-medium text-sm">
            {initials}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-ink text-sm font-sans truncate">{displayName}</span>
            <span className="text-ink-muted text-[10px] font-sans truncate">{displayEmail}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
