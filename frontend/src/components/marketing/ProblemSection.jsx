import React from 'react';
import RevealOnScroll from './RevealOnScroll';

export default function ProblemSection() {
  return (
    <section className="py-24 md:py-32 px-6 max-w-4xl mx-auto text-center relative z-10">
      <RevealOnScroll>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-ink mb-6">
          Junior CA hours shouldn't go to data entry.
        </h2>
        <p className="text-lg font-sans text-ink-muted leading-relaxed max-w-2xl mx-auto">
          Manual voucher matching and data entry are the bottlenecks of every tax season. 
          CA Tax Copilot transforms raw documents into reconciled ledgers instantly, letting your team focus on high-value advisory.
        </p>
      </RevealOnScroll>
    </section>
  );
}
