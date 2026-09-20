import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-paper pb-8 pt-16 px-6 relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-ink text-paper flex items-center justify-center font-serif font-bold text-sm rounded-sm">
              TS
            </div>
            <span className="text-ink font-serif tracking-wide">CA Tax Copilot</span>
          </div>
          <p className="text-sm font-sans text-ink-muted max-w-[200px]">
            The intelligent workspace for modern tax professionals.
          </p>
        </div>

        <div className="flex gap-16 md:gap-24">
          <div className="flex flex-col gap-4">
            <span className="text-xs font-mono uppercase tracking-widest text-ink font-bold">Product</span>
            <a href="#" className="text-sm font-sans text-ink-muted hover:text-ink transition-colors">Features</a>
            <a href="#" className="text-sm font-sans text-ink-muted hover:text-ink transition-colors">Pricing</a>
            <a href="#" className="text-sm font-sans text-ink-muted hover:text-ink transition-colors">Security</a>
          </div>
          <div className="flex flex-col gap-4">
            <span className="text-xs font-mono uppercase tracking-widest text-ink font-bold">Company</span>
            <a href="#" className="text-sm font-sans text-ink-muted hover:text-ink transition-colors">About</a>
            <a href="#" className="text-sm font-sans text-ink-muted hover:text-ink transition-colors">Contact</a>
            <a href="#" className="text-sm font-sans text-ink-muted hover:text-ink transition-colors">Careers</a>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-hairline flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="text-xs font-mono text-ink-muted">
          &copy; {new Date().getFullYear()} Boutique & Partners LLP. All rights reserved.
        </span>
        <div className="flex gap-16 md:gap-24">
          <div className="flex flex-col">
            <a href="#" className="text-xs font-sans text-ink-muted hover:text-ink transition-colors whitespace-nowrap">Privacy Policy</a>
          </div>
          <div className="flex flex-col">
            <a href="#" className="text-xs font-sans text-ink-muted hover:text-ink transition-colors whitespace-nowrap">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
