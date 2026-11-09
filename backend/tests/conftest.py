"""Put the backend directory on sys.path so tests import schemas and routes."""

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "live: needs live Gemini and Chroma; skipped unless RUN_LIVE_TESTS=1",
    )
