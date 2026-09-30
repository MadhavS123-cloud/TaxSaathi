"""
advisory.py  —  TaxSaathi backend (LangChain edition)
======================================================
Architecture:
  ChromaDB  →  LangChain Retriever
                      ↓
  LangChain ChatPromptTemplate  (System + Human messages)
                      ↓
  ChatGoogleGenerativeAI  (gemini-2.0-flash)
                      ↓
  LangChain StrOutputParser  +  custom AdvisoryOutputParser
                      ↓
  parse_advisory_output()  →  structured dict
"""

import os
import re
import logging

from dotenv import load_dotenv

# LangChain core
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda

# LangChain Google Gemini integration
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

# LangChain ChromaDB integration
from langchain_chroma import Chroma

load_dotenv()

logger = logging.getLogger(__name__)

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file.")

# ---------------------------------------------------------------------------
# 1.  LangChain LLM  (replaces genai.GenerativeModel)
# ---------------------------------------------------------------------------
LLM_MODEL_NAME = "gemini-2.0-flash"

llm = ChatGoogleGenerativeAI(
    model=LLM_MODEL_NAME,
    google_api_key=api_key,
    temperature=0.1,          # low temperature → deterministic, factual answers
    max_output_tokens=2048,
)

# ---------------------------------------------------------------------------
# 2.  LangChain ChromaDB Retriever
#     (replaces raw chromadb.PersistentClient + collection.query)
# ---------------------------------------------------------------------------
_CHROMA_DIR = os.path.join("data", "chroma_db")
_COLLECTION_NAME = "indian_tax_laws"

# Use Google's embedding model so vectors are compatible with the stored index.
# Falls back to a no-op placeholder if the collection is empty.
try:
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=api_key,
    )
    vectorstore = Chroma(
        collection_name=_COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=_CHROMA_DIR,
    )
    logger.info("[ChromaDB] Connected to collection '%s'", _COLLECTION_NAME)
except Exception as e:
    logger.warning("[ChromaDB] Could not connect: %s. Retrieval will return empty context.", e)
    vectorstore = None


def _build_retriever(top_k: int):
    """Return a LangChain retriever for the given k, or None if unavailable."""
    if vectorstore is None:
        return None
    return vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": top_k},
    )


# ---------------------------------------------------------------------------
# 3.  Guard-rail System Prompt  +  ChatPromptTemplate
#     (replaces the hand-built full_prompt f-string)
# ---------------------------------------------------------------------------
_SYSTEM_TEMPLATE = """\
You are CA Tax Copilot, an expert AI assistant for Indian Chartered Accountants.
Answer tax queries STRICTLY and ONLY from the statutory excerpts supplied in the
Human message (Income-tax Act 1961, CGST Act 2017, IGST Act 2017, etc.).

╔══════════════════════════════════════════════════════════════╗
║                    STRICT GUARD RAILS                       ║
╠══════════════════════════════════════════════════════════════╣
║ 1. Use ONLY the provided STATUTORY CONTEXT. No general       ║
║    knowledge, textbooks, or external sources.                ║
║ 2. If the answer is NOT in the context, respond ONLY with:   ║
║    "INSUFFICIENT_CONTEXT: <reason>"                          ║
║ 3. Never invent section numbers, rates, or dates.            ║
║ 4. Do not mix Acts unless BOTH appear in the context.        ║
╚══════════════════════════════════════════════════════════════╝

MANDATORY STRUCTURED OUTPUT (machine-parsed — follow exactly):

SUMMARY:
<One-paragraph professional summary.>

DETAILED_ANSWER:
<Full explanation. Use numbered or bulleted points.
Every monetary limit, tax rate, or due date MUST be a bullet point.
Mention Article/Section numbers inline where applicable.>

CITED_SECTIONS:
SECTION_REF: <Act Name> | Section <Number> | <Section Title>
(One line per section. Only cite sections present in the supplied context.)

CA_ACTION_NOTE:
<Concise, actionable note for the Chartered Accountant.>

CONFIDENCE_LEVEL: <HIGH / MEDIUM / LOW>
CONFIDENCE_REASON: <One sentence explaining why this confidence level was assigned.>
"""

_HUMAN_TEMPLATE = """\
STATUTORY CONTEXT:
{context}

USER TAX QUERY:
{query}

GROUNDED TAX ADVICE (follow the mandatory output format exactly):"""

advisory_prompt = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(_SYSTEM_TEMPLATE),
    HumanMessagePromptTemplate.from_template(_HUMAN_TEMPLATE),
])


# ---------------------------------------------------------------------------
# 4.  Output Parser  (LangChain StrOutputParser  +  custom structured parse)
# ---------------------------------------------------------------------------
_str_parser = StrOutputParser()   # extracts .content from AIMessage → plain str


