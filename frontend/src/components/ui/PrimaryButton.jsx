import React from 'react';

export default function PrimaryButton({ children, onClick, className = '', type = 'button', disabled = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-cursor="interactive"
      className={`bg-ink border border-transparent text-paper px-4 py-2 text-sm font-sans font-medium rounded-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_0_-2px_0_0_transparent] hover:shadow-[inset_0_-2px_0_0_var(--brass)] ${className}`}
    >
      {children}
    </button>
  );
}
