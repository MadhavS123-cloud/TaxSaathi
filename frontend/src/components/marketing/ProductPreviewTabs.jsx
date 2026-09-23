import React, { useState } from 'react';
import { FileText, Scale, MessageSquare, Users } from 'lucide-react';
import PrimaryButton from '../ui/PrimaryButton';
import SecondaryButton from '../ui/SecondaryButton';

const TABS = [
  { id: 'extract', label: 'Document Extraction', icon: FileText },
  { id: 'reconcile', label: 'Ledger Reconciliation', icon: Scale },
  { id: 'advisory', label: 'Tax Advisory', icon: MessageSquare },
  { id: 'drafts', label: 'Client Communications', icon: Users },
];

const SidebarItem = ({ active, children }) => (
  <div className={`px-5 py-2 text-sm font-sans ${active ? 'border-l-2 border-brass bg-[#E3DFD5] text-ink' : 'border-l-2 border-transparent text-ink-muted opacity-50 grayscale cursor-default'}`}>
    {children}
  </div>
);

const AppWrapper = ({ activeTab, children }) => {
  return (
    <div className="flex w-full h-full bg-paper text-left text-ink pointer-events-none">
       <div className="hidden md:flex w-[180px] bg-taupe border-r border-hairline flex-col pt-5 shrink-0">
          <div className="px-5 mb-6">
             <div className="w-7 h-7 bg-ink text-paper rounded-[2px] flex items-center justify-center font-serif font-bold text-xs">CA</div>
          </div>
          <div className="flex flex-col gap-0.5">
             <SidebarItem>Case dashboard</SidebarItem>
             <SidebarItem active={activeTab === 'extract'}>Document upload</SidebarItem>
             <SidebarItem active={activeTab === 'reconcile'}>Reconciliation</SidebarItem>
             <SidebarItem active={activeTab === 'advisory'}>Advisory chat</SidebarItem>
             <SidebarItem active={activeTab === 'drafts'}>Communication</SidebarItem>
             {activeTab === 'reconcile' && <SidebarItem>Audit trail</SidebarItem>}
             {activeTab === 'drafts' && <SidebarItem>Review & approve</SidebarItem>}
          </div>
       </div>
       <div className="flex-1 flex flex-col relative overflow-hidden bg-paper">
          {children}
       </div>
    </div>
  );
};

