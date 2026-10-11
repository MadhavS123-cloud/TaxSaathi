"""
chunk_corpus.py

Reads the three raw source documents and splits them into section-level
chunks with metadata (act name, section number, section title), ready
for embedding into ChromaDB.

Input:
    data/raw_corpus/cgst_act_2022.html
    data/raw_corpus/igst_act_2020.html
    data/raw_corpus/income_tax_act_2025.pdf

Output:
    data/processed_corpus/cgst_chunks.json
    data/processed_corpus/igst_chunks.json
    data/processed_corpus/income_tax_chunks.json

Usage:
    pip install beautifulsoup4 pdfplumber --break-system-packages
    python chunk_corpus.py
"""

import os
import re
import json
from bs4 import BeautifulSoup

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

def _resolve_dir(subpath: str) -> str:
    for candidate in [subpath, os.path.join("..", subpath)]:
        if os.path.exists(candidate):
            return candidate
    return subpath

RAW_DIR = _resolve_dir(os.path.join("data", "raw_corpus"))
OUT_DIR = _resolve_dir(os.path.join("data", "processed_corpus"))

# Max characters per chunk before we split further by sub-section.
# Keeps embeddings focused; very long sections get broken down but
# still tagged with the same section number/title.
MAX_CHUNK_CHARS = 25000


# ---------------------------------------------------------------------------
# TEXT EXTRACTION
# ---------------------------------------------------------------------------

