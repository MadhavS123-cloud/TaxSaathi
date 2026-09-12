import os
import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file.")

genai.configure(api_key=api_key)

# 1. Connect to local ChromaDB
db_dir = os.path.join("data", "chroma_db")
client = chromadb.PersistentClient(path=db_dir)
embedding_fn = embedding_functions.DefaultEmbeddingFunction()

collection = client.get_collection(
    name="indian_tax_laws",
    embedding_function=embedding_fn
)

ADVISORY_SYSTEM_PROMPT = """
You are CA Tax Copilot, an expert AI assistant helping Indian Chartered Accountants.
Answer the user's tax query STRICTLY based on the provided statutory context (Income-tax Act, CGST Act, IGST Act).

Rules:
1. Always cite the exact Section number, Section title, and Act name.
2. If the answer cannot be determined with certainty from the context, explicitly state what is missing.
3. Present monetary limits, tax rates, and filing due dates clearly using bullet points.
4. Conclude with a clear, concise actionable note for the CA.
"""

def ask_tax_copilot(query: str, top_k: int = 3):
    print(f"\n[Query] {query}")
    
    # Retrieve relevant legal chunks
    results = collection.query(query_texts=[query], n_results=top_k)
    
    context_blocks = []
    citations = []
    
    for i in range(len(results["documents"][0])):
        doc = results["documents"][0][i]
        meta = results["metadatas"][0][i]
        citation_str = f"{meta['act']}, Section {meta['section_number']} ({meta['section_title']})"
        citations.append(citation_str)
        context_blocks.append(f"--- SOURCE {i+1}: {citation_str} ---\n{doc}")
    
    context_text = "\n\n".join(context_blocks)
    
    full_prompt = f"""{ADVISORY_SYSTEM_PROMPT}

STATUTORY CONTEXT:
{context_text}

USER TAX QUERY:
{query}

GROUNDED TAX ADVICE:"""

    model_name = "gemini-3.6-flash"
    print(f"[Engine] Generating advisory using model: {model_name} ...")
    model = genai.GenerativeModel(model_name)
    response = model.generate_content(full_prompt)
    
    return {
        "query": query,
        "answer": response.text,
        "citations": citations
    }

if __name__ == "__main__":
    sample_query = "What is the standard deduction limit under salary in the new tax regime versus other cases?"
    result = ask_tax_copilot(sample_query)
    
    print("\n=== Sources Retrieved ===")
    for c in result["citations"]:
        print(f"- {c}")
        
    print("\n=== Tax Advisory Response ===")
    print(result["answer"])  