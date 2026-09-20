import React from 'react';
import { useNavigate } from 'react-router-dom';
import RevealOnScroll from './RevealOnScroll';
import PrimaryButton from '../ui/PrimaryButton';

const STEPS = [
  "Import your existing client list & GSTINs",
  "Connect your document ingestion workflow",
  "Go live with your first automated reconciliation case"
];

export default function FinalCta() {
  const navigate = useNavigate();
  
  return (
    <section className="bg-taupe border-y border-hairline py-24 md:py-32 px-6 relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 lg:gap-24 items-baseline">
        {/* Left: CTA */}
        <div className="w-full lg:w-1/2 flex flex-col items-start gap-6">
          <RevealOnScroll>
            <h2 className="text-4xl md:text-5xl font-serif text-ink tracking-tight leading-[1.1]">
              Ready to upgrade your practice?
            </h2>
          </RevealOnScroll>
          <RevealOnScroll delay={100}>
            <p className="text-lg font-sans text-ink-muted mb-2">
              Join progressive CA firms streamlining their audit and compliance pipelines.
            </p>
            <PrimaryButton onClick={() => navigate('/login')} className="px-8 py-3 text-sm">
              Start your free trial
            </PrimaryButton>
          </RevealOnScroll>
        </div>
        
        {/* Right: Onboarding Steps */}
        <div className="w-full lg:w-1/2">
          <RevealOnScroll delay={200}>
            <div className="flex flex-col gap-6">
              <h3 className="text-sm font-sans uppercase tracking-widest text-ink-muted border-b border-hairline pb-4">
                Onboard in minutes
              </h3>
              <div className="flex flex-col gap-6 pt-2">
                {STEPS.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-[2px] bg-ink text-paper flex items-center justify-center font-serif text-xs flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <span className="text-base font-sans text-ink leading-snug">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
