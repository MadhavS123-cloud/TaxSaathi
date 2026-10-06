import os
import json
import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

load_dotenv()

print(">>> Starting embedding pipeline with Google Gemini embeddings...")

# 1. Initialize persistent ChromaDB storage
db_dir = os.path.join("data", "chroma_db")
print(f">>> Initializing ChromaDB at: {db_dir}")
client = chromadb.PersistentClient(path=db_dir)

# 2. Configure Google Gemini embedding function (same as advisory.py)
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("ERROR: GEMINI_API_KEY not found in .env file")
    print("Falling back to DefaultEmbeddingFunction (local)")
    embedding_fn = embedding_functions.DefaultEmbeddingFunction()
else:
    print(f">>> Using Google Gemini embedding-001 model")
    embedding_fn = embedding_functions.GoogleGenerativeAiEmbeddingFunction(
        api_key=api_key,
        model_name="models/embedding-001"
    )

collection = client.get_or_create_collection(
    name="indian_tax_laws",
    embedding_function=embedding_fn
)

# 3. Load processed chunk files
processed_dir = os.path.join("data", "processed_corpus")
chunk_files = [
    "cgst_chunks.json",
    "igst_chunks.json",
    "income_tax_chunks.json"
]

all_documents = []
all_metadatas = []
all_ids = []

for filename in chunk_files:
    filepath = os.path.join(processed_dir, filename)
    if not os.path.exists(filepath):
        print(f"[-] Warning: {filename} not found at {filepath}")
        continue

    with open(filepath, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    print(f"[+] Loaded {len(chunks)} chunks from {filename}")

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
            "source_file": str(item.get("source_file", ""))
        })
        all_ids.append(f"{prefix}_sec_{item.get('section_number', idx)}_{idx}")

total = len(all_documents)
print(f"\n>>> Total chunks ready to index: {total}")

if total == 0:
    print("[-] No chunks found to embed.")
    exit()

# 4. Upsert into ChromaDB in batches
batch_size = 100
for i in range(0, total, batch_size):
    batch_docs = all_documents[i : i + batch_size]
    batch_meta = all_metadatas[i : i + batch_size]
    batch_ids = all_ids[i : i + batch_size]

    collection.upsert(
        documents=batch_docs,
        metadatas=batch_meta,
        ids=batch_ids
    )
    print(f"    Indexed chunks {i + 1} to {min(i + batch_size, total)} of {total}")

print(f"\n[SUCCESS] Successfully embedded all {total} chunks into {db_dir}!")