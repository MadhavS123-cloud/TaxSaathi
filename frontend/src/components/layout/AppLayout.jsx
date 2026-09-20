import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BrandWatermark from '../ui/BrandWatermark';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-paper flex relative overflow-hidden z-0">
      <BrandWatermark opacity={0.03} position="bottom-right" />
      <Sidebar />
      <div className="flex-1 ml-[240px] flex flex-col z-10 relative">
        <Topbar />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
