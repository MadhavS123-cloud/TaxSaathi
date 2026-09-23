import React, { useState, useRef } from "react";

const MATCH_TYPES = {
  exact_reference: { label: "Exact Reference", colorClass: "text-forest bg-forest/10 border-forest/20" },
  exact_amount_date: { label: "Exact Amount & Date", colorClass: "text-charcoal bg-charcoal/10 border-charcoal/20" },
  fuzzy_amount_date: { label: "Fuzzy Match", colorClass: "text-brass-deep bg-brass/10 border-brass/30" },
  unmatched_invoice: { label: "Unmatched Invoice", colorClass: "text-rust bg-rust/10 border-rust/20" },
  unmatched_payment: { label: "Unmatched Payment", colorClass: "text-rust bg-rust/10 border-rust/20" },
};

const FileUploader = ({ label, accept, file, setFile }) => {
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="flex-1 border border-hairline border-dashed bg-paper-raised p-4 flex flex-col items-center justify-center cursor-pointer hover:border-brass transition-colors duration-200"
      onClick={() => inputRef.current?.click()}
    >
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept={accept}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
          }
        }}
      />
      <span className="font-serif text-ink-muted text-sm mb-1">{label}</span>
      {file ? (
        <span className="font-mono text-xs text-ink">{file.name}</span>
      ) : (
        <span className="text-xs text-taupe">Click or drag file here</span>
      )}
    </div>
  );
};

