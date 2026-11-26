"""
advisory.py — TaxSaathi backend (LangChain v2 + Groq with 3-Tier Guardrails & BM25 Hybrid Retrieval)
====================================================================================================
Architecture:
  1. Stage A: Single-Call Domain Guardrail & Statutory Query Reframing:
     - Prompt injection & off-topic defense (short-circuits immediately with zero DB/LLM calls).
     - Statutory rephrasing (expands colloquial terms like 'car ITC' into bare-act phrasing).
     - Target Acts identification & explicit user section extraction (NO section guessing).
  2. Stage B: Hybrid Retrieval with BM25Okapi + Dense ChromaDB + Reciprocal Rank Fusion (RRF):
     - Dense candidate retrieval (top 15) using semantic_query.
     - In-memory BM25 lexical candidate retrieval (top 15) using legal-aware tokenization.
     - Soft Act boosting (x1.25) & explicit section boost (+0.03).
     - Relevance threshold noise guard: triggers GENERAL_FINANCE_FALLBACK when scores are low.
     - Explicit chunk ID tagging: [CHUNK_ID: <id> | ACT: <act> | SECTION: <sec>]
  3. Stage C: Structured Output Generation:
     - ChatGroq with `llm.with_structured_output(CARagResponse, include_raw=True)`.
     - Preserves original user query for answer generation.
  4. Deterministic Post-Validation:
     - Citation Provenance Check: verifies chunk_id strictly exists in retrieved set.
     - Fallback Hygiene: strips chunk_id and enforces mandatory disclaimer.
     - Out-of-Domain Hygiene: wipes citations and analytical fields on rejection.
"""

import os
import re
import time
import uuid
import logging
import threading
from typing import List, Dict, Any, Optional, Set, Tuple

# LangChain core
from langchain_core.documents import Document
from langchain_groq import ChatGroq
from langchain_chroma import Chroma
from rank_bm25 import BM25Okapi

from config import CHROMA_PATH, GROQ_MODEL_ADVISORY, groq_api_key
from schemas.rag_response import (
    ResponseMode,
    DomainClassification,
    StageARouteAndReframe,
    StatutoryCitation,
    CARagResponse,
)
from prompts.ca_rag_prompts import (
    stage_a_prompt,
    corpus_aware_rag_prompt,
    general_fallback_prompt,
)

logger = logging.getLogger(__name__)

# Configurable retrieval threshold
RAG_RELEVANCE_THRESHOLD = float(os.getenv("RAG_RELEVANCE_THRESHOLD", "0.40"))

# Shown when retrieval returns nothing the model is allowed to cite (backward-compat constant).
CORPUS_MISS = "The corpus does not contain the answer."

FALLBACK_GROQ_MODELS = (
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
)

MANDATORY_FALLBACK_DISCLAIMER = (
    "Answered using general financial/tax knowledge because directly matching provisions were not found in the indexed Acts corpus. "
    "Verify against current bare acts, circulars, and notifications before advising clients."
)

STOP_WORDS = frozenset({
    "the", "is", "of", "in", "to", "a", "an", "for", "and", "or", "by", "on",
    "under", "what", "can", "i", "how", "do", "does", "with", "from", "at", "as",
    "be", "this", "that", "which", "are", "it", "shall"
})


# ---------------------------------------------------------------------------
# 1. LLM Client Setup & Retries
# ---------------------------------------------------------------------------
_llm = None


def _retryable_groq_error(exc) -> bool:
    """True for Groq 429 (rate limit) and 503 responses, including wrapped causes."""
    current = exc
    seen = set()
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        status_code = getattr(current, "status_code", None) or getattr(current, "code", None)
        if status_code in (429, 503):
            return True
        err_msg = str(current).lower()
        if "429" in err_msg or "rate limit" in err_msg or "rate_limit" in err_msg or "503" in err_msg:
            return True
        current = getattr(current, "__cause__", None)
    return False


def _is_model_unavailable(exc) -> bool:
    err = str(exc).lower()
    return (
        "model_not_found" in err
        or "model_decommissioned" in err
        or "does not exist or you do not have access" in err
        or "decommissioned" in err
        or ("404" in err and "model" in err)
        or ("400" in err and "model" in err)
    )


