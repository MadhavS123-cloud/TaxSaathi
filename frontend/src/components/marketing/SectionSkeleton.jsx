import React from 'react';

export default function SectionSkeleton({ heightClass = "h-96" }) {
  return (
    <div className={`w-full max-w-6xl mx-auto px-6 py-24 ${heightClass} flex items-center justify-center animate-pulse`}>
      <div className="w-full h-full border border-hairline bg-paper-raised/50 rounded-[4px]"></div>
    </div>
  );
}
