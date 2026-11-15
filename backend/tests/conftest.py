"""Put the backend directory on sys.path so tests import schemas and routes."""

import os
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

os.environ.setdefault("GROQ_API_KEY", "gsk_mock_test_key_for_offline_tests")


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "live: needs live Gemini and Chroma; skipped unless RUN_LIVE_TESTS=1",
    )
