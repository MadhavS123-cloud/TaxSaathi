import os
import chromadb
from chromadb.utils import embedding_functions

# 1. Connect to ChromaDB
db_dir = os.path.join("data", "chroma_db")
client = chromadb.PersistentClient(path=db_dir)
embedding_fn = embedding_functions.DefaultEmbeddingFunction()

collection = client.get_collection(
    name="indian_tax_laws",
    embedding_function=embedding_fn
)

# 2. Test query
test_query = "What is the standard deduction limit allowed under salary?"
print(f"Query: '{test_query}'\n" + "-" * 50)

results = collection.query(
    query_texts=[test_query],
    n_results=3
)

# 3. Print matches
for i in range(len(results["documents"][0])):
    doc = results["documents"][0][i]
    meta = results["metadatas"][0][i]
    print(f"\n[Match {i + 1}]")
    print(f"Act: {meta['act']}")
    print(f"Section: {meta['section_number']} — {meta['section_title']}")
    print(f"Excerpt: {doc[:220]}...")