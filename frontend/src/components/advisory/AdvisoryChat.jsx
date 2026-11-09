import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../lib/api';
import StatusTag from '../ui/StatusTag';
import ConfidenceBar from '../ui/ConfidenceBar';
import { BookOpen, FolderKanban } from 'lucide-react';

const AdvisoryChat = ({ initialCaseId = null }) => {
  const [caseId, setCaseId] = useState(initialCaseId);
  const [cases, setCases] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'assistant',
      text: 'Welcome to Tax Advisory Chat. Ask questions about Indian tax law (Income Tax Act 2025, CGST, IGST). Responses are grounded against bare acts with statutory citations.',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load cases list
  useEffect(() => {
    api.cases.list()
      .then((c) => {
        setCases(c || []);
      })
      .catch(() => {});
  }, []);

  // Reload chat history per case on open
  useEffect(() => {
    if (!caseId) return;

    api.advisory.history(caseId)
      .then((history) => {
        if (history && history.length > 0) {
          const loaded = history.map((m) => ({
            id: m.id,
            type: m.role,
            text: m.content,
            timestamp: m.created_at ? new Date(m.created_at) : new Date(),
            citations: m.citations || [],
            confidence: m.confidence || 0.8,
            isLowConfidence: (m.confidence || 1) < 0.7,
          }));
          setMessages(loaded);
        }
      })
      .catch(() => {});
  }, [caseId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userQuery = inputValue.trim();
    const userMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      text: userQuery,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.advisory.ask(userQuery, caseId);

      if (!response || !response.answer) {
        throw new Error(response?.error || 'Advisory service returned an empty response.');
      }

      const assistantMessage = {
        id: `msg-${Date.now()}`,
        type: 'assistant',
        text: response.answer,
        timestamp: new Date(),
        citations: response.citations || [],
        confidence: response.confidence || 0.5,
        isLowConfidence: response.is_low_confidence || false,
        notes: response.notes,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Advisory error:', err);
      const errMsg = err.message || 'Failed to get statutory advisory response.';
      setError(errMsg);

      const errorMessage = {
        id: `msg-${Date.now()}`,
        type: 'error',
        text: errMsg,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        type: 'assistant',
        text: 'Welcome to Tax Advisory Chat. Ask questions about Indian tax law (Income Tax Act 2025, CGST, IGST). Responses are grounded against bare acts with statutory citations.',
        timestamp: new Date(),
      }
    ]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-[650px] bg-paper border border-hairline">
      {/* Header with Case Selector */}
      <div className="border-b border-hairline p-4 flex justify-between items-center bg-paper-raised">
        <div className="flex items-center gap-3">
          <h3 className="font-serif text-ink font-medium">Statutory Tax Advisory (RAG)</h3>
          {cases.length > 0 && (
            <div className="flex items-center gap-1.5 ml-4">
              <FolderKanban size={13} className="text-ink-muted" />
              <select
                value={caseId || ''}
                onChange={(e) => setCaseId(e.target.value || null)}
                className="bg-paper border border-hairline text-xs font-sans text-ink px-2 py-1 rounded-[2px] focus:outline-none focus:border-brass"
              >
                <option value="">General Research (No Case)</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    Case: {c.client}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <button
          onClick={clearChat}
          className="text-xs font-mono text-ink-muted hover:text-ink transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xl ${
                msg.type === 'user'
                  ? 'bg-ink text-paper rounded-[2px] p-3.5'
                  : msg.type === 'error'
                  ? 'bg-rust/10 border border-rust/30 rounded-[2px] p-3 text-rust'
                  : 'bg-paper-raised border border-hairline rounded-[2px] p-4'
              }`}
            >
              <p className="font-sans text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

              {/* Citations as Section Chips */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-hairline/60">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-muted uppercase tracking-wider mb-2">
                    <BookOpen size={11} /> Cited Statutory Sections
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map((c, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-paper border border-hairline text-[11px] font-mono text-ink rounded-[2px]"
                        title={c.section_title || c.excerpt || ''}
                      >
                        <span className="font-semibold text-brass">{c.act}</span>
                        <span>Sec. {c.section_number}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence Score */}
              {msg.confidence !== undefined && msg.type === 'assistant' && (
                <div className="mt-3 pt-2.5 border-t border-hairline/50 flex items-center justify-between text-xs font-mono text-ink-muted">
                  <span>Confidence: {Math.round(msg.confidence * 100)}%</span>
                  {msg.isLowConfidence && (
                    <StatusTag status="pending" label="Low Context" />
                  )}
                </div>
              )}

              {msg.notes && (
                <p className="font-sans text-xs text-ink-muted mt-2 italic">
                  {msg.notes}
                </p>
              )}

              <p className="text-[10px] font-mono text-ink-muted/70 mt-2 text-right">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-paper-raised border border-hairline rounded-[2px] p-3 text-xs font-mono text-ink-muted flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brass animate-ping"></span>
              Consulting statutory index &amp; bare acts…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-hairline p-4 bg-paper-raised">
        {error && (
          <div className="mb-2 p-2 bg-rust/10 border border-rust/30 rounded-[2px] text-rust text-xs font-sans">
            {error}
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question on Indian tax law (e.g., 'What is Section 194Q TDS on goods?')"
            disabled={isLoading}
            className="flex-1 bg-paper border border-hairline px-3 py-2 font-sans text-sm focus:outline-none focus:border-brass rounded-[2px] disabled:opacity-50 text-ink placeholder:text-ink-muted/60"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="bg-ink text-paper px-5 py-2 font-mono text-xs uppercase tracking-wider disabled:opacity-50 hover:bg-brass transition-colors rounded-[2px]"
          >
            {isLoading ? 'Querying…' : 'Ask'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdvisoryChat;
