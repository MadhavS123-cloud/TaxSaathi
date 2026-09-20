import React from 'react';
import RevealOnScroll from './RevealOnScroll';
import { FileText, Scale, MessageSquare, Users } from 'lucide-react';

const FEATURES = [
  {
    icon: FileText,
    title: 'Invoice & Receipt Extraction',
    description: 'Automatic classification and structured data extraction from raw documents.',
    detail: 'Gemini multimodal OCR'
  },
  {
    icon: Scale,
    title: 'Ledger Reconciliation',
    description: 'Instant multi-way matching between vendor invoices and your books.',
    detail: 'O(N) hash map + two-pointer matching'
  },
  {
    icon: MessageSquare,
    title: 'Tax Advisory',
    description: 'Context-aware answers referencing the latest tax compliance rules.',
    detail: 'Grounded in Income Tax Act, 2025'
  },
  {
    icon: Users,
    title: 'Client Communication',
    description: 'Generate professional emails requesting missing documents or clarifying exceptions.',
    detail: 'Plain-language drafts from exceptions'
  }
];

export default function PipelinesSection() {
  return (
    <section id="pipelines" className="py-24 md:py-32 px-6 max-w-7xl mx-auto border-t border-hairline relative z-10">
      <RevealOnScroll>
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-serif text-ink tracking-tight mb-4">Four systems, one workspace</h2>
          <p className="text-lg font-sans text-ink-muted">Purpose-built automation for modern Indian CA practices.</p>
        </div>
      </RevealOnScroll>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {FEATURES.map((feature, index) => (
          <RevealOnScroll key={index} staggerIndex={index}>
            <div className="bg-paper-raised border border-hairline p-8 flex flex-col h-full hover:border-brass transition-colors">
              <feature.icon className="text-ink-muted mb-6" size={24} strokeWidth={1.5} />
              <h3 className="text-xl font-serif text-ink mb-3">{feature.title}</h3>
              <p className="text-sm font-sans text-ink-muted leading-relaxed flex-1 mb-8">{feature.description}</p>
              <div className="pt-4 border-t border-hairline">
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-muted">
                  {feature.detail}
                </span>
              </div>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
