import React from 'react';

export default function MetricCard({ label, value, subLabel, icon: Icon, isMonoValue = false }) {
  return (
    <div className="bg-paper-raised border border-hairline p-6 relative flex flex-col">
      {Icon && (
        <div className="absolute top-6 right-6 text-ink-muted">
          <Icon size={20} strokeWidth={1.5} />
        </div>
      )}
      <span className="text-xs uppercase tracking-widest text-ink-muted font-sans font-semibold mb-2 block">
        {label}
      </span>
      <div className={`text-3xl text-ink leading-none ${isMonoValue ? 'font-mono' : 'font-serif'}`}>
        {value}
      </div>
      {subLabel && (
        <div className="mt-4 text-sm text-ink-muted font-sans">
          {subLabel}
        </div>
      )}
    </div>
  );
}
