import React from 'react';

export default function ConfidenceBar({ score, label }) {
  // Determine color threshold
  let colorClass = 'bg-forest';
  if (score < 70) colorClass = 'bg-rust';
  else if (score < 90) colorClass = 'bg-amber-flag';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-hairline h-[3px] overflow-hidden">
        <div 
          className={`h-full ${colorClass}`} 
          style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }} 
        />
      </div>
      <span className="font-mono text-xs text-ink-muted min-w-[3ch] text-right">
        {label !== undefined ? label : `${score}%`}
      </span>
    </div>
  );
}
