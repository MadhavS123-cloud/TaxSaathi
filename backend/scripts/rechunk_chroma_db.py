"""
backend/scripts/rechunk_chroma_db.py
Idempotent sub-section re-chunking directly from ChromaDB.
Fixes 256-token silent truncation by breaking long statutory sections into
sub-sections, clauses, and provisos <= 950 characters with context breadcrumb headers.
"""

import os
import re
import shutil
import sys
from pathlib import Path

# Add backend directory to path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import chromadb
from config import CHROMA_PATH
from advisory import LocalChromaEmbedder, _COLLECTION_NAME

BACKUP_DIR = BACKEND_DIR / "data" / "chroma_db_backup"
TARGET_CHUNK_SIZE = 800  # Target body length
MAX_TOTAL_CHUNK_LEN = 950  # Hard ceiling for header + body to fit inside 256 tokens
OVERLAP_LEN = 100


def backup_chroma_db():
    """Safely back up chroma_db if not already backed up."""
    source_dir = Path(CHROMA_PATH)
    if not source_dir.exists():
        print(f"[Backup] Source ChromaDB path '{source_dir}' does not exist. Nothing to backup.")
        return

    if BACKUP_DIR.exists():
        print(f"[Backup] Backup directory '{BACKUP_DIR}' already exists. Skipping overwrite.")
    else:
        print(f"[Backup] Creating backup from '{source_dir}' to '{BACKUP_DIR}'...")
        shutil.copytree(source_dir, BACKUP_DIR)
        print(f"[Backup] Backup created successfully.")


def clean_text_for_split(text: str) -> str:
    """Normalize text and remove any preexisting breadcrumb header."""
    header_pattern = r"^[\w\s\-,]+ \|\s*Section\s*[\w\d\(\)]+\s*\|\s*\n?"
    return re.sub(header_pattern, "", text.strip()).strip()


def split_text_hierarchically(text: str, max_body_len: int) -> list[str]:
    """
    Split text respecting statutory hierarchy:
      1. Sub-sections: (?=\n?\s*\(\d+\)\s+)
      2. Clauses: (?=\n?\s*\([a-z]{1,2}\)\s+)
      3. Provisos & Explanations: (?=\n?\s*(?:Provided that|Provided further that|Explanation\s*\d*\.?))
      4. Paragraphs (\n\n, \n)
      5. Sentences (. )
      6. Overlapping window fallback
    """
    if len(text) <= max_body_len:
        return [text]

    # Level 1: Sub-sections
    sub_sec_splits = [s.strip() for s in re.split(r"(?=\n?\s*\(\d+\)\s+)", text) if s.strip()]
    if len(sub_sec_splits) > 1:
        chunks = []
        for part in sub_sec_splits:
            if len(part) <= max_body_len:
                chunks.append(part)
            else:
                chunks.extend(split_by_clauses(part, max_body_len))
        return merge_tiny_chunks(chunks, max_body_len)

    return split_by_clauses(text, max_body_len)


def split_by_clauses(text: str, max_body_len: int) -> list[str]:
    """Level 2: Clauses & sub-clauses."""
    if len(text) <= max_body_len:
        return [text]

    clause_splits = [s.strip() for s in re.split(r"(?=\n?\s*\([a-z]{1,2}\)\s+)", text) if s.strip()]
    if len(clause_splits) > 1:
        chunks = []
        for part in clause_splits:
            if len(part) <= max_body_len:
                chunks.append(part)
            else:
                chunks.extend(split_by_provisos(part, max_body_len))
        return merge_tiny_chunks(chunks, max_body_len)

    return split_by_provisos(text, max_body_len)


def split_by_provisos(text: str, max_body_len: int) -> list[str]:
    """Level 3: Provisos & Explanations."""
    if len(text) <= max_body_len:
        return [text]

    proviso_splits = [s.strip() for s in re.split(r"(?=\n?\s*(?:Provided that|Provided further that|Explanation\s*\d*\.?))", text) if s.strip()]
    if len(proviso_splits) > 1:
        chunks = []
        for part in proviso_splits:
            if len(part) <= max_body_len:
                chunks.append(part)
            else:
                chunks.extend(split_by_paragraphs(part, max_body_len))
        return merge_tiny_chunks(chunks, max_body_len)

    return split_by_paragraphs(text, max_body_len)


def split_by_paragraphs(text: str, max_body_len: int) -> list[str]:
    """Level 4: Paragraphs."""
    if len(text) <= max_body_len:
        return [text]

    para_splits = [s.strip() for s in re.split(r"\n\s*\n|\n", text) if s.strip()]
    if len(para_splits) > 1:
        chunks = []
        for part in para_splits:
            if len(part) <= max_body_len:
                chunks.append(part)
            else:
                chunks.extend(split_by_sentences(part, max_body_len))
        return merge_tiny_chunks(chunks, max_body_len)

    return split_by_sentences(text, max_body_len)


def split_by_sentences(text: str, max_body_len: int) -> list[str]:
    """Level 5: Sentences."""
    if len(text) <= max_body_len:
        return [text]

    sent_splits = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    if len(sent_splits) > 1:
        chunks = []
        for part in sent_splits:
            if len(part) <= max_body_len:
                chunks.append(part)
            else:
                chunks.extend(split_by_window(part, max_body_len))
        return merge_tiny_chunks(chunks, max_body_len)

    return split_by_window(text, max_body_len)


def split_by_window(text: str, max_body_len: int) -> list[str]:
    """Level 6: Hard character window with overlap."""
    chunks = []
    start = 0
    stride = max_body_len - OVERLAP_LEN
    while start < len(text):
        end = min(start + max_body_len, len(text))
        chunks.append(text[start:end].strip())
        if end >= len(text):
            break
        start += stride
    return chunks


