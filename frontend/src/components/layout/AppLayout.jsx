import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  useEffect(() => {
    const root = document.documentElement;
    const previousRoot = root.style.backgroundColor;
    const previousBody = document.body.style.backgroundColor;
    const previousColor = document.body.style.color;
    root.style.backgroundColor = '#F4F1EA';
    document.body.style.backgroundColor = '#F4F1EA';
    document.body.style.color = '#1C1915';
    return () => {
      root.style.backgroundColor = previousRoot;
      document.body.style.backgroundColor = previousBody;
      document.body.style.color = previousColor;
    };
  }, []);

  return (
    <div className="desk relative z-0 flex min-h-screen bg-paper text-ink">
      <Sidebar />
      <div className="ml-[248px] flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex flex-1 flex-col px-8 pb-6 pt-8">
          <div className="flex-1">
            <Outlet />
          </div>
          <footer className="mt-10 flex items-center justify-between font-sans text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            <span>Your work, thoughtfully organised.</span>
            <span>Secure by design</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
