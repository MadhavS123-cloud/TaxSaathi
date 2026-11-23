import React from 'react';

export default function MetricCard({ label, value, subLabel, icon: Icon, isMonoValue = false }) {
  return (
    <div className="relative flex flex-col rounded-2xl border border-hairline bg-paper-raised p-5">
      {Icon && (
        <div className="absolute right-4 top-4 text-ink-muted">
          <Icon size={16} strokeWidth={1.5} />
        </div>
      )}
      <span className="mb-3 block font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </span>
      <div className={`text-3xl leading-none text-ink ${isMonoValue ? 'font-serif' : 'font-serif'}`}>
        {value}
      </div>
      {subLabel && (
        <div className="mt-3 font-sans text-xs text-ink-muted">
          {subLabel}
        </div>
      )}
    </div>
  );
}