def get_llm(model: Optional[str] = None, temperature: float = 0.0):
    """Return configured ChatGroq instance at temperature=0."""
    return ChatGroq(
        model=model or GROQ_MODEL_ADVISORY,
        groq_api_key=groq_api_key(),
        temperature=temperature,
        max_tokens=2500,
    )


# ---------------------------------------------------------------------------
# 2. Vector Store & Embedder
# ---------------------------------------------------------------------------
_COLLECTION_NAME = "indian_tax_laws"
_vectorstore = None
_vectorstore_loaded = False


class LocalChromaEmbedder:
    def __init__(self):
        from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
        self.ef = DefaultEmbeddingFunction()

    def embed_documents(self, texts):
        return self.ef(texts)

    def embed_query(self, text):
        return self.ef([text])[0]


def get_vectorstore():
    """Open ChromaDB corpus once."""
    global _vectorstore, _vectorstore_loaded
    if _vectorstore_loaded:
        return _vectorstore
    _vectorstore_loaded = True
    path = str(CHROMA_PATH)
    try:
        _vectorstore = Chroma(
            collection_name=_COLLECTION_NAME,
            embedding_function=LocalChromaEmbedder(),
            persist_directory=path,
        )
        logger.info("ChromaDB opened at %s collection '%s'", path, _COLLECTION_NAME)
    except Exception as e:
        logger.warning("ChromaDB could not be opened at %s: %s", path, e)
        _vectorstore = None
    return _vectorstore


def _is_repealed_act(act: str) -> bool:
    """The Income-tax Act, 1961 is repealed and must not be cited as active law."""
    return "1961" in (act or "")


def _section_key(section_number: str) -> str:
    cleaned = re.sub(r"(?i)^section\s+", "", str(section_number or "")).strip().lower()
    if cleaned in {"", "n/a", "none"}:
        return ""
    return cleaned


# ---------------------------------------------------------------------------
# 3. In-Memory BM25 Index with Legal Tokenization
# ---------------------------------------------------------------------------
def tokenize_legal(text: str) -> List[str]:
    """
    Legal-aware tokenizer:
      - Lowercase
      - Preserves statutory patterns like 17(5), 16(2)(aa), 194j, 44ad, gstr-2b, itc
      - Splits compound statutory identifiers so both '17(5)' and '17' are indexed
      - Drops common filler stop words
    """
    clean_text = text.lower()
    raw_tokens = re.findall(r"[a-z0-9]+(?:[\(\)\-_/][a-z0-9]+)*|[a-z0-9]+", clean_text)
    tokens = []
    for t in raw_tokens:
        clean_t = t.strip("()_-/")
        if not clean_t or clean_t in STOP_WORDS:
            continue
        tokens.append(clean_t)
        # If token has statutory structure like 17(5) or 16(2)(aa), also add sub-parts
        if "(" in t or "-" in t:
            sub_parts = re.findall(r"[a-z0-9]+", t)
            for sp in sub_parts:
                if sp not in STOP_WORDS and len(sp) > 0 and sp != clean_t:
                    tokens.append(sp)
    return tokens


class BM25Retriever:
    """Thread-safe in-memory BM25 index over all ChromaDB chunks."""
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.doc_ids: List[str] = []
        self.documents: List[str] = []
        self.metadatas: List[Dict[str, Any]] = []
        self.bm25: Optional[BM25Okapi] = None
        self._init_index()

    def _init_index(self):
        vs = get_vectorstore()
        if vs is None:
            return
        col = getattr(vs, "_collection", None)
        if col is None:
            return
        records = col.get(include=["documents", "metadatas"])
        raw_ids = records.get("ids", [])
        raw_docs = records.get("documents", [])
        raw_metas = records.get("metadatas", [])

        tokenized_corpus = []
        for cid, doc_text, meta in zip(raw_ids, raw_docs, raw_metas):
            meta_dict = dict(meta or {})
            if _is_repealed_act(meta_dict.get("act", "")):
                continue
            self.doc_ids.append(cid)
            self.documents.append(doc_text)
            self.metadatas.append(meta_dict)
            tokenized_corpus.append(tokenize_legal(doc_text))

        if tokenized_corpus:
            self.bm25 = BM25Okapi(tokenized_corpus)
            logger.info("BM25 index built with %d documents.", len(self.doc_ids))

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def search(self, query_tokens: List[str], top_n: int = 15) -> List[Tuple[str, str, Dict[str, Any], float, int]]:
        """Return list of (doc_id, doc_text, metadata, bm25_score, rank)."""
        if not self.bm25 or not query_tokens:
            return []
        scores = self.bm25.get_scores(query_tokens)
        scored_pairs = []
        for idx, score in enumerate(scores):
            if score > 0:
                scored_pairs.append((idx, float(score)))

        scored_pairs.sort(key=lambda x: x[1], reverse=True)
        results = []
        for rank, (idx, score) in enumerate(scored_pairs[:top_n], start=1):
            results.append((
                self.doc_ids[idx],
                self.documents[idx],
                self.metadatas[idx],
                score,
                rank,
            ))
        return results


