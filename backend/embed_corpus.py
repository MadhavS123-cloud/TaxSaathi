"""
embed_corpus.py — TaxSaathi embedding pipeline
===============================================
Indexes Indian tax law chunks into ChromaDB using Google Gemini embeddings.
Run directly: python embed_corpus.py
"""

import os
import json
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def build_embedding_function(api_key: str):
    """
    Create a Google Generative AI embedding function for ChromaDB.
    Deferred to runtime to avoid import-time side effects from genai.configure().
    """
    import chromadb
    from chromadb.utils import embedding_functions

    if not api_key:
        logger.warning("GEMINI_API_KEY not set. Falling back to DefaultEmbeddingFunction (local, slower).")
        return embedding_functions.DefaultEmbeddingFunction()

    logger.info("Using Google Gemini embedding-001 model.")
    return embedding_functions.GoogleGenerativeAiEmbeddingFunction(
        api_key=api_key,
        model_name="models/embedding-001"
    )


def load_chunks(processed_dir: str) -> tuple[list, list, list]:
    """Load and flatten all JSON chunk files into parallel lists."""
    chunk_files = [
        "cgst_chunks.json",
        "igst_chunks.json",
        "income_tax_chunks.json",
    ]

    all_documents, all_metadatas, all_ids = [], [], []

    for filename in chunk_files:
        filepath = os.path.join(processed_dir, filename)
        if not os.path.exists(filepath):
            logger.warning("Chunk file not found, skipping: %s", filepath)
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            chunks = json.load(f)

        logger.info("Loaded %d chunks from %s", len(chunks), filename)
        prefix = filename.replace("_chunks.json", "")

        for idx, item in enumerate(chunks):
            text = item.get("text", "").strip()
            if not text:
                continue

            all_documents.append(text)
            all_metadatas.append({
                "act": str(item.get("act", "")),
                "section_number": str(item.get("section_number", "")),
                "section_title": str(item.get("section_title", "")),
                "source_file": str(item.get("source_file", "")),
            })
            all_ids.append(f"{prefix}_sec_{item.get('section_number', idx)}_{idx}")

    return all_documents, all_metadatas, all_ids


def run():
    """Main entry point for the embedding pipeline."""
    import chromadb

    api_key = os.getenv("GEMINI_API_KEY")
    db_dir = os.path.join("data", "chroma_db")
    processed_dir = os.path.join("data", "processed_corpus")

    logger.info("Starting embedding pipeline...")
    logger.info("ChromaDB directory: %s", db_dir)

    # 1. Initialize ChromaDB
    client = chromadb.PersistentClient(path=db_dir)
    embedding_fn = build_embedding_function(api_key)

    collection = client.get_or_create_collection(
        name="indian_tax_laws",
        embedding_function=embedding_fn,
    )

    # 2. Load chunks
    documents, metadatas, ids = load_chunks(processed_dir)
    total = len(documents)
    logger.info("Total chunks ready to index: %d", total)

    if total == 0:
        logger.error("No chunks found. Run chunk_corpus.py first.")
        return

    # 3. Upsert in batches
    batch_size = 100
    for i in range(0, total, batch_size):
        collection.upsert(
            documents=documents[i : i + batch_size],
            metadatas=metadatas[i : i + batch_size],
            ids=ids[i : i + batch_size],
        )
        logger.info("Indexed chunks %d to %d of %d", i + 1, min(i + batch_size, total), total)

    logger.info("SUCCESS: Embedded all %d chunks into %s", total, db_dir)


if __name__ == "__main__":
    run()