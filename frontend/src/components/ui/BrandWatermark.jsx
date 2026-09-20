import React from 'react';

export default function BrandWatermark({ opacity = 0.03, position = 'bottom-right' }) {
  const baseClasses = "absolute pointer-events-none z-[-1]";
  
  let positionClasses = "";
  if (position === 'bottom-right') {
    positionClasses = "bottom-0 right-0 translate-x-[20%] translate-y-[20%]";
  } else if (position === 'center') {
    positionClasses = "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
  }

  return (
    <div 
      className={`${baseClasses} ${positionClasses}`}
      style={{ opacity }}
      aria-hidden="true"
      tabIndex="-1"
    >
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-[65vh] h-[65vh] text-[#14171F]"
      >
        <rect x="2" y="2" width="96" height="96" rx="8" stroke="currentColor" strokeWidth="2" />
        <text 
          x="50" 
          y="54" 
          fontFamily="serif" 
          fontSize="48" 
          fontWeight="bold" 
          textAnchor="middle" 
          dominantBaseline="central"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          letterSpacing="-2"
        >
          TS
        </text>
      </svg>
    </div>
  );
}