# ---------------------------------------------------------------------------
# 4. Stage B: True Hybrid Retrieval (Dense + BM25 + Reciprocal Rank Fusion)
# ---------------------------------------------------------------------------
def hybrid_retrieve(
    original_query: str,
    semantic_query: str = "",
    bm25_keywords: Optional[List[str]] = None,
    target_acts: Optional[List[str]] = None,
    explicit_user_section: Optional[str] = None,
    top_k: int = 6,
) -> List[Document]:
    """
    True hybrid search combining Dense ChromaDB + In-Memory BM25 + Reciprocal Rank Fusion.
    """
    vs = get_vectorstore()
    if vs is None:
        return []
    col = getattr(vs, "_collection", None)
    if col is None:
        return []

    # ── 1. Dense Candidate Retrieval (top 15) ─────────────────────────────────
    query_for_embedding = (semantic_query or "").strip() or original_query.strip()
    embedder = LocalChromaEmbedder()
    dense_candidates: Dict[str, Tuple[str, Dict[str, Any], float, int]] = {}

    try:
        q_emb = embedder.embed_query(query_for_embedding)
        dense_res = col.query(
            query_embeddings=[q_emb],
            n_results=15,
            include=["documents", "metadatas", "distances"],
        )
        if dense_res and dense_res.get("ids") and dense_res["ids"][0]:
            r_ids = dense_res["ids"][0]
            r_docs = dense_res["documents"][0]
            r_metas = dense_res["metadatas"][0]
            r_dists = dense_res["distances"][0] if "distances" in dense_res else [0.5] * len(r_ids)

            for rank, (cid, doc_text, meta, dist) in enumerate(zip(r_ids, r_docs, r_metas, r_dists), start=1):
                if _is_repealed_act(meta.get("act", "")):
                    continue
                sim = max(0.0, 1.0 - float(dist))
                dense_candidates[cid] = (doc_text, dict(meta), sim, rank)
    except Exception as e:
        logger.warning("Dense retrieval error: %s", e)

    # ── 2. Explicit Section Metadata Boost/Fetch ──────────────────────────────
    if explicit_user_section:
        clean_sec = re.sub(r"(?i)^section\s*", "", explicit_user_section).strip()
        base_sec_match = re.search(r"(\d+[A-Za-z]*)", clean_sec)
        base_sec = base_sec_match.group(1) if base_sec_match else clean_sec

        try:
            where_clause: Dict[str, Any] = {"section_number": base_sec}
            sec_res = col.get(where=where_clause, include=["documents", "metadatas"])
            if sec_res and sec_res.get("ids"):
                for idx, (cid, doc_text, meta) in enumerate(zip(sec_res["ids"], sec_res["documents"], sec_res["metadatas"]), start=1):
                    if _is_repealed_act(meta.get("act", "")):
                        continue
                    if cid not in dense_candidates:
                        dense_candidates[cid] = (doc_text, dict(meta), 0.95, idx)
        except Exception as e:
            logger.warning("Explicit section metadata fetch error: %s", e)

    # ── 3. BM25 Candidate Retrieval (top 15) ──────────────────────────────────
    bm25_retriever = BM25Retriever.get_instance()
    bm25_candidates: Dict[str, Tuple[str, Dict[str, Any], float, int]] = {}

    kw_parts = list(bm25_keywords or [])
    bm25_text = " ".join(kw_parts * 2) + " " + query_for_embedding + " " + original_query
    query_tokens = tokenize_legal(bm25_text)

    bm25_results = bm25_retriever.search(query_tokens, top_n=15)
    for cid, doc_text, meta, score, rank in bm25_results:
        bm25_candidates[cid] = (doc_text, meta, score, rank)

    # ── 4. Reciprocal Rank Fusion (RRF) ───────────────────────────────────────
    all_candidate_ids = set(dense_candidates.keys()) | set(bm25_candidates.keys())
    if not all_candidate_ids:
        return []

    scored_candidates = []
    max_dense_sim = 0.0
    max_bm25_score = 0.0

    for cid in all_candidate_ids:
        dense_info = dense_candidates.get(cid)
        bm25_info = bm25_candidates.get(cid)

        rank_dense = dense_info[3] if dense_info else None
        dense_sim = dense_info[2] if dense_info else 0.0
        if dense_sim > max_dense_sim:
            max_dense_sim = dense_sim

        rank_bm25 = bm25_info[3] if bm25_info else None
        bm25_score = bm25_info[2] if bm25_info else 0.0
        if bm25_score > max_bm25_score:
            max_bm25_score = bm25_score

        doc_text = (dense_info[0] if dense_info else bm25_info[0])
        meta = (dense_info[1] if dense_info else bm25_info[1]) or {}

        # RRF formula
        rrf = 0.0
        if rank_dense is not None:
            rrf += 1.0 / (60.0 + rank_dense)
        if rank_bm25 is not None:
            rrf += 1.0 / (60.0 + rank_bm25)

        # Soft Act Boosting:
        act_name = meta.get("act") or meta.get("act_name") or ""
        if target_acts and any(ta.lower() in act_name.lower() for ta in target_acts):
            rrf *= 1.25

        # Explicit Section Boost:
        sec_num = str(meta.get("section_number") or meta.get("section") or "")
        if explicit_user_section:
            clean_user_sec = re.sub(r"(?i)^section\s*", "", explicit_user_section).strip().lower()
            if clean_user_sec in sec_num.lower() or sec_num.lower() in clean_user_sec:
                rrf += 0.03

        meta_out = dict(meta)
        meta_out["chunk_id"] = cid
        meta_out["dense_similarity"] = dense_sim
        meta_out["bm25_score"] = bm25_score
        meta_out["rrf_score"] = rrf

        scored_candidates.append((cid, doc_text, meta_out, rrf))

    # ── 5. Relevance Threshold / Noise Guard ──────────────────────────────────
    if max_dense_sim < 0.25 and max_bm25_score < 2.0:
        logger.info(
            "[Hybrid Retrieval Noise Guard] Low relevance (max_dense_sim=%.2f, max_bm25=%.2f). Returning empty.",
            max_dense_sim, max_bm25_score
        )
        return []

    scored_candidates.sort(key=lambda x: x[3], reverse=True)
    surviving = scored_candidates[:top_k]

    return [
        Document(page_content=item[1], metadata=item[2], id=item[0])
        for item in surviving
    ]


