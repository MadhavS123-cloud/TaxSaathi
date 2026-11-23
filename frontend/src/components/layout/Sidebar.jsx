import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileSearch,
  Scale,
  Mic,
  MessageSquare,
  Users,
  CheckSquare,
  History,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/app/dashboard', label: 'Case Dashboard', icon: LayoutDashboard },
  { path: '/app/extract', label: 'Document Upload & OCR', icon: UploadCloud },
  { path: '/app/cases', label: 'Invoice Data Review', icon: FileSearch },
  { path: '/app/reconcile', label: 'Ledger Reconciliation', icon: Scale },
  { path: '/app/reconcile#voice', label: 'Voice Desk', icon: Mic, voice: true },
  { path: '/app/advisory', label: 'Tax Advisory Chat', icon: MessageSquare },
  { path: '/app/drafts', label: 'Client Communication', icon: Users },
  { path: '/app/approve', label: 'Review & Approve', icon: CheckSquare },
  { path: '/app/audit', label: 'Audit Trail', icon: History },
];

function navIsActive(item, pathname, hash) {
  if (item.voice) return pathname === '/app/reconcile' && hash === '#voice';
  if (item.path === '/app/reconcile') return pathname === '/app/reconcile' && hash !== '#voice';
  if (item.path === '/app/extract') return pathname === '/app/extract' || pathname.includes('/upload');
  if (item.path === '/app/cases') return pathname === '/app/cases' || pathname.includes('/invoices/');
  return pathname === item.path;
}

export default function Sidebar() {
  const { pathname, hash } = useLocation();

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-[248px] flex-col bg-[#141311] text-[#F4F1EA]">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C6A15B] font-serif text-lg text-[#1C1915]">
          T
        </div>
        <div>
          <h1 className="font-serif text-lg leading-none tracking-wide">TaxSaathi</h1>
          <p className="mt-1 font-sans text-[9px] uppercase tracking-[0.18em] text-[#9C968A]">Your audit companion</p>
        </div>
      </div>

      <p className="px-5 pb-2 font-sans text-[10px] uppercase tracking-[0.2em] text-[#6F6A62]">Workspace</p>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const active = navIsActive(item, pathname, hash);
          return (
            <Link
              key={item.label}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              data-cursor="interactive"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-[13px] transition-colors ${
                active
                  ? 'bg-[#2A261C] text-[#F4F1EA]'
                  : 'text-[#A39E94] hover:bg-[#1E1C18] hover:text-[#F4F1EA]'
              }`}
            >
              <item.icon size={16} strokeWidth={1.5} className={active ? 'text-[#C6A15B]' : ''} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-6">
        <p className="font-serif text-lg text-[#F4F1EA]">Built for clarity.</p>
        <p className="mt-1 font-sans text-xs leading-relaxed text-[#9C968A]">
          A calmer way to bring every audit together.
        </p>
        <p className="mt-5 font-sans text-[10px] uppercase tracking-[0.18em] text-[#6F6A62]">TaxSaathi / 2026</p>
      </div>
    </aside>
  );
}
