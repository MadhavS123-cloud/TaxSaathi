"""List models for Groq / Gemini key, then probe a fixed set of model ids.

Run from the repo root with the backend venv active. Does not change app code.
"""

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

GROQ_PROBE_IDS = (
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
)

GEMINI_PROBE_IDS = (
    "gemini-2.0-flash",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
)


def probe_groq(key: str) -> None:
    from groq import Groq

    client = Groq(api_key=key)
    print("=== Groq Models Probe ===")
    for model_id in GROQ_PROBE_IDS:
        try:
            resp = client.chat.completions.create(
                model=model_id,
                messages=[{"role": "user", "content": "Reply with OK"}],
                max_tokens=10,
            )
            print(f"[Groq] {model_id} PASS -> {resp.choices[0].message.content.strip()[:20]}")
        except Exception as exc:
            print(f"[Groq] {model_id} FAIL: {exc}")


def probe_gemini(key: str) -> None:
    from google import genai

    client = genai.Client(api_key=key)
    print("=== Gemini Models Probe ===")
    for model_id in GEMINI_PROBE_IDS:
        try:
            client.models.generate_content(model=model_id, contents="Reply with OK")
            print(f"[Gemini] {model_id} PASS")
        except Exception as exc:
            print(f"[Gemini] {model_id} FAIL: {exc}")


def main() -> None:
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not groq_key and not gemini_key:
        print("Neither GROQ_API_KEY nor GEMINI_API_KEY is set in environment or .env")
        return

    if groq_key:
        probe_groq(groq_key)
        print()

    if gemini_key:
        probe_gemini(gemini_key)


if __name__ == "__main__":
    main()
