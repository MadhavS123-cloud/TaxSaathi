import React from 'react';
import CountUp from './CountUp';

export default function StatsStrip() {
  return (
    <section className="px-6 max-w-7xl mx-auto pb-16 md:pb-24 relative z-10">
      <div className="border-t border-hairline pt-12 flex flex-wrap gap-12 md:gap-24">
        <div className="flex flex-col gap-2">
          <div className="text-3xl md:text-4xl font-mono text-ink tracking-tight">
            <CountUp target={98} suffix="%" />
          </div>
          <div className="text-xs font-sans text-ink-muted uppercase tracking-widest">Avg Match Rate</div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-3xl md:text-4xl font-mono text-ink tracking-tight">
            <CountUp target={12400} suffix="+" />
          </div>
          <div className="text-xs font-sans text-ink-muted uppercase tracking-widest">Vouchers Reconciled</div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-3xl md:text-4xl font-mono text-ink tracking-tight">
            O(<CountUp target={1} />)
          </div>
          <div className="text-xs font-sans text-ink-muted uppercase tracking-widest">Reconciliation Engine</div>
        </div>
      </div>
    </section>
  );
}
