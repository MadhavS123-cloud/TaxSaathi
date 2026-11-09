import React from 'react';
import { ZoomIn, ZoomOut, Maximize, X } from 'lucide-react';

export default function DocumentPreview({ activeField, onClearHighlight, imageUrl, filename = '' }) {
  const isPdf = filename.toLowerCase().endsWith('.pdf') || (imageUrl && imageUrl.toLowerCase().includes('pdf'));

  return (
    <div className="flex flex-col h-full bg-paper-raised border-r border-hairline relative">
      {/* Small Toolbar */}
      <div className="h-12 border-b border-hairline flex items-center justify-between px-4 bg-paper/50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 border border-hairline bg-paper-raised p-0.5">
            <button className="p-1 hover:bg-paper text-ink-muted transition-colors"><ZoomOut size={14} /></button>
            <span className="text-[10px] font-mono px-2 text-ink">100%</span>
            <button className="p-1 hover:bg-paper text-ink-muted transition-colors"><ZoomIn size={14} /></button>
            <button className="p-1 hover:bg-paper text-ink-muted transition-colors border-l border-hairline ml-1 pl-2"><Maximize size={14} /></button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-sans text-ink-muted tracking-widest">Active Source Region</span>
            <span className="text-[10px] font-mono bg-ink text-paper px-2 py-0.5">
              {activeField ? `[${activeField.toUpperCase()}]` : '[NONE]'}
            </span>
          </div>
        </div>

        {activeField && (
          <button 
            onClick={onClearHighlight}
            className="flex items-center gap-1 text-[11px] font-sans text-ink-muted hover:text-ink transition-colors"
          >
            <X size={12} /> Clear highlight
          </button>
        )}
      </div>

      {/* Simulated Document Preview Area */}
      <div className="flex-1 overflow-auto p-8 bg-paper flex justify-center">
        {imageUrl ? (
          isPdf ? (
            <iframe src={`${imageUrl}#toolbar=0`} className="w-full h-full shadow-[0_0_10px_rgba(0,0,0,0.03)] border border-hairline" title="Document Preview" />
          ) : (
            <img src={imageUrl} alt="Document Preview" className="max-w-full h-auto object-contain shadow-[0_0_10px_rgba(0,0,0,0.03)] border border-hairline" />
          )
        ) : (
          <div className="w-full max-w-[800px] border border-dashed border-hairline bg-paper-raised p-10 text-center">
            <p className="font-serif text-lg text-ink">No source file on this review</p>
            <p className="mt-2 text-sm font-sans text-ink-muted">
              The extracted fields are on the right. Open the document from the upload queue to attach the scan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