def parse_advisory_output(raw_text: str, fallback_citations: list) -> dict:
    """
    LangChain custom output parser.

    Takes the raw LLM string (already extracted by StrOutputParser) and
    converts it into a typed dict.  Uses regex to pull each named section
    out of the structured format the LLM was instructed to follow.

    Guard-rail check:
        If the LLM triggered the INSUFFICIENT_CONTEXT guard rail, the text
        begins with that token.  We detect this and return a low-confidence
        flag so the caller (and the route handler) can handle it gracefully.

    Returns:
        {
            summary, detailed_answer, cited_sections (list[dict]),
            ca_action_note, confidence_level, confidence_reason,
            combined_answer, is_insufficient_context
        }
    """

    # ── Guard-rail trigger: LLM said it cannot answer ─────────────────────
    if raw_text.strip().upper().startswith("INSUFFICIENT_CONTEXT"):
        return {
            "summary": raw_text.strip(),
            "detailed_answer": raw_text.strip(),
            "cited_sections": [],
            "ca_action_note": "Consult official tax documentation or a qualified CA.",
            "confidence_level": "LOW",
            "confidence_reason": "Statutory context did not contain relevant information.",
            "combined_answer": raw_text.strip(),
            "is_insufficient_context": True,
        }

    # ── Section extraction helpers ─────────────────────────────────────────
    _ALL_MARKERS = [
        "SUMMARY", "DETAILED_ANSWER", "CITED_SECTIONS",
        "CA_ACTION_NOTE", "CONFIDENCE_LEVEL", "CONFIDENCE_REASON",
    ]

    def _extract_block(text: str, start_marker: str, end_markers: list) -> str:
        end_pat = "|".join(re.escape(m) for m in end_markers)
        pat = rf"{re.escape(start_marker)}[:\s]*(.*?)(?={end_pat}|$)"
        m = re.search(pat, text, re.DOTALL | re.IGNORECASE)
        return m.group(1).strip() if m else ""

    summary        = _extract_block(raw_text, "SUMMARY",        _ALL_MARKERS[1:])
    detailed_answer= _extract_block(raw_text, "DETAILED_ANSWER",_ALL_MARKERS[2:])
    cited_block    = _extract_block(raw_text, "CITED_SECTIONS", _ALL_MARKERS[4:])
    ca_action_note = _extract_block(raw_text, "CA_ACTION_NOTE", _ALL_MARKERS[4:])

    # ── Confidence ────────────────────────────────────────────────────────
    cm = re.search(r"CONFIDENCE_LEVEL[:\s]*(HIGH|MEDIUM|LOW)", raw_text, re.IGNORECASE)
    confidence_level = cm.group(1).upper() if cm else "LOW"

    cr = re.search(r"CONFIDENCE_REASON[:\s]*(.+?)(?:\n|$)", raw_text, re.IGNORECASE)
    confidence_reason = cr.group(1).strip() if cr else ""

    # ── SECTION_REF parser ────────────────────────────────────────────────
    cited_sections = []
    for line in cited_block.splitlines():
        line = line.strip()
        if line.upper().startswith("SECTION_REF:"):
            body  = line[len("SECTION_REF:"):].strip()
            parts = [p.strip() for p in body.split("|")]
            if len(parts) >= 3:
                sec_num = re.sub(r"(?i)^section\s+", "", parts[1]).strip()
                cited_sections.append({
                    "act": parts[0],
                    "section_number": sec_num,
                    "section_title": parts[2],
                })
            elif len(parts) == 2:
                sec_num = re.sub(r"(?i)^section\s+", "", parts[1]).strip()
                cited_sections.append({
                    "act": parts[0],
                    "section_number": sec_num,
                    "section_title": "",
                })

    # ── Fallback: ChromaDB metadata citations ─────────────────────────────
    if not cited_sections and fallback_citations:
        for cstr in fallback_citations:
            try:
                pts = cstr.split("Section ")
                if len(pts) == 2:
                    act_name = pts[0].strip().rstrip(",")
                    info = pts[1]
                    if "(" in info and ")" in info:
                        snum  = info.split("(")[0].strip()
                        stitle= info.split("(")[1].rstrip(")").strip()
                    else:
                        snum, stitle = info.strip(), ""
                    cited_sections.append({
                        "act": act_name,
                        "section_number": snum,
                        "section_title": stitle,
                    })
            except Exception:
                continue

    # ── Build combined answer (backward compat for routes/advisory.py) ────
    combined = ""
    if summary:        combined += f"**Summary**\n{summary}\n\n"
    if detailed_answer:combined += f"**Detailed Answer**\n{detailed_answer}\n\n"
    if ca_action_note: combined += f"**CA Action Note**\n{ca_action_note}"

    return {
        "summary": summary,
        "detailed_answer": detailed_answer,
        "cited_sections": cited_sections,
        "ca_action_note": ca_action_note,
        "confidence_level": confidence_level,
        "confidence_reason": confidence_reason,
        "combined_answer": combined.strip(),
        "is_insufficient_context": False,
    }


