import React from 'react';

export default function PrimaryButton({ children, onClick, className = '', type = 'button', disabled = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-cursor="interactive"
      className={`rounded-full bg-[#1C1915] px-4 py-2.5 text-sm font-sans font-medium text-[#F4F1EA] transition-transform duration-300 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
