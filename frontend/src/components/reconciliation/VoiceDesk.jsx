import React, { useState } from "react";
import { Mic, Square, Volume2 } from "lucide-react";
import { api } from "../../lib/api";
import { useVoiceRecorder } from "../../lib/useVoiceRecorder";

function playWav(base64) {
  const audio = new Audio(`data:audio/wav;base64,${base64}`);
  return audio.play();
}

export default function VoiceDesk({ caseId, selectedRow, onReviewed }) {
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("hi-IN");
  const { listening, start, stop } = useVoiceRecorder();

  const ask = async () => {
    if (!caseId) {
      setError("Choose a case before speaking.");
      return;
    }
    setError("");
    if (listening) {
      stop();
      return;
    }
    let wav;
    try {
      wav = await start();
    } catch {
      setError("The microphone is not available.");
      return;
    }
    setBusy(true);
    try {
      const rowKey = selectedRow?.invoice?.id || selectedRow?.payment?.id || "";
      const result = await api.voice.turn(caseId, wav, rowKey);
      setTranscript(result.transcript || "");
      setAnswer(result.answer || "");
      if (result.audio_base64) await playWav(result.audio_base64);
      if (result.review_status && rowKey && onReviewed) {
        onReviewed(rowKey, result.review_status);
      }
    } catch (err) {
      setError(err.message || "The voice request failed.");
    } finally {
      setBusy(false);
    }
  };

  const remind = async () => {
    if (!caseId) {
      setError("Choose a case before speaking a reminder.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api.voice.remind(caseId, language);
      setAnswer(result.answer || "");
      if (result.audio_base64) await playWav(result.audio_base64);
    } catch (err) {
      setError(err.message || "The reminder failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="voice" className="rounded-2xl border border-hairline bg-paper-raised p-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-hairline pb-4 mb-4">
        <div>
          <h2 className="font-serif text-xl">Voice desk</h2>
          <p className="text-ink-muted text-sm mt-1">
            Ask in Hindi or Hinglish about partly paid invoices. Approve or reject the selected exception by saying so. Amounts are calculated from the ledger.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={ask}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-[#1C1915] px-4 py-2 font-sans text-xs text-[#F4F1EA] disabled:opacity-50"
          >
            {listening ? <Square size={14} /> : <Mic size={14} />}
            {listening ? "Stop" : "Ask"}
          </button>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="bg-paper border border-hairline font-mono text-xs py-2 px-2"
            aria-label="Client reminder language"
          >
            <option value="hi-IN">Hindi</option>
            <option value="en-IN">English</option>
          </select>
          <button
            type="button"
            onClick={remind}
            disabled={busy}
            className="border border-ink px-4 py-2 font-mono text-xs disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Volume2 size={14} />
            Speak reminder
          </button>
        </div>
      </div>
      <p className="text-xs font-mono text-ink-muted">
        {selectedRow
          ? `Selected exception: ${selectedRow.invoice?.reference || selectedRow.invoice?.id || selectedRow.payment?.id}`
          : "Select an exception before approve or reject."}
      </p>
      {transcript && <p className="mt-3 text-sm text-ink">Heard: {transcript}</p>}
      {answer && <p className="mt-2 text-sm font-serif text-ink">{answer}</p>}
      {error && <p className="mt-2 text-sm text-rust">{error}</p>}
    </section>
  );
}
