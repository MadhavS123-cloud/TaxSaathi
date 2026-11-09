"""Gnani Prisma transcription and Timbre speech. Amounts are not asked of either model."""

import httpx

from config import gnani_api_key

STT_URL = "https://api.vachana.ai/stt/v3"
TTS_URL = "https://api.vachana.ai/api/v1/tts/inference"
PRISMA_MODEL = "prisma-v3.0"
TIMBRE_MODEL = "timbre-v2.5"
TIMBRE_VOICE = "Nalini"


class SpeechError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def transcribe(audio: bytes, filename: str) -> str:
    """Transcribe a short clip. Prisma v3 transliterates Hindi and Hinglish into Latin letters."""
    if not audio:
        raise SpeechError("The recording was empty.", 400)
    try:
        response = httpx.post(
            STT_URL,
            headers={"X-API-Key-ID": gnani_api_key()},
            files={"audio_file": (filename or "speech.wav", audio, "audio/wav")},
            data={
                "model": PRISMA_MODEL,
                "language_code": "hi-IN,en-IN",
                "format": "transliterate",
            },
            timeout=60,
        )
    except httpx.HTTPError as exc:
        raise SpeechError("Prisma could not be reached.") from exc
    if response.status_code >= 400:
        raise SpeechError("Prisma could not transcribe that recording.", response.status_code)
    body = response.json()
    return str(body.get("transcript") or "").strip()


def synthesize(text: str, language: str = "hi-IN") -> bytes:
    """Read `text` aloud. The caller builds the text, including every amount."""
    try:
        response = httpx.post(
            TTS_URL,
            headers={"X-API-Key-ID": gnani_api_key(), "Content-Type": "application/json"},
            json={
                "text": text,
                "voice": TIMBRE_VOICE,
                "model": TIMBRE_MODEL,
                "language": language,
                "speed": 1.0,
                "audio_config": {
                    "sample_rate": 24000,
                    "num_channels": 1,
                    "sample_width": 2,
                    "encoding": "linear_pcm",
                    "container": "wav",
                },
            },
            timeout=60,
        )
    except httpx.HTTPError as exc:
        raise SpeechError("Timbre could not be reached.") from exc
    if response.status_code >= 400 or not response.content:
        raise SpeechError("Timbre could not read that answer.", response.status_code)
    return response.content
