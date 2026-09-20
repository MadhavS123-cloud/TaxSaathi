import React from 'react';
import RevealOnScroll from './RevealOnScroll';
import CountUp from './CountUp';

export default function TestimonialSection() {
  return (
    <section className="py-24 md:py-32 px-6 max-w-7xl mx-auto border-t border-hairline relative z-10">
      <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-center">
        {/* Left: Quote */}
        <div className="w-full lg:w-[60%]">
          <RevealOnScroll>
            <div className="pl-8 border-l-2 border-brass/50">
              <p className="text-2xl md:text-3xl font-serif text-ink leading-relaxed mb-8 pr-8 md:pr-12">
                "Before Copilot, our associates spent three weeks just tying GST line items to the ledger. Now, the system highlights the 2% of exceptions, and we spend our time actually advising the client on resolving them."
              </p>
              <p className="text-sm font-sans text-ink-muted">
                — Senior Associate, Mid-sized GST Advisory Practice
              </p>
            </div>
          </RevealOnScroll>
        </div>
        
        {/* Right: Stats */}
        <div className="w-full lg:w-[40%] flex flex-col gap-12 border-l border-hairline pl-0 lg:pl-16">
           <RevealOnScroll delay={100}>
             <div className="flex flex-col gap-2">
               <div className="text-5xl font-serif text-ink tracking-tight">
                 <CountUp target={3} /> Weeks
               </div>
               <div className="text-sm font-sans text-ink-muted leading-relaxed mt-2">
                 Average time saved per statutory audit engagement during reconciliation.
               </div>
             </div>
           </RevealOnScroll>
           
           <RevealOnScroll delay={200}>
             <div className="flex flex-col gap-2">
               <div className="text-5xl font-serif text-ink tracking-tight">
                 <CountUp target={98} suffix="%" />
               </div>
               <div className="text-sm font-sans text-ink-muted leading-relaxed mt-2">
                 Reduction in manual data entry errors across all invoice extractions.
               </div>
             </div>
           </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
