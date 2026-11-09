import os
import chromadb

from config import chroma_persist_dir

db_dir = str(chroma_persist_dir())
print(f"Checking ChromaDB directory: {db_dir}")

if not os.path.exists(db_dir):
    print("PROOF: ChromaDB directory does not exist at all.")
else:
    client = chromadb.PersistentClient(path=db_dir)
    collections = client.list_collections()
    print(f"Collections found: {[c.name for c in collections]}")
    
    try:
        col = client.get_collection("indian_tax_laws")
        count = col.count()
        print(f"PROOF: Collection 'indian_tax_laws' exists and has {count} items.")
        if count > 0:
            sample = col.peek(1)
            print("Sample metadata:", sample.get("metadatas"))
    except Exception as e:
        print(f"PROOF: Collection 'indian_tax_laws' could not be accessed. Error: {e}")
