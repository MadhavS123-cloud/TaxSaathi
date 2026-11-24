import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';

const WHATSAPP_LIMIT = 1500;

function whatsAppNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return '';
}

export default function WhatsAppSendButton({ draft = '', disabled = false }) {
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const text = draft || '';
  const tooLong = text.length > WHATSAPP_LIMIT;

  const handleSend = () => {
    if (disabled) return;
    const number = whatsAppNumber(phone);
    if (!number) {
      setPhoneError('Enter a valid phone number.');
      return;
    }
    setPhoneError('');
    const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs font-mono uppercase tracking-wider text-ink-muted">
        Phone
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            if (phoneError) setPhoneError('');
          }}
          placeholder="10-digit mobile, or country code"
          disabled={disabled}
          data-cursor="text"
          className="bg-paper border border-hairline px-3 py-2 font-mono text-sm normal-case tracking-normal text-ink placeholder:text-ink-muted focus:outline-none focus:border-brass disabled:opacity-50"
        />
      </label>
      {phoneError && (
        <p className="font-sans text-xs text-rust">{phoneError}</p>
      )}
      {tooLong && (
        <p className="font-sans text-xs text-amber-flag">
          This note is longer than 1,500 characters. WhatsApp may truncate it. Copy the rest manually.
        </p>
      )}
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled}
        data-cursor="interactive"
        className="inline-flex w-fit items-center gap-2 border border-brass bg-paper px-4 py-2 font-sans text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MessageCircle size={16} strokeWidth={1.5} className="text-brass" />
        Send via WhatsApp
      </button>
    </div>
  );
}
