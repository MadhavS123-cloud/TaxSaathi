import React from 'react';
import RevealOnScroll from './RevealOnScroll';

const STEPS = [
  {
    number: '01',
    title: 'Upload',
    description: 'Drop massive batches of unstructured PDFs and scans.'
  },
  {
    number: '02',
    title: 'Extract & Reconcile',
    description: 'AI extracts lines and matches them against ledgers in seconds.'
  },
  {
    number: '03',
    title: 'Ask & Draft',
    description: 'Query exceptions via chat and auto-draft client emails.'
  },
  {
    number: '04',
    title: 'Review & Approve',
    description: 'Partner signs off with a complete, tamper-evident audit trail.'
  }
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 px-6 max-w-7xl mx-auto border-t border-hairline relative z-10">
      <RevealOnScroll>
        <h2 className="text-3xl md:text-4xl font-serif text-ink tracking-tight mb-16 text-center">How it works</h2>
      </RevealOnScroll>
      
      <div className="flex flex-col md:flex-row relative">
        {STEPS.map((step, index) => (
          <div key={index} className="flex-1 relative flex flex-col md:pr-8 mb-12 md:mb-0 group">
            {/* Connecting line (desktop) */}
            {index < STEPS.length - 1 && (
              <div className="hidden md:block absolute top-6 left-12 right-0 h-[1px] bg-hairline group-hover:bg-brass/30 transition-colors z-[-1]" />
            )}
            
            {/* Connecting line (mobile) */}
            {index < STEPS.length - 1 && (
              <div className="block md:hidden absolute top-12 left-6 bottom-[-3rem] w-[1px] bg-hairline z-[-1]" />
            )}

            <RevealOnScroll staggerIndex={index}>
              <div className="flex flex-col">
                <div className="w-12 h-12 bg-paper border border-hairline flex items-center justify-center text-sm font-mono text-ink font-semibold mb-6">
                  {step.number}
                </div>
                <h3 className="text-xl font-serif text-ink mb-2">{step.title}</h3>
                <p className="text-sm font-sans text-ink-muted leading-relaxed max-w-[200px]">
                  {step.description}
                </p>
              </div>
            </RevealOnScroll>
          </div>
        ))}
      </div>
    </section>
  );
}
