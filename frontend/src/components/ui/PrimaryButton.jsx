import React from 'react';

export default function PrimaryButton({ children, onClick, className = '', type = 'button', disabled = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`bg-ink text-paper px-4 py-2 text-sm font-sans font-medium rounded-[4px] hover:text-brass transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
