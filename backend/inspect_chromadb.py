import os
import chromadb

db_dir = os.path.join("data", "chroma_db")
print(f"Connecting to ChromaDB at {db_dir}...")
try:
    client = chromadb.PersistentClient(path=db_dir)
    collections = client.list_collections()
    print("Collections found in ChromaDB:")
    if not collections:
        print("  [No collections found]")
    for col in collections:
        print(f"  - {col.name}")
except Exception as e:
    print(f"Error accessing ChromaDB: {e}")
