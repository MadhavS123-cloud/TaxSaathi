"""Speak rupee amounts as words so Timbre does not invent a pronunciation."""

from decimal import Decimal, ROUND_HALF_UP

_UNDER_100 = (
    "shunya", "ek", "do", "teen", "char", "paanch", "chhah", "saat", "aath", "nau",
    "das", "gyarah", "barah", "terah", "chaudah", "pandrah", "solah", "satrah", "atharah", "unnis",
    "bees", "ikkees", "baees", "teis", "chaubees", "pachees", "chhabees", "sattaees", "atthaees", "unatees",
    "tees", "ikatees", "battees", "taintees", "chauntees", "paintees", "chhattees", "saintees", "adtees", "untaalees",
    "chalees", "iktaalees", "bayaalees", "taintaalees", "chawaalees", "paintaalees", "chhiyaalees", "saintaalees", "adtaalees", "unchaas",
    "pachaas", "ikyaavan", "baavan", "tirpan", "chauvan", "pachpan", "chhappan", "sattaavan", "athaavan", "unsath",
    "saath", "iksath", "baasath", "tirsath", "chausath", "painsath", "chhiyasath", "sadsath", "adsath", "unhattar",
    "sattar", "ikhattar", "bahattar", "tihattar", "chauhattar", "pachhattar", "chhihattar", "satattar", "athattar", "unaasi",
    "assi", "ikyaasi", "bayaasi", "tiraasi", "chauraasi", "pachaasi", "chhiyaasi", "sataasi", "athaasi", "navaasi",
    "nabbe", "ikyaanve", "baanve", "tiraanve", "chauraanve", "pachaanve", "chhiyaanve", "sataanve", "athanve", "ninyaanve",
)

_EN_ONES = (
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
)
_EN_TENS = ("", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety")


def parse_money(value) -> Decimal:
    """Read a stored amount. Commas and a rupee sign are ignored."""
    if value is None or value == "":
        return Decimal("0")
    text = str(value).replace(",", "").replace("₹", "").strip()
    return Decimal(text)


def count_words(count: int) -> str:
    """Hinglish word for a small count. Larger counts use the rupee-word scale."""
    if 0 <= count < 100:
        return _UNDER_100[count]
    return _scale_words(count)


def inr_words(amount: Decimal) -> str:
    """Spoken Hinglish for an amount, rounded to the nearest rupee."""
    rupees = int(amount.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    if rupees < 0:
        return "minus " + inr_words(Decimal(-rupees))
    return _scale_words(rupees) + " rupaye"


def english_count(count: int) -> str:
    if count < 0:
        return "minus " + english_count(-count)
    return _english_words(count)


def english_inr(amount: Decimal) -> str:
    rupees = int(amount.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    if rupees < 0:
        return "minus " + english_inr(Decimal(-rupees))
    return _english_words(rupees) + " rupees"


def _scale_words(n: int) -> str:
    if n < 100:
        return _UNDER_100[n]
    parts = []
    crore, n = divmod(n, 10_000_000)
    lakh, n = divmod(n, 100_000)
    hazar, n = divmod(n, 1_000)
    sau, n = divmod(n, 100)
    if crore:
        parts.append(f"{_UNDER_100[crore]} crore")
    if lakh:
        parts.append(f"{_UNDER_100[lakh]} lakh")
    if hazar:
        parts.append(f"{_UNDER_100[hazar]} hazar")
    if sau:
        parts.append(f"{_UNDER_100[sau]} sau")
    if n:
        parts.append(_UNDER_100[n])
    return " ".join(parts)


def _english_words(n: int) -> str:
    if n < 20:
        return _EN_ONES[n]
    if n < 100:
        tens, ones = divmod(n, 10)
        return _EN_TENS[tens] if ones == 0 else f"{_EN_TENS[tens]} {_EN_ONES[ones]}"
    parts = []
    crore, n = divmod(n, 10_000_000)
    lakh, n = divmod(n, 100_000)
    thousand, n = divmod(n, 1_000)
    hundred, n = divmod(n, 100)
    if crore:
        parts.append(f"{_english_words(crore)} crore")
    if lakh:
        parts.append(f"{_english_words(lakh)} lakh")
    if thousand:
        parts.append(f"{_english_words(thousand)} thousand")
    if hundred:
        parts.append(f"{_english_words(hundred)} hundred")
    if n:
        parts.append(_english_words(n))
    return " ".join(parts)
