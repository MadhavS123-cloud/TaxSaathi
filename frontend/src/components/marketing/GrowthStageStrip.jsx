import React from 'react';
import RevealOnScroll from './RevealOnScroll';
import { User, Users, Building, Building2 } from 'lucide-react';

const STAGES = [
  { icon: User, title: 'Solo Practitioner', desc: 'Process invoices 10x faster and grow your client base without hiring.' },
  { icon: Users, title: 'Growing Practice', desc: 'Standardize extraction and delegate review confidently to junior associates.' },
  { icon: Building, title: 'Multi-Branch Firm', desc: 'Centralized audit trails and real-time reconciliation across all locations.' },
  { icon: Building2, title: 'Large Firm/Enterprise', desc: 'Custom pipelines, API integrations, and enterprise-grade SLA compliance.' }
];

export default function GrowthStageStrip() {
  return (
    <section className="py-24 md:py-32 px-6 max-w-7xl mx-auto border-t border-hairline relative z-10">
      <RevealOnScroll>
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-serif text-ink tracking-tight">Built to grow with your practice</h2>
        </div>
      </RevealOnScroll>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STAGES.map((stage, i) => (
          <RevealOnScroll key={i} staggerIndex={i}>
            <div className="bg-paper-raised border border-hairline p-8 flex flex-col h-full hover:-translate-y-2 hover:shadow-[0_4px_20px_-4px_rgba(20,23,31,0.05)] hover:border-brass transition-all duration-300 cursor-default">
              <stage.icon className="text-brass mb-6" size={24} strokeWidth={1.5} />
              <h3 className="text-lg font-serif text-ink mb-3">{stage.title}</h3>
              <p className="text-sm font-sans text-ink-muted leading-relaxed">{stage.desc}</p>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