def retrieve_relevant_documents(query: str, top_k: int = 6) -> List[Document]:
    """Compatibility wrapper for hybrid_retrieve."""
    sec_matches = re.findall(r"(?i)\bsection\s+(\d{1,4}[a-zA-Z]*)", query)
    explicit_sec = sec_matches[0] if sec_matches else None
    return hybrid_retrieve(
        original_query=query,
        semantic_query=query,
        explicit_user_section=explicit_sec,
        top_k=top_k,
    )


def format_chunks_with_ids(docs: List[Document]) -> Tuple[str, Set[str]]:
    """
    Format surviving chunks into unambiguous tagged blocks:
      [CHUNK_ID: <id> | ACT: <act_name> | SECTION: <section_meta>]
      <chunk_text>
    Returns formatted context string and set of valid chunk_ids.
    """
    if not docs:
        return "NO_CONTEXT_RETRIEVED", set()

    blocks = []
    valid_ids: Set[str] = set()

    for doc in docs:
        meta = doc.metadata
        cid = meta.get("chunk_id") or getattr(doc, "id", "") or "chunk_unknown"
        valid_ids.add(cid)

        act = meta.get("act") or meta.get("act_name") or "Unknown Act"
        sec = meta.get("section_number") or meta.get("section") or "N/A"
        title = meta.get("section_title", "")
        if title and (title.lower().startswith("and upto") or len(title.strip()) < 3):
            title = ""

        section_meta = f"Section {sec}"
        if title:
            section_meta += f" ({title})"

        text = doc.page_content.strip()
        block = (
            f"[CHUNK_ID: {cid} | ACT: {act} | SECTION: {section_meta}]\n"
            f"{text}"
        )
        blocks.append(block)

    return "\n\n".join(blocks), valid_ids