export default function ReconciliationPanel({
  summary = null,
  rows = [],
  isRunning = false,
  onRunReconciliation = () => {},
}) {
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [paymentFile, setPaymentFile] = useState(null);
  const [filter, setFilter] = useState("All");
  const [expandedRows, setExpandedRows] = useState(new Set());

  const handleRun = () => {
    onRunReconciliation(invoiceFile, paymentFile);
  };

  const toggleRow = (index) => {
    const next = new Set(expandedRows);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedRows(next);
  };

  const filteredRows = rows.filter((r) => filter === "All" || r.match_type === filter);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 font-sans text-ink">
      {/* Upload Zone */}
      <section className="bg-paper border border-hairline p-6">
        <h2 className="font-serif text-xl mb-4 border-b border-hairline pb-2">Data Sources</h2>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <FileUploader
            label="Invoices (.json, .csv, .xlsx)"
            accept=".json,.csv,.xlsx,.xls"
            file={invoiceFile}
            setFile={setInvoiceFile}
          />
          <FileUploader
            label="Bank / Payments (.csv, .xlsx)"
            accept=".csv,.xlsx,.xls"
            file={paymentFile}
            setFile={setPaymentFile}
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleRun}
            disabled={isRunning || !invoiceFile || !paymentFile}
            className="bg-ink text-paper px-6 py-2 font-mono text-sm disabled:opacity-50 hover:bg-charcoal transition-colors border border-ink"
          >
            {isRunning ? "Running..." : "Run Reconciliation"}
          </button>
        </div>
      </section>

      {/* Summary Strip */}
      <section className="bg-paper border border-hairline p-6">
        <h2 className="font-serif text-xl mb-4 border-b border-hairline pb-2">Reconciliation Summary</h2>
        {!summary ? (
          <div className="py-8 text-center text-taupe text-sm">
            Upload files and run a reconciliation to see results.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col">
              <span className="text-xs text-ink-muted uppercase tracking-wider mb-1">Match Rate</span>
              <span className="font-serif text-3xl text-brass-deep">{summary.match_rate_pct.toFixed(1)}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-ink-muted uppercase tracking-wider mb-1">Invoices / Payments</span>
              <span className="font-mono text-lg mt-1">{summary.total_invoices} / {summary.total_payments}</span>
            </div>
            <div className="flex flex-col col-span-2 text-sm border-l border-hairline pl-6">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs text-ink-muted">
                <div className="flex justify-between">
                  <span>Exact Ref:</span> <span className="text-ink">{summary.exact_reference_matches}</span>
                </div>
                <div className="flex justify-between">
                  <span>Exact Amt/Date:</span> <span className="text-ink">{summary.exact_amount_date_matches}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fuzzy Matches:</span> <span className="text-ink">{summary.fuzzy_matches}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unmatched (Inv/Pay):</span> <span className="text-rust">{summary.unmatched_invoices} / {summary.unmatched_payments}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Results Table */}
      <section className="bg-paper border border-hairline flex flex-col min-h-[400px]">
        <div className="p-4 border-b border-hairline flex justify-between items-center bg-paper-raised">
          <h2 className="font-serif text-xl">Ledger Details</h2>
          {rows.length > 0 && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-paper border border-hairline font-mono text-xs py-1 px-2 text-ink outline-none focus:border-brass"
            >
              <option value="All">All Categories</option>
              {Object.entries(MATCH_TYPES).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-taupe text-sm p-8">
            No ledger data available. Run a reconciliation.
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-taupe text-sm p-8">
            No rows match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-paper border-b border-hairline text-ink-muted text-xs font-mono">
                <tr>
                  <th className="py-3 px-4 font-normal">Match Type</th>
                  <th className="py-3 px-4 font-normal">Confidence</th>
                  <th className="py-3 px-4 font-normal">Invoice Details</th>
                  <th className="py-3 px-4 font-normal">Payment Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filteredRows.map((row, idx) => {
                  const isExpanded = expandedRows.has(idx);
                  const typeConfig = MATCH_TYPES[row.match_type];
                  return (
                    <React.Fragment key={idx}>
                      <tr
                        onClick={() => toggleRow(idx)}
                        className={`cursor-pointer hover:bg-paper-raised transition-colors ${
                          row.needs_review ? "border-l-[3px] border-l-amber-flag" : "border-l-[3px] border-l-transparent"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider border ${typeConfig.colorClass}`}>
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {(row.confidence * 100).toFixed(0)}%
                        </td>
                        <td className="py-3 px-4 font-mono text-xs truncate max-w-[200px]">
                          {row.invoice ? `${row.invoice.amount} (${row.invoice.date})` : "—"}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs truncate max-w-[200px]">
                          {row.payment ? `${row.payment.amount} (${row.payment.date})` : "—"}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className={`${row.needs_review ? "border-l-[3px] border-l-amber-flag" : "border-l-[3px] border-l-transparent"} bg-paper-raised/50`}>
                          <td colSpan={4} className="p-0 border-b border-hairline">
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-mono text-ink">
                              {/* Invoice Details */}
                              <div>
                                <h4 className="font-serif text-sm text-ink-muted mb-3 border-b border-hairline pb-1">Invoice Record</h4>
                                {row.invoice ? (
                                  <dl className="grid grid-cols-[100px_1fr] gap-y-2">
                                    <dt className="text-taupe">ID:</dt><dd>{row.invoice.id}</dd>
                                    <dt className="text-taupe">Date:</dt><dd>{row.invoice.date}</dd>
                                    <dt className="text-taupe">Amount:</dt><dd>{row.invoice.amount}</dd>
                                    <dt className="text-taupe">Reference:</dt><dd>{row.invoice.reference || "—"}</dd>
                                    <dt className="text-taupe">Party:</dt><dd>{row.invoice.party_name || "—"}</dd>
                                  </dl>
                                ) : (
                                  <div className="text-taupe italic">No invoice matched</div>
                                )}
                              </div>
                              
                              {/* Payment Details */}
                              <div>
                                <h4 className="font-serif text-sm text-ink-muted mb-3 border-b border-hairline pb-1">Payment Record</h4>
                                {row.payment ? (
                                  <dl className="grid grid-cols-[100px_1fr] gap-y-2">
                                    <dt className="text-taupe">ID:</dt><dd>{row.payment.id}</dd>
                                    <dt className="text-taupe">Date:</dt><dd>{row.payment.date}</dd>
                                    <dt className="text-taupe">Amount:</dt><dd>{row.payment.amount}</dd>
                                    <dt className="text-taupe">Reference:</dt><dd>{row.payment.reference || "—"}</dd>
                                    <dt className="text-taupe">Party:</dt><dd>{row.payment.party_name || "—"}</dd>
                                  </dl>
                                ) : (
                                  <div className="text-taupe italic">No payment matched</div>
                                )}
                              </div>

                              {/* Notes & Diffs */}
                              <div className="col-span-1 md:col-span-2 border-t border-hairline pt-4 mt-2">
                                <div className="flex flex-wrap gap-x-8 gap-y-2">
                                  {row.amount_diff && (
                                    <div><span className="text-taupe">Amount Diff:</span> {row.amount_diff}</div>
                                  )}
                                  {row.date_diff_days !== null && (
                                    <div><span className="text-taupe">Date Diff:</span> {row.date_diff_days} days</div>
                                  )}
                                </div>
                                {row.notes && (
                                  <div className="mt-3 text-brass-deep bg-brass/5 border border-brass/20 p-3 italic font-sans">
                                    {row.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
