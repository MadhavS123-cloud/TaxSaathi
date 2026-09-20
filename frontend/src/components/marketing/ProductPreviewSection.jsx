import React from 'react';
import RevealOnScroll from './RevealOnScroll';
import ProductPreviewTabs from './ProductPreviewTabs';

export default function ProductPreviewSection() {
  return (
    <section className="py-24 md:py-32 px-6 max-w-7xl mx-auto border-t border-hairline relative z-10">
      <RevealOnScroll>
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-serif text-ink tracking-tight">
            Everything your practice needs, in one workspace
          </h2>
        </div>
      </RevealOnScroll>
      
      <RevealOnScroll delay={100}>
        <ProductPreviewTabs />
      </RevealOnScroll>
    </section>
  );
}