# ---------------------------------------------------------------------------
# 5. Stage A: Single-Call Domain Guardrail + Statutory Query Reframer
# ---------------------------------------------------------------------------
def route_and_reframe_stage_a(query: str, llm=None) -> StageARouteAndReframe:
    """
    Fast pre-retrieval classifier & query reframer in a single structured call.
    """
    try:
        active_llm = llm or get_llm(temperature=0.0)
    except Exception as exc:
        logger.warning("[Stage A] Could not initialize LLM (%s), using heuristic fallback.", exc)
        active_llm = None

    if active_llm is not None:
        try:
            structured_reframer = active_llm.with_structured_output(StageARouteAndReframe)
            chain = stage_a_prompt | structured_reframer
            waits = (1, 2)
            for wait in waits:
                try:
                    res = chain.invoke({"query": query})
                    if isinstance(res, StageARouteAndReframe):
                        return res
                    if isinstance(res, dict):
                        return StageARouteAndReframe(**res)
                except Exception as exc:
                    if _retryable_groq_error(exc):
                        time.sleep(wait)
                        continue
                    logger.warning("[Stage A] LLM reframing error (%s), using heuristic.", exc)
                    break
        except Exception as exc:
            logger.warning("[Stage A] Structured reframer setup error (%s).", exc)

    # Heuristic fallback if LLM is unavailable
    q = query.lower()
    off_topic_words = {"recipe", "cake", "cook", "bake", "poem", "joke", "movie", "song", "sports", "football", "cricket"}
    if any(ow in q for ow in off_topic_words) or "ignore" in q:
        return StageARouteAndReframe(
            is_finance_or_tax=False,
            detected_topic="Off-Topic",
            reason="Heuristic detected off-topic or prompt injection term",
            target_acts=[],
            explicit_user_section=None,
            semantic_query="",
            bm25_keywords=[],
        )

    # Check for explicit user section
    sec_match = re.search(r"(?i)\bsection\s+(\d{1,4}[a-zA-Z]*)", query)
    explicit_sec = sec_match.group(1) if sec_match else None

    target_acts = []
    if "gst" in q or "cgst" in q:
        target_acts.append("CGST Act, 2017")
    if "igst" in q:
        target_acts.append("IGST Act, 2017")
    if "income" in q or "salary" in q or "regime" in q or "standard deduction" in q:
        target_acts.append("Income-tax Act, 2025")

    bm25_kw = [w for w in re.findall(r"\w+", q) if w not in STOP_WORDS]
    return StageARouteAndReframe(
        is_finance_or_tax=True,
        detected_topic="Tax/Finance",
        reason="Heuristic keyword check fallback",
        target_acts=target_acts,
        explicit_user_section=explicit_sec,
        semantic_query=query,
        bm25_keywords=bm25_kw[:6],
    )


# Backward compatibility alias
def classify_domain(query: str, llm=None) -> DomainClassification:
    reframe = route_and_reframe_stage_a(query, llm=llm)
    return DomainClassification(
        is_finance_or_tax=reframe.is_finance_or_tax,
        detected_topic=reframe.detected_topic,
        reason=reframe.reason,
    )


