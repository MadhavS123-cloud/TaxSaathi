import React from 'react';

const VARIANTS = {
  matched: {
    border: 'border-forest/30',
    bg: 'bg-forest/5',
    text: 'text-forest',
  },
  exception: {
    border: 'border-rust/30',
    bg: 'bg-rust/5',
    text: 'text-rust',
  },
  pending: {
    border: 'border-amber-flag/30',
    bg: 'bg-amber-flag/5',
    text: 'text-amber-flag',
  },
  neutral: {
    border: 'border-ink-muted/30',
    bg: 'bg-ink-muted/5',
    text: 'text-ink-muted',
  },
};

export default function StatusTag({ status, label }) {
  const variant = VARIANTS[status] || VARIANTS.neutral;
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-mono uppercase tracking-wider border ${variant.border} ${variant.bg} ${variant.text}`}>
      {label}
    </span>
  );
}
