"""Map a Prisma transcript to one voice job. No model call."""

import re

_REJECT = ("reject", "rejected", "mana karo", "mat approve", "approve mat", "रिजेक्ट")
_APPROVE = ("approve", "approved", "manzoor", "manzur", "अप्रूव", "मंजूर")
_REMIND = ("reminder", "remind", "yaad", "yad dilao", "रिमाइंडर")
_PARTIAL = ("partly", "partial", "partially", "आंशिक")
_UNPAID = ("baaki", "baki", "बाकी", "unpaid", "shortfall")


def parse_intent(transcript: str) -> str:
    """Return query_partial, query_unpaid, approve, reject, remind, or unknown."""
    text = (transcript or "").lower().replace("-", " ")
    if any(token in text for token in _REJECT):
        return "reject"
    if any(token in text for token in _APPROVE):
        return "approve"
    if any(token in text for token in _REMIND):
        return "remind"
    if any(token in text for token in _PARTIAL):
        return "query_partial"
    if any(token in text for token in _UNPAID):
        return "query_unpaid"
    return "unknown"


def spoken_client(transcript: str) -> str | None:
    """Name before 'ke' in 'Sharma Traders ke kaun se invoice...'."""
    match = re.search(r"(.+?)\s+ke\s+", transcript or "", flags=re.IGNORECASE)
    if not match:
        return None
    name = match.group(1).strip(" ?.!,")
    if name.lower() in {"yeh", "ye", "yah", "this", "kaun", "kaunse", "konsa"}:
        return None
    return name or None
