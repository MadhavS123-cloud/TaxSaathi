import React from 'react';
import RevealOnScroll from './RevealOnScroll';

export default function QuoteSection() {
  return (
    <section className="py-24 md:py-32 px-6 max-w-4xl mx-auto border-t border-hairline relative z-10">
      <RevealOnScroll>
        <div className="pl-6 border-l border-brass/50">
          <p className="text-2xl md:text-3xl font-serif text-ink leading-relaxed mb-6">
            "Before Copilot, our associates spent three weeks just tying GST line items to the ledger. Now, the system highlights the 2% of exceptions, and we spend our time actually advising the client on resolving them."
          </p>
          <p className="text-sm font-sans text-ink-muted">
            — Senior Associate, Mid-sized GST Advisory Practice
          </p>
        </div>
      </RevealOnScroll>
    </section>
  );
}
