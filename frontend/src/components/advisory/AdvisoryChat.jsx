import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import StatusTag from '../ui/StatusTag';
import ConfidenceBar from '../ui/ConfidenceBar';

const AdvisoryChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'assistant',
      text: 'Welcome to Tax Advisory Chat. Ask me any questions about Indian tax law, GST, income tax, or compliance matters. I\'ll provide grounded answers with citations from official acts and sections.',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setError(null);
    setIsLoading(true);

    try {
      // Call advisory API
      const response = await api.askAdvisory(inputValue.trim());

      if (response.error || !response.query) {
        throw new Error(response.error || 'Failed to get advisory response');
      }

      // Add assistant message with citations
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

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'An error occurred. Please try again.');

      // Add error message
      const errorMessage = {
        id: `msg-${Date.now()}`,
        type: 'error',
        text: err.message || 'Failed to get response from advisory service.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
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
        text: 'Welcome to Tax Advisory Chat. Ask me any questions about Indian tax law, GST, income tax, or compliance matters. I\'ll provide grounded answers with citations from official acts and sections.',
        timestamp: new Date(),
      }
    ]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-[600px] bg-paper border border-hairline">
      {/* Header */}
      <div className="border-b border-hairline p-4 flex justify-between items-center">
        <h3 className="font-serif text-ink">Tax Advisory Assistant</h3>
        <button
          onClick={clearChat}
          className="text-xs font-mono text-ink-muted hover:text-ink transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-md ${
                msg.type === 'user'
                  ? 'bg-ink text-paper rounded-lg p-3'
                  : msg.type === 'error'
                  ? 'bg-rust/10 border border-rust/30 rounded-lg p-3 text-rust'
                  : 'bg-paper-raised border border-hairline rounded-lg p-3'
              }`}
            >
              <p className="font-sans text-sm leading-relaxed">{msg.text}</p>

              {/* Confidence Score */}
              {msg.confidence !== undefined && msg.type === 'assistant' && (
                <div className="mt-3 pt-3 border-t border-hairline/50">
                  <p className="font-mono text-xs text-ink-muted mb-2">
                    Confidence Score
                  </p>
                  <ConfidenceBar
                    score={Math.round(msg.confidence * 100)}
                    label={`${Math.round(msg.confidence * 100)}%`}
                  />
                </div>
              )}

              {/* Low Confidence Flag */}
              {msg.isLowConfidence && (
                <div className="mt-3 pt-3 border-t border-hairline/50">
                  <StatusTag status="pending" label="Low Confidence" />
                  {msg.notes && (
                    <p className="font-sans text-xs text-ink-muted mt-2 italic">
                      {msg.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-hairline/50 space-y-2">
                  <p className="font-mono text-xs text-ink-muted uppercase tracking-wider">
                    Sources
                  </p>
                  {msg.citations.map((citation, idx) => (
                    <div
                      key={idx}
                      className="bg-paper p-2 border border-hairline/30 rounded text-xs"
                    >
                      <p className="font-mono font-semibold text-ink">
                        {citation.act}, Section {citation.section_number}
                      </p>
                      {citation.section_title && (
                        <p className="text-ink-muted mt-1">{citation.section_title}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-ink-muted mt-2">
                {msg.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-paper-raised border border-hairline rounded-lg p-3">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-ink rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-ink rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-ink rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-hairline p-4 bg-paper-raised">
        {error && (
          <div className="mb-3 p-2 bg-rust/10 border border-rust/30 rounded text-rust text-xs font-sans">
            {error}
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a tax question..."
            disabled={isLoading}
            className="flex-1 bg-paper border border-hairline p-2 font-sans text-sm focus:outline-none focus:border-ink disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="bg-ink text-paper px-4 py-2 font-mono text-sm disabled:opacity-50 hover:bg-charcoal transition-colors border border-ink"
          >
            {isLoading ? 'Thinking...' : 'Ask'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdvisoryChat;
