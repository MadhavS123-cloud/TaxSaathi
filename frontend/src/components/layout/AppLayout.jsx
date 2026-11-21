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
    root.style.backgroundColor = '#0C0C0C';
    document.body.style.backgroundColor = '#0C0C0C';
    document.body.style.color = '#F3EDE2';
    return () => {
      root.style.backgroundColor = previousRoot;
      document.body.style.backgroundColor = previousBody;
      document.body.style.color = previousColor;
    };
  }, []);

  return (
    <div className="desk relative z-0 flex min-h-screen overflow-hidden bg-paper">
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse at 12% 0%, rgba(201,169,110,0.07), transparent 40%)' }}
      />
      <Sidebar />
      <div className="relative z-10 ml-[240px] flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
