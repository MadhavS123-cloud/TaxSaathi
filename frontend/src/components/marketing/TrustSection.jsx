import React from 'react';
import RevealOnScroll from './RevealOnScroll';
import { ShieldCheck, Database, BookOpen } from 'lucide-react';

export default function TrustSection() {
  return (
    <section id="trust" className="py-24 px-6 max-w-7xl mx-auto border-t border-hairline relative z-10">
      <RevealOnScroll>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          
          <div className="w-full md:w-1/3">
            <h2 className="text-3xl font-serif text-ink tracking-tight mb-4">Enterprise-grade compliance.</h2>
            <p className="text-sm font-sans text-ink-muted leading-relaxed">
              Built for real audit workflows, ensuring every automated action leaves a forensic trace.
            </p>
          </div>

          <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="flex flex-col gap-3">
              <ShieldCheck size={20} className="text-ink-muted" strokeWidth={1.5} />
              <div className="text-sm font-sans font-semibold text-ink">SA-230 Audit Logging</div>
              <p className="text-xs font-sans text-ink-muted leading-relaxed">
                Immutable, tamper-evident history of every extraction, edit, and approval decision.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Database size={20} className="text-ink-muted" strokeWidth={1.5} />
              <div className="text-sm font-sans font-semibold text-ink">Localized Compute</div>
              <p className="text-xs font-sans text-ink-muted leading-relaxed">
                Client financial data never leaves your jurisdiction. Strict adherence to DPDP Act guidelines.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <BookOpen size={20} className="text-ink-muted" strokeWidth={1.5} />
              <div className="text-sm font-sans font-semibold text-ink">Current Tax Law</div>
              <p className="text-xs font-sans text-ink-muted leading-relaxed">
                RAG models strictly grounded in the Income Tax Act, 2025 and CGST/IGST Acts. No hallucinations from repealed statutes.
              </p>
            </div>
          </div>
          
        </div>
      </RevealOnScroll>
    </section>
  );
}
