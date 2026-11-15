"""Runtime configuration.

Paths are resolved from this file, so they do not depend on the process
working directory. Model ids are read from the environment. The Gemini API
key is checked by callers when they make a request, not when this module
is imported.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_DIR.parent

load_dotenv(BACKEND_DIR / ".env", override=False)
load_dotenv(REPO_ROOT / ".env", override=False)

# gemini-2.0-flash is retired and returns 404. Both calls default to gemini-3.8-flash.
_DEFAULT_EXTRACT_MODEL = "gemini-3.8-flash"
_DEFAULT_ADVISORY_MODEL = "gemini-3.8-flash"

# Groq models
_DEFAULT_GROQ_ADVISORY_MODEL = "llama-3.1-8b-instant"
_DEFAULT_GROQ_EXTRACT_MODEL = "llama-3.2-11b-vision-preview"


def _env_or_default(name: str, default: str) -> str:
    value = os.getenv(name, "").strip()
    return value or default


GEMINI_MODEL_EXTRACT = _env_or_default("GEMINI_MODEL_EXTRACT", _DEFAULT_EXTRACT_MODEL)
GEMINI_MODEL_ADVISORY = _env_or_default("GEMINI_MODEL_ADVISORY", _DEFAULT_ADVISORY_MODEL)
GROQ_MODEL_ADVISORY = _env_or_default("GROQ_MODEL_ADVISORY", _env_or_default("GROQ_MODEL", _DEFAULT_GROQ_ADVISORY_MODEL))
GROQ_MODEL_EXTRACT = _env_or_default("GROQ_MODEL_EXTRACT", _DEFAULT_GROQ_EXTRACT_MODEL)

# One-to-many partial payments may land later than a one-to-one fuzzy match.
PARTIAL_WINDOW_DAYS = 30


def _resolve_chroma_path() -> Path:
    """Absolute Chroma directory, anchored to this file when the env value is relative."""
    override = os.getenv("CHROMA_PATH", "").strip()
    if not override:
        return (BACKEND_DIR / "data" / "chroma_db").resolve()
    path = Path(override).expanduser()
    if not path.is_absolute():
        path = BACKEND_DIR / path
    return path.resolve()


CHROMA_PATH = _resolve_chroma_path()


def chroma_persist_dir() -> Path:
    """Absolute Chroma directory. Same value as CHROMA_PATH."""
    return CHROMA_PATH


def groq_api_key() -> str:
    """Return the Groq key, or raise a clear error if it is missing."""
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to backend/.env or Render environment variables."
        )
    return key


def groq_advisory_model() -> str:
    return GROQ_MODEL_ADVISORY


def groq_extract_model() -> str:
    return GROQ_MODEL_EXTRACT


def gemini_api_key() -> str:
    """Return the Gemini key, or raise a clear error if it is missing."""
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to backend/.env or the repo-root .env."
        )
    return key


def gemini_extract_model() -> str:
    return GEMINI_MODEL_EXTRACT


def gemini_advisory_model() -> str:
    return GEMINI_MODEL_ADVISORY


def gnani_api_key() -> str:
    """Return the Gnani speech key, or raise a clear error if it is missing."""
    key = os.getenv("GNANI_API_KEY", "").strip()
    if not key:
        raise RuntimeError(
            "GNANI_API_KEY is not set. Add it to backend/.env or the repo-root .env."
        )
    return key
