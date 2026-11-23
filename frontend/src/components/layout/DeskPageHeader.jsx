import React from 'react';

export default function DeskPageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div>
        {eyebrow && (
          <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted">{eyebrow}</p>
        )}
        <h2 className="font-serif text-4xl font-medium tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-ink-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
