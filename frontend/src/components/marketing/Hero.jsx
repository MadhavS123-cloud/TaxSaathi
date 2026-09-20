import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PrimaryButton from '../ui/PrimaryButton';
import SecondaryButton from '../ui/SecondaryButton';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import LiveActivityCards from './LiveActivityCards';

export default function Hero() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Short delay to trigger enter animations after mount
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const smoothScrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const entranceClass = (delayMs) => {
    if (prefersReducedMotion) return 'opacity-100 translate-y-0';
    return `transition-all duration-700 ease-out ${
      mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`;
  };
  
  const getDelayStyle = (delayMs) => {
    if (prefersReducedMotion) return {};
    return { transitionDelay: `${delayMs}ms` };
  };

  return (
    <section className="pt-32 pb-16 md:pt-48 md:pb-24 px-6 max-w-7xl mx-auto flex flex-col gap-24 relative z-10">
      
      <div className="flex flex-col lg:flex-row items-center gap-16">
        {/* Left Column */}
        <div className="w-full lg:w-[55%] flex flex-col items-start gap-6">
          <div 
            className={`border border-hairline px-3 py-1 text-xs font-mono tracking-widest uppercase text-ink-muted bg-paper-raised rounded-sm ${entranceClass(0)}`}
            style={getDelayStyle(0)}
          >
            Built for Indian CA practices
          </div>
          
          <h1 
            className={`text-4xl md:text-5xl lg:text-6xl font-serif text-ink leading-[1.1] tracking-tight ${entranceClass(80)}`}
            style={getDelayStyle(80)}
          >
            Pre-accounting and tax advisory, handled before your first coffee.
          </h1>
          
          <p 
            className={`text-lg font-sans text-ink-muted leading-relaxed max-w-xl ${entranceClass(160)}`}
            style={getDelayStyle(160)}
          >
            Automate invoice data extraction, ledger reconciliation, and plain-language client drafting with an audit-ready pipeline.
          </p>
          
          <div 
            className={`flex items-center gap-4 pt-4 ${entranceClass(240)}`}
            style={getDelayStyle(240)}
          >
            <PrimaryButton onClick={() => navigate('/login')}>Request a demo</PrimaryButton>
            <SecondaryButton onClick={() => smoothScrollTo('pipelines')}>See how it works</SecondaryButton>
          </div>
        </div>

        {/* Right Column: Floating Mockup */}
        <div className="w-full lg:w-[45%] h-full min-h-[400px]">
          <div 
            className={`w-full h-full ${entranceClass(320)}`}
            style={getDelayStyle(320)}
          >
            <LiveActivityCards scale="normal" />
          </div>
        </div>
      </div>
      
    </section>
  );
}