# ---------------------------------------------------------------------------
# 6. Deterministic Post-Validation (Guardrail Enforcement)
# ---------------------------------------------------------------------------
def validate_and_sanitize_response(
    response: CARagResponse,
    valid_chunk_ids: Set[str],
) -> CARagResponse:
    """
    Enforces non-negotiable post-parsing security & compliance rules:
      1. Out-of-Domain Hygiene
      2. Fallback Hygiene
      3. Citation Provenance Check
    """
    if response.response_mode == ResponseMode.OUT_OF_DOMAIN:
        response.is_corpus_verified = False
        response.citations = []
        response.compliance_actionables = []
        response.detailed_analysis = None
        response.follow_up_questions = []
        return response

    if response.response_mode == ResponseMode.GENERAL_FINANCE_FALLBACK:
        response.is_corpus_verified = False
        for citation in response.citations:
            citation.chunk_id = None

        has_disclaimer = any(
            "general financial/tax knowledge" in c.lower() or "indexed acts corpus" in c.lower()
            for c in response.assumptions_and_caveats
        )
        if not has_disclaimer:
            response.assumptions_and_caveats.append(MANDATORY_FALLBACK_DISCLAIMER)
        return response

    if response.response_mode == ResponseMode.CORPUS_GROUNDED:
        verified_citations = []
        for c in response.citations:
            if c.chunk_id and c.chunk_id in valid_chunk_ids:
                verified_citations.append(c)
            elif not c.chunk_id:
                # If LLM omitted chunk_id, try to infer it from valid_chunk_ids
                sec_part = c.section_number.lower()
                matched = [cid for cid in valid_chunk_ids if sec_part in cid.lower()]
                if len(matched) == 1:
                    c.chunk_id = matched[0]
                    verified_citations.append(c)
            else:
                logger.warning(
                    "[Guardrail Alert] Dropping fabricated chunk_id '%s' for %s",
                    c.chunk_id, c.section_reference
                )

        response.citations = verified_citations

        if not verified_citations:
            logger.warning("[Guardrail] No valid corpus citations survived provenance check. Downgrading to fallback.")
            response.response_mode = ResponseMode.GENERAL_FINANCE_FALLBACK
            response.is_corpus_verified = False
            response.assumptions_and_caveats.append(
                "Notice: Direct statutory citations could not be verified against the indexed corpus chunks. Verify bare act text."
            )
            response.assumptions_and_caveats.append(MANDATORY_FALLBACK_DISCLAIMER)
        else:
            response.is_corpus_verified = True

    return response


# ---------------------------------------------------------------------------
# 7. Stage C: Structured Generation with include_raw=True & Resilient Retries
# ---------------------------------------------------------------------------
def _invoke_structured_with_retries(
    prompt_template,
    payload: Dict[str, Any],
    llm,
    valid_chunk_ids: Set[str],
) -> CARagResponse:
    """
    Invokes llm.with_structured_output(CARagResponse, include_raw=True) with
    resilient retry and error repair.
    """
    request_id = str(uuid.uuid4())[:8]
    models_to_try = [None] + [m for m in FALLBACK_GROQ_MODELS if m != GROQ_MODEL_ADVISORY]
    last_error = None

    for model_name in models_to_try:
        try:
            active_llm = get_llm(model=model_name, temperature=0.0) if model_name else llm
            if active_llm is None:
                continue
            chain = prompt_template | active_llm.with_structured_output(CARagResponse, include_raw=True)
        except Exception:
            continue

        for wait in (1, 2):
            try:
                res = chain.invoke(payload)
                parsed = res.get("parsed") if isinstance(res, dict) else res
                parsing_err = res.get("parsing_error") if isinstance(res, dict) else None

                if parsed is not None and isinstance(parsed, CARagResponse):
                    return validate_and_sanitize_response(parsed, valid_chunk_ids)

                if parsing_err:
                    logger.warning(
                        "[Advisory Req %s] Structured parsing error: %s. Attempting repair retry.",
                        request_id, parsing_err
                    )
                    repair_prompt = (
                        f"The previous output had a validation error: {parsing_err}.\n"
                        f"Please produce valid JSON matching the CARagResponse schema."
                    )
                    retry_chain = active_llm.with_structured_output(CARagResponse, include_raw=True)
                    repair_res = retry_chain.invoke(repair_prompt)
                    repaired = repair_res.get("parsed") if isinstance(repair_res, dict) else repair_res
                    if isinstance(repaired, CARagResponse):
                        return validate_and_sanitize_response(repaired, valid_chunk_ids)

            except Exception as exc:
                last_error = exc
                if _is_model_unavailable(exc):
                    logger.warning("[Advisory] Model %s unavailable, switching fallback...", model_name or "default")
                    break
                if _retryable_groq_error(exc):
                    time.sleep(wait)
                    continue
                logger.error("[Advisory Req %s] Invocation failure: %s", request_id, exc)
                break

    logger.error("[Advisory Req %s] All attempts failed. Returning safe fallback. Error: %s", request_id, last_error)
    fallback_resp = CARagResponse(
        response_mode=ResponseMode.GENERAL_FINANCE_FALLBACK,
        is_corpus_verified=False,
        executive_summary="The statutory advisory service encountered a temporary processing issue. Please verify the provisions directly with official bare acts.",
        detailed_analysis="A service interruption prevented complete structured analysis.",
        citations=[],
        compliance_actionables=["Consult bare acts and relevant circulars directly."],
        assumptions_and_caveats=[MANDATORY_FALLBACK_DISCLAIMER],
        follow_up_questions=[],
    )
    return validate_and_sanitize_response(fallback_resp, valid_chunk_ids)


