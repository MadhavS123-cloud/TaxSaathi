import React from 'react';
import AdvisoryChat from '../components/advisory/AdvisoryChat';

export default function Advisory() {
  return (
    <div className="max-w-6xl mx-auto pb-12">
      <h2 className="text-3xl font-serif text-ink tracking-tight mb-2">Tax Advisory Chat</h2>
      <p className="text-ink-muted mb-6">Ask questions about Indian tax law and receive grounded, citeable answers powered by RAG and AI.</p>
      
      <AdvisoryChat />

      {/* Info Section */}
      <div className="mt-8 space-y-4">
        <div className="bg-paper-raised border border-hairline p-4">
          <h3 className="font-serif text-ink mb-2">How it Works</h3>
          <ul className="text-sm text-ink-muted space-y-2 font-sans">
            <li>• Ask any question about Income Tax Act, CGST Act, or IGST Act</li>
            <li>• The system retrieves relevant sections from official tax legislation</li>
            <li>• Responses include citations and confidence scores for verification</li>
            <li>• Low-confidence answers are flagged for manual review</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
