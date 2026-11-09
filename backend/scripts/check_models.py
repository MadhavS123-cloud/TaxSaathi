"""List flash models for this Gemini key, then probe a fixed set of model ids.

Run from the repo root with the backend venv active. Does not change app code.
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import gemini_api_key
from google import genai

PROBE_IDS = (
    "gemini-2.0-flash",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
)


def main() -> None:
    client = genai.Client(api_key=gemini_api_key())

    print("Flash models that support generateContent:")
    for model in client.models.list():
        name = model.name or ""
        actions = model.supported_actions or []
        if "flash" in name and "generateContent" in actions:
            print(name)

    print()
    print("Probe:")
    for model_id in PROBE_IDS:
        try:
            client.models.generate_content(model=model_id, contents="Reply with OK")
        except Exception as exc:
            print(f"{model_id} FAIL {exc}")
        else:
            print(f"{model_id} PASS")


if __name__ == "__main__":
    main()
