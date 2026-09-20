import React from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const LOGOS = [
  "Boutique & Partners LLP",
  "Sharma & Associates",
  "Kedia Tax Advisors",
  "Veritas Consulting",
  "Nayak & Nayak CA",
  "Alpha Audit Firm",
  "Gupta Financial Services",
  "Prime Tax Solutions"
];

export default function LogoMarquee() {
  const prefersReducedMotion = useReducedMotion();
  
  // Duplicate array for seamless loop
  const displayLogos = [...LOGOS, ...LOGOS, ...LOGOS];

  return (
    <section className="py-16 md:py-24 border-t border-hairline overflow-hidden relative z-10 bg-paper">
      <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
         <h3 className="text-sm font-sans font-medium text-ink-muted">Trusted by progressive practices</h3>
      </div>
      
      {/* Marquee container with fade edges */}
      <div className="relative w-full flex overflow-hidden group">
        <div className="absolute top-0 left-0 w-16 md:w-48 h-full bg-gradient-to-r from-paper to-transparent z-10 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-16 md:w-48 h-full bg-gradient-to-l from-paper to-transparent z-10 pointer-events-none"></div>
        
        <div 
          className={`flex gap-16 md:gap-24 w-max ${prefersReducedMotion ? '' : 'animate-[marquee_40s_linear_infinite] hover:[animation-play-state:paused]'}`}
        >
          {displayLogos.map((name, i) => (
             <div key={i} className="flex items-center gap-3 grayscale opacity-40 hover:opacity-100 hover:grayscale-0 transition-all duration-300 cursor-default">
                <div className="w-8 h-8 bg-taupe border border-hairline flex items-center justify-center font-serif text-ink font-bold rounded-[2px]">
                   {name.charAt(0)}
                </div>
                <span className="font-serif text-xl md:text-2xl text-ink whitespace-nowrap">{name}</span>
             </div>
          ))}
        </div>
      </div>
    </section>
  );
}