def merge_tiny_chunks(chunks: list[str], max_body_len: int) -> list[str]:
    """Merge small fragments (<180 chars) into adjacent chunk if total <= max_body_len."""
    if not chunks:
        return []

    merged = []
    current = chunks[0]

    for nxt in chunks[1:]:
        if len(current) < 180 and (len(current) + len(nxt) + 1 <= max_body_len):
            current = f"{current}\n{nxt}"
        elif len(nxt) < 180 and (len(current) + len(nxt) + 1 <= max_body_len):
            current = f"{current}\n{nxt}"
        else:
            merged.append(current)
            current = nxt

    if current:
        merged.append(current)

    return merged


def rechunk_all_records():
    """Main rechunking pipeline."""
    backup_chroma_db()

    embedder = LocalChromaEmbedder()
    chroma_path_str = str(CHROMA_PATH)
    client = chromadb.PersistentClient(path=chroma_path_str)

    print(f"\n[Rechunk] Opening collection '{_COLLECTION_NAME}'...")
    old_coll = client.get_or_create_collection(
        name=_COLLECTION_NAME,
        embedding_function=embedder.ef,
        metadata={"hnsw:space": "cosine"}
    )

    old_count = old_coll.count()
    print(f"[Rechunk] Extracting {old_count} existing records...")
    records = old_coll.get(include=["documents", "metadatas"])
    old_ids = records.get("ids", [])
    old_docs = records.get("documents", [])
    old_metas = records.get("metadatas", [])

    new_ids = []
    new_docs = []
    new_metas = []

    for orig_id, full_text, orig_meta in zip(old_ids, old_docs, old_metas):
        meta_dict = dict(orig_meta or {})
        act_name = meta_dict.get("act") or meta_dict.get("act_name") or "Indian Tax Law"
        section = meta_dict.get("section_number") or meta_dict.get("section") or "General"

        header = f"{act_name} | Section {section} |"
        max_body_len = MAX_TOTAL_CHUNK_LEN - len(header) - 2

        clean_text = clean_text_for_split(full_text)
        sub_chunks = split_text_hierarchically(clean_text, max_body_len)

        for idx, sub_body in enumerate(sub_chunks):
            # Check length ceiling
            candidate = f"{header}\n{sub_body}"
            if len(candidate) > MAX_TOTAL_CHUNK_LEN:
                sub_body = sub_body[:MAX_TOTAL_CHUNK_LEN - len(header) - 5] + "..."
                candidate = f"{header}\n{sub_body}"

            sub_id = f"{orig_id}_sub_{idx}" if len(sub_chunks) > 1 else orig_id

            sub_meta = dict(meta_dict)
            sub_meta["act"] = act_name
            sub_meta["act_name"] = act_name
            sub_meta["section_number"] = str(section)
            sub_meta["section"] = str(section)
            sub_meta["parent_chunk_id"] = str(orig_id)
            sub_meta["sub_chunk_index"] = idx

            new_ids.append(sub_id)
            new_docs.append(candidate)
            new_metas.append(sub_meta)

    print(f"[Rechunk] Rechunked {old_count} original records into {len(new_ids)} sub-chunks.")

    # Recreate the collection
    print(f"[Rechunk] Resetting collection '{_COLLECTION_NAME}'...")
    client.delete_collection(_COLLECTION_NAME)
    new_coll = client.create_collection(
        name=_COLLECTION_NAME,
        embedding_function=embedder.ef,
        metadata={"hnsw:space": "cosine"}
    )

    batch_size = 150
    total = len(new_ids)
    print(f"[Rechunk] Embedding and upserting in batches of {batch_size}...")
    for i in range(0, total, batch_size):
        end = min(i + batch_size, total)
        new_coll.add(
            ids=new_ids[i:end],
            documents=new_docs[i:end],
            metadatas=new_metas[i:end],
        )
        print(f"  Processed {end}/{total} sub-chunks...")

    # Verification & Diagnostics
    final_count = new_coll.count()
    max_len = max(len(d) for d in new_docs)
    print("\n" + "=" * 60)
    print("FINAL RECHUNKING DIAGNOSTICS")
    print("=" * 60)
    print(f"Total Old Chunks:       {old_count}")
    print(f"Total New Sub-Chunks:   {final_count}")
    print(f"Max Chunk Length:       {max_len} chars (Must be <= {MAX_TOTAL_CHUNK_LEN})")
    assert max_len <= MAX_TOTAL_CHUNK_LEN, f"Max chunk length {max_len} exceeds {MAX_TOTAL_CHUNK_LEN}"

    # Verify motor vehicles in cgst_sec_17 sub-chunks
    sec_17_records = new_coll.get(where={"section_number": "17"}, include=["documents", "metadatas"])
    mv_found = False
    for cid, doc, m in zip(sec_17_records["ids"], sec_17_records["documents"], sec_17_records["metadatas"]):
        if "motor vehicle" in doc.lower() and "CGST" in m.get("act", ""):
            mv_found = True
            print(f"✅ Verified Motor Vehicles Sub-chunk found: ID={cid} (length={len(doc)})")
            print(f"   Excerpt: {doc[:140]}...")
            break

    assert mv_found, "FAILED: No sub-chunk for Section 17 CGST explicitly contains 'motor vehicle'!"
    print("\n✅ Re-chunking completed successfully with zero silent truncation!")


if __name__ == "__main__":
    rechunk_all_records()