# ---------------------------------------------------------------------------
# 8. Markdown Formatter for Unified Presentation
# ---------------------------------------------------------------------------
def format_ca_response_as_markdown(resp: CARagResponse) -> str:
    """Format CARagResponse into a clean, executive-ready Markdown document."""
    if resp.response_mode == ResponseMode.OUT_OF_DOMAIN:
        return resp.executive_summary

    parts = []
    parts.append(f"### Direct Answer\n{resp.executive_summary.strip()}")

    if resp.detailed_analysis and resp.detailed_analysis.strip():
        parts.append(f"### Detailed Analysis\n{resp.detailed_analysis.strip()}")

    if resp.compliance_actionables:
        action_bullets = "\n".join(f"- {act}" for act in resp.compliance_actionables)
        parts.append(f"### Compliance & Actionables\n{action_bullets}")

    if resp.citations:
        cite_lines = []
        for c in resp.citations:
            summary = c.provision_summary or c.excerpt_summary or ""
            ref = c.section_reference
            chunk_tag = f" `[{c.chunk_id}]`" if c.chunk_id else ""
            cite_lines.append(f"- **{c.act_name}**, {ref}{chunk_tag}: {summary}")
        parts.append(f"### Statutory Citations\n" + "\n".join(cite_lines))

    if resp.assumptions_and_caveats:
        caveat_bullets = "\n".join(f"- *{c}*" for c in resp.assumptions_and_caveats)
        parts.append(f"### Assumptions & Caveats\n{caveat_bullets}")

    if resp.follow_up_questions:
        q_bullets = "\n".join(f"- {q}" for q in resp.follow_up_questions)
        parts.append(f"### Follow-up Considerations\n{q_bullets}")

    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# 9. Public API — ask_tax_copilot()
# ---------------------------------------------------------------------------
def ask_tax_copilot(query: str, top_k: int = 6) -> Dict[str, Any]:
    """
    RAG-based tax advisory using Stage A Reframing + Hybrid BM25 Retrieval + Structured Output.
    """
    clean_query = query.strip()
    print(f"\n[Query] {clean_query}")
    print(f"[Engine] 3-Tier CA RAG (Hybrid BM25 + Dense) | model={GROQ_MODEL_ADVISORY} | top_k={top_k}")

    try:
        llm = get_llm(temperature=0.0)
    except Exception as exc:
        logger.warning("[Advisory] LLM initialization: %s", exc)
        llm = None

    # ── STAGE A: Input Domain Guardrail & Statutory Query Reframing ───────────
    stage_a = route_and_reframe_stage_a(clean_query, llm=llm)

    if not stage_a.is_finance_or_tax:
        logger.info("[Advisory Guardrail] Query rejected as OUT_OF_DOMAIN: %s", clean_query)
        out_of_domain_resp = CARagResponse(
            response_mode=ResponseMode.OUT_OF_DOMAIN,
            is_corpus_verified=False,
            executive_summary=(
                "I am TaxSaathi, an advisory assistant dedicated exclusively to Indian taxation, GST, "
                "accounting, auditing, and corporate compliance. Your query is outside this domain. "
                "Please ask a question related to Indian tax laws or financial compliance."
            ),
            detailed_analysis=None,
            citations=[],
            compliance_actionables=[],
            assumptions_and_caveats=["Query classified as out-of-domain."],
            follow_up_questions=[],
        )
        out_of_domain_resp = validate_and_sanitize_response(out_of_domain_resp, set())
        answer_text = format_ca_response_as_markdown(out_of_domain_resp)
        return _build_return_payload(clean_query, answer_text, out_of_domain_resp, [])

    # ── STAGE B: Hybrid Retrieval (BM25 + Dense + RRF) ────────────────────────
    retrieved_docs = hybrid_retrieve(
        original_query=clean_query,
        semantic_query=stage_a.semantic_query,
        bm25_keywords=stage_a.bm25_keywords,
        target_acts=stage_a.target_acts,
        explicit_user_section=stage_a.explicit_user_section,
        top_k=top_k,
    )
    context_str, valid_chunk_ids = format_chunks_with_ids(retrieved_docs)

    legacy_citation_strings = [
        f"{d.metadata.get('act') or d.metadata.get('act_name') or 'Act'}, Section {d.metadata.get('section_number') or d.metadata.get('section') or ''}"
        + (f" ({d.metadata.get('section_title')})" if d.metadata.get('section_title') else "")
        for d in retrieved_docs
    ]

    # ── STAGE C: Structured Output Generation (Using ORIGINAL user query) ─────
    if not retrieved_docs or context_str == "NO_CONTEXT_RETRIEVED":
        logger.info("[Advisory] No surviving chunks found. Routing to GENERAL_FINANCE_FALLBACK.")
        ca_response = _invoke_structured_with_retries(
            general_fallback_prompt,
            {"query": clean_query},
            llm=llm,
            valid_chunk_ids=set(),
        )
    else:
        ca_response = _invoke_structured_with_retries(
            corpus_aware_rag_prompt,
            {"context": context_str, "query": clean_query},
            llm=llm,
            valid_chunk_ids=valid_chunk_ids,
        )

    # Deterministic post-validation
    ca_response = validate_and_sanitize_response(ca_response, valid_chunk_ids)

    # Format human-readable markdown
    answer_text = format_ca_response_as_markdown(ca_response)

    print(
        f"[Engine Result] Mode={ca_response.response_mode.value} | "
        f"CorpusVerified={ca_response.is_corpus_verified} | "
        f"Citations={len(ca_response.citations)}"
    )

    return _build_return_payload(clean_query, answer_text, ca_response, legacy_citation_strings)


