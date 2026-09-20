import React from 'react';
import RevealOnScroll from './RevealOnScroll';
import LiveActivityCards from './LiveActivityCards';
import { Check } from 'lucide-react';

export default function AiAssistsSection() {
  const listItems = [
    "Data extraction & categorization",
    "Ledger matching",
    "Exception detection",
    "Draft communications"
  ];

  return (
    <section className="py-24 md:py-32 px-6 max-w-7xl mx-auto border-t border-hairline relative z-10">
      <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
        {/* Left Column */}
        <div className="w-full lg:w-1/2 flex flex-col gap-6">
          <RevealOnScroll>
            <h2 className="text-3xl md:text-4xl font-serif text-ink tracking-tight">
              Assists the work. You still sign off.
            </h2>
          </RevealOnScroll>
          <RevealOnScroll delay={100}>
            <p className="text-lg font-sans text-ink-muted leading-relaxed">
              We built an engine that handles the repetitive pre-accounting tasks flawlessly, while surfacing exceptions clearly for your professional judgment.
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={200}>
            <ul className="flex flex-col gap-4 mt-4">
              {listItems.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-ink-muted font-sans">
                  <Check size={18} className="text-ink-muted" strokeWidth={1.5} />
                  {item}
                </li>
              ))}
            </ul>
          </RevealOnScroll>
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-1/2 h-full min-h-[500px]">
          <RevealOnScroll delay={300}>
            <LiveActivityCards scale="large" />
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