export default function ProductPreviewTabs() {
  const [activeTab, setActiveTab] = useState('reconcile');

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col mt-12 gap-8 relative z-10">
      {/* Tabs */}
      <div className="flex justify-center border-b border-hairline overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-cursor="interactive"
            className={`flex items-center gap-2 px-6 py-4 text-sm font-sans transition-colors relative whitespace-nowrap rounded-[4px] ${
              activeTab === tab.id ? 'bg-[#E3DFD5] text-ink' : 'text-ink-muted hover:text-ink hover:bg-paper'
            }`}
          >
            <tab.icon size={16} strokeWidth={1.5} />
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content (Mockup window) */}
      <div className="w-full bg-paper border border-hairline rounded-[4px] overflow-hidden h-[540px] flex flex-col shadow-sm">
        {/* Browser Chrome */}
        <div className="h-8 border-b border-hairline bg-paper-raised flex items-center px-4 gap-2 shrink-0">
          <div className="w-2 h-2 rounded-[2px] border border-hairline bg-hairline/50"></div>
          <div className="w-2 h-2 rounded-[2px] border border-hairline bg-hairline/50"></div>
          <div className="w-2 h-2 rounded-[2px] border border-hairline bg-hairline/50"></div>
        </div>
        
        {/* Content specific to tab */}
        <div className="flex-1 overflow-hidden opacity-95">
          {activeTab === 'extract' && (
            <AppWrapper activeTab={activeTab}>
               <div className="flex h-full">
                  {/* Left Column (Document Preview) */}
                  <div className="w-1/2 bg-[#F3F0E9] border-r border-hairline p-8 flex flex-col items-center justify-center">
                     <div className="w-4/5 aspect-[1/1.1] bg-paper shadow-sm flex flex-col p-6 gap-3 mx-auto relative">
                        <div className="h-5 w-1/4 bg-ink/10 mb-4"></div>
                        <div className="h-1.5 w-full bg-ink/5"></div>
                        <div className="h-1.5 w-full bg-ink/5"></div>
                        <div className="h-1.5 w-2/3 bg-ink/5"></div>
                        
                        {/* The missing extraction reticle icon */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-8 w-6 h-6 border border-hairline bg-paper flex items-center justify-center">
                           <div className="w-1.5 h-1.5 bg-ink-muted"></div>
                        </div>
                     </div>
                  </div>
                  
                  {/* Right Column (Data Fields) */}
                  <div className="w-1/2 p-8 flex flex-col bg-paper">
                     <h2 className="text-xl font-serif text-ink mb-8">Invoice Extraction</h2>
                     
                     <div className="flex flex-col gap-4">
                        <div className="p-3 bg-paper border border-hairline flex justify-between items-center rounded-[2px]">
                           <span className="text-xs font-sans text-ink-muted">Invoice No</span>
                           <span className="text-sm font-mono text-ink">INV-2024-089</span>
                        </div>
                        <div className="p-3 bg-paper border border-hairline flex justify-between items-center rounded-[2px]">
                           <span className="text-xs font-sans text-ink-muted">GSTIN</span>
                           <span className="text-sm font-mono text-ink">27AABCR1234F1Z5</span>
                        </div>
                        <div className="p-3 bg-paper border border-hairline flex justify-between items-center rounded-[2px]">
                           <span className="text-xs font-sans text-ink-muted">Total Amount</span>
                           <span className="text-sm font-mono text-ink">₹ 1,45,000.00</span>
                        </div>
                     </div>
                  </div>
               </div>
            </AppWrapper>
          )}

          {activeTab === 'reconcile' && (
            <AppWrapper activeTab={activeTab}>
               <div className="p-8 h-full flex flex-col">
                  <h2 className="text-2xl font-serif text-ink mb-6">Algorithmic Ledger Reconciliation</h2>
                  
                  <div className="flex gap-4 mb-8">
                     <div className="flex-1 bg-paper border border-hairline p-4 rounded-[4px]">
                        <div className="text-[10px] font-sans uppercase tracking-widest text-ink-muted mb-2">Matched Rate</div>
                        <div className="text-xl font-mono text-ink">84%</div>
                     </div>
                     <div className="flex-1 bg-paper border border-hairline p-4 rounded-[4px]">
                        <div className="text-[10px] font-sans uppercase tracking-widest text-ink-muted mb-2">Unmatched</div>
                        <div className="text-xl font-mono text-rust">3</div>
                     </div>
                     <div className="flex-1 bg-paper border border-hairline p-4 rounded-[4px]">
                        <div className="text-[10px] font-sans uppercase tracking-widest text-ink-muted mb-2">Reconciled Sum</div>
                        <div className="text-xl font-mono text-ink">₹11,53,550</div>
                     </div>
                     <div className="flex-1 bg-paper border border-hairline p-4 rounded-[4px]">
                        <div className="text-[10px] font-sans uppercase tracking-widest text-ink-muted mb-2">Net Variance</div>
                        <div className="text-xl font-mono text-rust">₹1,13,850</div>
                     </div>
                  </div>

                  <div className="flex-1 border border-hairline bg-paper rounded-[4px] flex flex-col">
                     {/* Header Row */}
                     <div className="flex w-full mb-2 border-b border-hairline pb-4 pt-4 px-4">
                        <div className="w-1/2 pr-4 border-r border-hairline flex items-end">
                        <span className="text-xs font-mono font-medium text-ink-muted">Your books (Tally)</span>
                        </div>
                        <div className="w-1/2 pl-4 flex items-end justify-between">
                        <span className="text-xs font-mono font-medium text-ink-muted">Vendor ledger (GSTR-2B)</span>
                        <span className="text-xs font-mono font-medium text-ink-muted pr-2">Status</span>
                        </div>
                     </div>

                     {/* Row 1 - Matched */}
                     <div className="flex w-full p-4 border-b border-hairline">
                        <div className="w-1/2 pr-4 border-r border-hairline flex justify-between items-center">
                           <div>
                              <div className="text-sm font-sans text-ink">Office Premise Rent</div>
                              <div className="text-[10px] font-mono text-ink-muted mt-0.5">2024-08-01 · CHQ-890122</div>
                           </div>
                           <div className="text-sm font-mono text-ink">₹75,000</div>
                        </div>
                        <div className="w-1/2 pl-4 flex items-center justify-between">
                           <div className="flex items-center gap-3">
                               <div className="px-1 border border-forest/30 bg-forest/5 text-[8px] font-mono text-forest uppercase rounded-[2px] whitespace-nowrap">Matched</div>
                               <div>
                                  <div className="text-sm font-sans text-ink">CLG CHQ RTN/PAID APEX</div>
                                  <div className="text-[10px] font-mono text-ink-muted mt-0.5">2024-08-02</div>
                               </div>
                           </div>
                           <div className="text-sm font-mono text-ink shrink-0">₹75,000</div>
                        </div>
                     </div>
                     
                     {/* Row 2 - Unmatched */}
                     <div className="flex w-full p-4 border-b border-hairline bg-paper-raised/50 border-l-2 border-l-rust">
                        <div className="w-1/2 pr-4 border-r border-hairline flex justify-between items-center">
                           <div>
                              <div className="text-sm font-sans text-ink">Consulting Advisory Fees</div>
                              <div className="text-[10px] font-mono text-ink-muted mt-0.5">2024-08-12 · CHQ-890123</div>
                           </div>
                           <div className="text-sm font-mono text-ink">₹45,000</div>
                        </div>
                        <div className="w-1/2 pl-4 flex items-center">
                           <div className="flex items-center gap-3">
                               <div className="px-1 border border-rust/30 bg-rust/5 text-[8px] font-mono text-rust uppercase rounded-[2px] whitespace-nowrap">Unmatched</div>
                               <div>
                                  <div className="text-xs font-sans text-rust flex items-center gap-1">✗ No Bank Clearance — Unpresented</div>
                                  <div className="text-[10px] font-sans text-ink-muted mt-0.5">Cheque not yet cleared in bank passbook</div>
                               </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </AppWrapper>
          )}

          {activeTab === 'advisory' && (
            <AppWrapper activeTab={activeTab}>
               <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-hairline shrink-0">
                     <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-serif text-ink">Tax Advisory Chat</h2>
                        <span className="border border-hairline px-2 py-0.5 text-[10px] font-mono text-ink-muted bg-paper-raised rounded-[4px]">RAG-Grounded Q&A</span>
                     </div>
                     <p className="text-xs font-sans text-ink-muted">Grounded in the Income Tax Act, 2025 & CGST/IGST Acts</p>
                  </div>
                  
                  <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
                     <div className="self-end bg-ink text-paper px-4 py-3 rounded-[2px] max-w-[80%]">
                        <p className="text-sm font-sans">Is RCM applicable on director sitting fees?</p>
                     </div>
                     
                     <div className="self-start w-full">
                        <div className="bg-paper border border-hairline px-5 py-4 rounded-[2px] mb-3">
                           <p className="text-sm font-sans leading-relaxed text-ink">
                              Yes — sitting fees paid to non-executive directors fall under Reverse Charge <span className="inline-block border border-brass text-[10px] font-mono px-1 rounded-sm mx-1 text-brass-deep bg-paper">1</span>, payable directly by the company rather than the director.
                           </p>
                        </div>
                        <div className="text-xs font-sans text-forest mb-4 flex items-center gap-1">
                           ✓ Grounded in 2 sources
                        </div>
                        
                        <div className="bg-paper border border-hairline rounded-[2px] p-4">
                           <div className="text-[10px] font-sans uppercase tracking-widest text-ink-muted mb-3">Sources</div>
                           <div className="flex items-start gap-3">
                              <span className="inline-block border border-hairline text-[10px] font-mono px-1.5 rounded-sm text-ink-muted mt-0.5">1</span>
                              <span className="text-sm font-sans text-ink">CGST Act, 2017, Section 9(3) — Reverse Charge Mechanism</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="p-4 border-t border-hairline shrink-0">
                     <div className="bg-paper border border-hairline rounded-[4px] p-2 flex items-center">
                        <input type="text" value="Ask a question grounded in the statutory corpus..." readOnly className="flex-1 bg-transparent text-sm font-sans text-ink-muted px-3 outline-none" />
                        <div className="w-8 h-8 bg-ink rounded-[4px]"></div>
                     </div>
                  </div>
               </div>
            </AppWrapper>
          )}

          {activeTab === 'drafts' && (
            <AppWrapper activeTab={activeTab}>
               <div className="flex h-full">
                  {/* Left Column */}
                  <div className="w-2/5 border-r border-hairline p-6 bg-[#F7F5F0] overflow-y-auto">
                     <h2 className="text-2xl font-serif text-ink mb-6 leading-tight">Based on this case<br/>data</h2>
                     <div className="text-[10px] font-sans uppercase tracking-widest text-ink-muted mb-3">Flagged Exceptions (2)</div>
                     
                     <div className="bg-paper border border-hairline rounded-[2px] p-4 mb-3">
                        <div className="flex justify-between items-start mb-1">
                           <span className="text-sm font-sans text-ink">Consulting Fees<br/>(Vertex Legal)</span>
                           <span className="text-sm font-mono text-rust">₹45,000</span>
                        </div>
                        <div className="text-xs font-sans text-ink-muted mt-2">Cheque issued, not yet cleared in bank</div>
                     </div>

                     <div className="bg-paper border border-hairline rounded-[2px] p-4">
                        <div className="flex justify-between items-start mb-1">
                           <span className="text-sm font-sans text-ink">Bank Folio Charges</span>
                           <span className="text-sm font-mono text-rust">₹850</span>
                        </div>
                        <div className="text-xs font-sans text-ink-muted mt-2">Direct debit, no ledger record</div>
                     </div>
                  </div>

                  {/* Right Column */}
                  <div className="w-3/5 p-6 flex flex-col h-full bg-[#F3F0E9]">
                     <div className="mb-4 shrink-0">
                        <div className="text-[10px] font-sans uppercase tracking-widest text-ink-muted mb-2">Email Subject Line</div>
                        <div className="bg-paper border border-hairline rounded-[2px] p-3 text-sm font-sans text-ink">
                           Clarification requested on recent bank entries
                        </div>
                     </div>

                     <div className="flex-1 flex flex-col min-h-0">
                        <div className="text-[10px] font-sans uppercase tracking-widest text-ink-muted mb-2">Draft</div>
                        <div className="bg-paper border border-hairline rounded-[2px] p-6 flex-1 overflow-y-auto text-sm font-sans text-ink leading-relaxed">
                           <p className="mb-6">Dear Mr. Arun,</p>
                           <p className="mb-6">While reviewing the August 2024 records, our audit team noticed a few pending items that need your quick clarification:</p>
                           <p>• Payment of ₹45,000 (Cheque #CHQ-890123): recorded in books but not yet cleared on the bank statement.</p>
                        </div>
                     </div>

                     <div className="mt-4 flex gap-4 shrink-0">
                        <SecondaryButton>Save draft</SecondaryButton>
                        <PrimaryButton>Send for review</PrimaryButton>
                     </div>
                  </div>
               </div>
            </AppWrapper>
          )}
        </div>
      </div>
    </div>
  );
}