def _build_return_payload(
    query: str,
    answer_text: str,
    ca_resp: CARagResponse,
    fallback_citation_strings: List[str],
) -> Dict[str, Any]:
    """Helper to assemble a comprehensive, backward-compatible dictionary."""
    citation_strings = [
        f"{c.act_name}, {c.section_reference}"
        + (f" [{c.chunk_id}]" if c.chunk_id else "")
        for c in ca_resp.citations
    ] or fallback_citation_strings

    parsed_cited_sections = [
        {
            "act": c.act_name,
            "section_number": c.section_number,
            "subsection": c.sub_section_clause or "",
            "section_title": c.provision_summary,
            "excerpt": c.excerpt_summary or c.provision_summary,
            "chunk_id": c.chunk_id,
        }
        for c in ca_resp.citations
    ]

    conf_level = (
        "HIGH" if ca_resp.is_corpus_verified
        else ("MEDIUM" if ca_resp.response_mode == ResponseMode.GENERAL_FINANCE_FALLBACK else "LOW")
    )

    parsed = {
        "summary": ca_resp.executive_summary,
        "detailed_answer": ca_resp.detailed_analysis or ca_resp.executive_summary,
        "cited_sections": parsed_cited_sections,
        "ca_action_note": "\n".join(ca_resp.compliance_actionables),
        "confidence_level": conf_level,
        "confidence_reason": (
            "Verified against indexed statutory corpus." if ca_resp.is_corpus_verified
            else ("Answered using general tax/financial knowledge." if ca_resp.response_mode == ResponseMode.GENERAL_FINANCE_FALLBACK else "Out of domain query.")
        ),
        "combined_answer": answer_text,
        "is_insufficient_context": not ca_resp.is_corpus_verified,
        "response_mode": ca_resp.response_mode.value,
    }

    return {
        "query": query,
        "answer": answer_text,
        "response_mode": ca_resp.response_mode.value,
        "is_corpus_verified": ca_resp.is_corpus_verified,
        "executive_summary": ca_resp.executive_summary,
        "detailed_analysis": ca_resp.detailed_analysis,
        "citations": citation_strings,
        "compliance_actionables": ca_resp.compliance_actionables,
        "assumptions_and_caveats": ca_resp.assumptions_and_caveats,
        "follow_up_questions": ca_resp.follow_up_questions,
        "ca_rag_response": ca_resp.model_dump(),
        "parsed": parsed,
    }


# Backward compatibility aliases
ground_citations = lambda cited_sections, docs: cited_sections
parse_advisory_output = lambda raw_text, fallback_citations: {
    "summary": raw_text[:300],
    "detailed_answer": raw_text,
    "cited_sections": [],
    "confidence_level": "LOW",
    "is_insufficient_context": False,
}
