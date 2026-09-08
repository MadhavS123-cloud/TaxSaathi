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

RAW_DIR = os.path.join("data", "raw_corpus")
OUT_DIR = os.path.join("data", "processed_corpus")

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
# are NOT mistaken for section headers (a major source of noise in these
# government HTML documents, where every footnote is also a numbered line).
SECTION_PATTERN = re.compile(
    r"^Section\s+(\d{1,4}[A-Z]?)\.?\s*(.*)$"
)

INCOME_TAX_SECTION_PATTERN = re.compile(
    r"^(\d+[a-zA-Z]?)\.\s+(.*)$"
)

# Some sections in this corpus appear as a bare "16." at the very start of
# a paragraph with no "Section" word (mostly Income Tax Act PDF). We detect
# these separately and more strictly: number must be followed by a title
# that looks like a heading (Title Case words, ends without amendment
# citation phrases like "w.e.f." "Notification" "Act, 20" etc).
FOOTNOTE_HINT_PATTERN = re.compile(
    r"\b(Substituted|Inserted|Omitted|Notification|w\.e\.f\.|Brought into force|Act,\s*\d{4})\b",
    re.IGNORECASE,
)


def split_into_sections(text: str, act_name: str, source_file: str) -> list:
    lines = text.split("\n")
    sections = []
    current = None
    is_income_tax = "income_tax" in source_file.lower()
    previous_valid_line = ""

    for raw_line in lines:
        line = raw_line.strip()
        
        if is_income_tax:
            match = INCOME_TAX_SECTION_PATTERN.match(line)
        else:
            match = SECTION_PATTERN.match(line)

        # Reject false positives: a line matching "Section N. ..." pattern
        # but whose title-portion looks like an amendment footnote (rare,
        # but happens when footnote text itself contains the word "Section").
        is_real_section = bool(match) and not FOOTNOTE_HINT_PATTERN.search(
            match.group(2)[:80] if match else ""
        )

        if is_real_section:
            if current:
                sections.append(current)
                
            if is_income_tax:
                section_number = match.group(1)
                section_title = previous_valid_line.strip().rstrip(".-").strip()
            else:
                section_number, section_title = match.groups()
                section_title = section_title.strip().rstrip(".-").strip()
                
            current = {
                "act": act_name,
                "section_number": section_number,
                "section_title": section_title,
                "source_file": source_file,
                "text": raw_line.strip() + "\n",
            }
        else:
            if current:
                current["text"] += raw_line + "\n"
            # else: line appears before the first detected section
            # (preamble, table of contents, or a footnote before any
            # real section has been found) -> skipped

        if line:
            previous_valid_line = line

    if current:
        sections.append(current)

    return sections


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