def html_to_text(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    for tag in soup(["script", "style", "nav", "header", "footer", "noscript"]):
        tag.decompose()

    text = soup.get_text(separator="\n")
    lines = [line.strip() for line in text.splitlines()]
    lines = [line for line in lines if line]
    return "\n".join(lines)


def pdf_to_text(path: str) -> str:
    if pdfplumber is None:
        raise RuntimeError("pdfplumber not installed. Run: pip install pdfplumber --break-system-packages")

    all_text = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                all_text.append(page_text)
    return "\n".join(all_text)


# ---------------------------------------------------------------------------
# SECTION SPLITTING
# ---------------------------------------------------------------------------

# Matches ONLY real section headers, e.g.:
#   "Section 16. Eligibility and conditions for taking input tax credit."
#   "Section 43A. Procedure for furnishing return..."
# Deliberately requires the literal word "Section" so that amendment
# footnote markers like "3. Substituted for ..." or "11. Omitted (w.e.f. ...)"
# are NOT mistaken for section headers.
SECTION_PATTERN = re.compile(
    r"^Section\s+(\d{1,4}[A-Z]?)\.?\s*(.*)$"
)

INCOME_TAX_SECTION_PATTERN = re.compile(
    r"^(\d+[a-zA-Z]?)\.\s+(.*)$"
)

# Matches a section title line: short, title-case, not a footnote
SECTION_TITLE_PATTERN = re.compile(
    r"^[A-Z][A-Za-z\s,\-\'\(\)]{3,80}$"
)

FOOTNOTE_HINT_PATTERN = re.compile(
    r"\b(Substituted|Inserted|Omitted|Notification|w\.e\.f\.|Brought into force|Act,\s*\d{4})\b",
    re.IGNORECASE,
)

# Patterns that indicate the current line is NOT a meaningful section title
# (common PDF extraction artifacts)
ARTIFACT_HINT_PATTERN = re.compile(
    r"^(and upto|or more|per cent|rupees|\d+[,\s]*\d+|page \d+)",
    re.IGNORECASE,
)


def split_into_sections(text: str, act_name: str, source_file: str) -> list:
    lines = text.split("\n")
    sections = []
    current = None
    is_income_tax = "income_tax" in source_file.lower()
    previous_valid_line = ""
    pending_title_lookup = False  # True right after a CGST section header line

    for raw_line in lines:
        line = raw_line.strip()

        if is_income_tax:
            match = INCOME_TAX_SECTION_PATTERN.match(line)
        else:
            match = SECTION_PATTERN.match(line)

        # Reject false positives
        is_real_section = bool(match) and not FOOTNOTE_HINT_PATTERN.search(
            match.group(2)[:80] if match else ""
        )

        if is_real_section:
            if current:
                sections.append(current)

            if is_income_tax:
                section_number = match.group(1)
                # For IT Act, the title is in the match group itself (e.g. "4. Charge of Income-tax")
                inline_title = match.group(2).strip().rstrip(".-").strip()
                # Reject PDF garbage titles
                if ARTIFACT_HINT_PATTERN.search(inline_title):
                    inline_title = ""
                section_title = inline_title
            else:
                # CGST/IGST: "Section 16" appears alone; the real title is on the NEXT non-empty line
                section_number, inline_title = match.groups()
                inline_title = inline_title.strip().rstrip(".-").strip()
                section_title = inline_title  # may be overwritten by next line below
                pending_title_lookup = True

            current = {
                "act": act_name,
                "section_number": section_number,
                "section_title": section_title,
                "source_file": source_file,
                "text": raw_line.strip() + "\n",
            }
        else:
            # For CGST/IGST: if this is the first content line after a section header,
            # use it as the section title if it looks like one.
            if pending_title_lookup and current and line:
                if (
                    not FOOTNOTE_HINT_PATTERN.search(line)
                    and not ARTIFACT_HINT_PATTERN.search(line)
                    and len(line) < 120
                    and not current["section_title"]
                ):
                    current["section_title"] = line.rstrip(".\n").strip()
                pending_title_lookup = False

            if current:
                current["text"] += raw_line + "\n"

        if line:
            previous_valid_line = line
            if not is_real_section:
                pending_title_lookup = False  # reset after non-section real content

    if current:
        sections.append(current)

    # Filter out Table of Contents stubs:
    # 1. Reject chunks with less than 150 characters that have only 1-2 lines (just section header + title).
    # 2. When duplicate section numbers appear (e.g. TOC stub vs substantive section body),
    #    keep the substantive section and retain the best section title.
    valid_sections = []
    seen = {}
    for s in sections:
        text = s["text"].strip()
        lines = [l for l in text.split("\n") if l.strip()]
        if len(text) < 150 and len(lines) <= 2:
            continue

        sec_key = (s["act"], s["section_number"])
        if sec_key in seen:
            prev_idx = seen[sec_key]
            if len(text) > len(valid_sections[prev_idx]["text"]):
                if not s.get("section_title") and valid_sections[prev_idx].get("section_title"):
                    s["section_title"] = valid_sections[prev_idx]["section_title"]
                valid_sections[prev_idx] = s
        else:
            seen[sec_key] = len(valid_sections)
            valid_sections.append(s)

    return valid_sections


def split_oversized_section(section: dict) -> list:
    """If a section's text is too long, split further by sub-section
    markers like (1), (2), (a), (b) while keeping the same metadata."""
    text = section["text"]
    if len(text) <= MAX_CHUNK_CHARS:
        return [section]

    # Split on sub-section markers e.g. "(1)", "(2)" at start of line
    sub_pattern = re.compile(r"(?=^\(\d+[a-zA-Z]?\))", re.MULTILINE)
    parts = sub_pattern.split(text)
    parts = [p.strip() for p in parts if p.strip()]

    if len(parts) <= 1:
        # No sub-section markers found -> hard-split by character count
        parts = [text[i:i + MAX_CHUNK_CHARS] for i in range(0, len(text), MAX_CHUNK_CHARS)]

    chunks = []
    for i, part in enumerate(parts):
        chunk = dict(section)  # copy metadata
        chunk["text"] = part
        chunk["part"] = i + 1
        chunks.append(chunk)
    return chunks


def merge_consecutive_chunks(chunks: list) -> list:
    """Merge consecutive chunks that belong to the same section back
    into a single chunk, as long as the combined text stays under
    MAX_CHUNK_CHARS.  This dramatically reduces the total chunk count
    while keeping each chunk semantically coherent (same section)."""
    if not chunks:
        return chunks

    merged = [dict(chunks[0])]
    for chunk in chunks[1:]:
        prev = merged[-1]
        same_section = (
            prev["act"] == chunk["act"]
            and prev["section_number"] == chunk["section_number"]
        )
        combined_len = len(prev["text"]) + len(chunk["text"])

        if same_section and combined_len <= MAX_CHUNK_CHARS:
            prev["text"] = prev["text"].rstrip("\n") + "\n" + chunk["text"]
            prev.pop("part", None)  # no longer a sub-part
        else:
            merged.append(dict(chunk))

    return merged


def chunk_document(raw_text: str, act_name: str, source_file: str) -> list:
    sections = split_into_sections(raw_text, act_name, source_file)
    split_chunks = []
    for section in sections:
        split_chunks.extend(split_oversized_section(section))
    # Merge small consecutive chunks from the same section
    return merge_consecutive_chunks(split_chunks)


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def process(input_filename: str, act_name: str, output_filename: str, is_pdf: bool):
    input_path = os.path.join(RAW_DIR, input_filename)
    if not os.path.exists(input_path):
        print(f"  SKIP: {input_filename} not found in {RAW_DIR}")
        return

    print(f"Processing {input_filename} ({act_name}) ...")
    raw_text = pdf_to_text(input_path) if is_pdf else html_to_text(input_path)
    chunks = chunk_document(raw_text, act_name, input_filename)

    output_path = os.path.join(OUT_DIR, output_filename)
    with open(output_path, "w", encoding="utf-8") as f:
        # Write one chunk per line for compact output (~1 line per chunk)
        f.write("[\n")
        for i, chunk in enumerate(chunks):
            line = json.dumps(chunk, ensure_ascii=False)
            f.write("  " + line)
            if i < len(chunks) - 1:
                f.write(",")
            f.write("\n")
        f.write("]\n")

    print(f"  -> {len(chunks)} chunks saved to {output_path}")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    process("cgst_act_2022.html", "CGST Act, 2017", "cgst_chunks.json", is_pdf=False)
    process("igst_act_2020.html", "IGST Act, 2017", "igst_chunks.json", is_pdf=False)
    process("income_tax_act_2025.pdf", "Income-tax Act, 2025", "income_tax_chunks.json", is_pdf=True)

    print("\nDone. Spot-check a few chunks in data/processed_corpus/ before embedding.")


if __name__ == "__main__":
    main()