# ---------------------------------------------------------------------------
# 5.  LangChain RAG Chain builder
#     Retriever → format context → prompt → LLM → StrOutputParser
# ---------------------------------------------------------------------------
def _format_docs(docs) -> str:
    """Format LangChain Document objects into the SOURCE block the LLM expects."""
    blocks = []
    for i, doc in enumerate(docs, start=1):
        meta = doc.metadata
        citation = (
            f"{meta.get('act', 'Unknown Act')}, "
            f"Section {meta.get('section_number', 'N/A')} "
            f"({meta.get('section_title', '')})"
        )
        blocks.append(f"--- SOURCE {i}: {citation} ---\n{doc.page_content}")
    return "\n\n".join(blocks)


def _build_rag_chain(top_k: int):
    """
    Builds a LangChain LCEL (LangChain Expression Language) chain:

        retriever  →  format_docs
                            ↓
        query  ─────────────┤
                            ↓
                    advisory_prompt
                            ↓
                           llm
                            ↓
                    StrOutputParser   →  plain str
    """
    retriever = _build_retriever(top_k)

    if retriever is None:
        # No vectorstore: return a chain that passes an empty context
        chain = (
            RunnablePassthrough.assign(context=RunnableLambda(lambda _: "No statutory context available."))
            | advisory_prompt
            | llm
            | _str_parser
        )
        return chain, []

    chain = (
        RunnablePassthrough.assign(
            context=RunnableLambda(lambda x: _format_docs(retriever.invoke(x["query"])))
        )
        | advisory_prompt
        | llm
        | _str_parser
    )
    return chain, retriever


# ---------------------------------------------------------------------------
# 6.  Public API — ask_tax_copilot()
#     Drop-in replacement: same signature and return shape as before.
# ---------------------------------------------------------------------------
def ask_tax_copilot(query: str, top_k: int = 5) -> dict:
    """
    RAG-based tax advisory using LangChain.

    Steps:
      1. LangChain retriever pulls top_k statutory chunks from ChromaDB.
      2. Chunks are formatted and injected into a ChatPromptTemplate.
      3. ChatGoogleGenerativeAI (gemini-2.0-flash) generates a response
         that is constrained by the guard-rail system prompt.
      4. StrOutputParser converts the AIMessage to a plain string.
      5. parse_advisory_output() parses the structured sections into a dict.

    Returns:
        {
            "query": str,
            "answer": str,       # combined formatted answer (backward-compat)
            "citations": list,   # raw citation strings from ChromaDB metadata
            "parsed": dict       # structured parsed output
        }
    """
    print(f"\n[Query] {query}")
    print(f"[Engine] LangChain RAG chain | model={LLM_MODEL_NAME} | top_k={top_k}")

    # Build the chain
    chain, retriever_or_empty = _build_rag_chain(top_k)

    # Collect raw citation strings for backward compat (routes/advisory.py uses them)
    citations = []
    if retriever_or_empty and not isinstance(retriever_or_empty, list):
        retriever = retriever_or_empty
        docs = retriever.invoke(query)
        for doc in docs:
            meta = doc.metadata
            cstr = (
                f"{meta.get('act', 'Unknown Act')}, "
                f"Section {meta.get('section_number', 'N/A')} "
                f"({meta.get('section_title', '')})"
            )
            citations.append(cstr)

    # Run the LangChain chain — returns a plain string
    raw_text: str = chain.invoke({"query": query})

    # Parse structured output
    parsed = parse_advisory_output(raw_text, citations)

    print(
        f"[Engine] Confidence={parsed['confidence_level']} | "
        f"Sections={len(parsed['cited_sections'])} | "
        f"InsufficientCtx={parsed['is_insufficient_context']}"
    )

    return {
        "query": query,
        "answer": parsed["combined_answer"] or raw_text,
        "citations": citations,
        "parsed": parsed,
    }


# ---------------------------------------------------------------------------
# 7.  Quick CLI test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    sample_query = (
        "What is the standard deduction limit under salary in the "
        "new tax regime versus other cases?"
    )
    result = ask_tax_copilot(sample_query)

    print("\n=== Raw Citations from ChromaDB ===")
    for c in result["citations"]:
        print(f"  - {c}")

    p = result["parsed"]

    print("\n=== SUMMARY ===")
    print(p["summary"])

    print("\n=== DETAILED ANSWER ===")
    print(p["detailed_answer"])

    print("\n=== CITED SECTIONS ===")
    for s in p["cited_sections"]:
        print(f"  • {s['act']} | Section {s['section_number']} | {s['section_title']}")

    print("\n=== CA ACTION NOTE ===")
    print(p["ca_action_note"])

    print(f"\n=== CONFIDENCE: {p['confidence_level']} ===")
    print(p["confidence_reason"])
