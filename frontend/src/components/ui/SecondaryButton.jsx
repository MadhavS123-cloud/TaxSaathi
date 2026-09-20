import React from 'react';

export default function SecondaryButton({ children, onClick, className = '', type = 'button', disabled = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-cursor="interactive"
      className={`bg-transparent border border-hairline text-ink px-4 py-2 text-sm font-sans font-medium rounded-[4px] hover:bg-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
