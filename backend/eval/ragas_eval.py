"""Build a RAGAS dataset from the golden questions and score the in-corpus rows.

Importing this module does not import ragas, Chroma, or Gemini. The live
runner calls `score_in_corpus`, which imports ragas at that moment.
"""

import asyncio
import json
from pathlib import Path

from advisory import CORPUS_MISS

GOLDEN_PATH = Path(__file__).resolve().with_name("golden_qa.json")
_REQUIRED = ("id", "question", "reference", "in_corpus", "expected_sections")


def load_golden(path: Path = GOLDEN_PATH) -> list[dict]:
    rows = json.loads(Path(path).read_text(encoding="utf-8"))
    ids = [row["id"] for row in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("golden question ids must be unique")
    for row in rows:
        missing = [key for key in _REQUIRED if key not in row]
        if missing:
            raise ValueError(f"golden row {row.get('id')} missing {missing}")
        if not str(row["question"]).strip() or not str(row["reference"]).strip():
            raise ValueError(f"golden row {row['id']} needs a question and a reference")
        if row["in_corpus"] is False and row["reference"].strip() != CORPUS_MISS:
            raise ValueError(f"golden row {row['id']} is outside the corpus and must refuse")
    return rows


def _context_text(doc) -> str:
    if isinstance(doc, str):
        return doc.strip()
    return str(getattr(doc, "page_content", "") or "").strip()


def collect_samples(rows: list[dict], ask, retrieve) -> list[dict]:
    """Run retrieval and the advisory answer for each golden question."""
    samples = []
    for row in rows:
        docs = retrieve(row["question"]) or []
        result = ask(row["question"])
        parsed = result.get("parsed") or {}
        samples.append({
            "id": row["id"],
            "title": row.get("title", ""),
            "user_input": row["question"],
            "response": result.get("answer", ""),
            "retrieved_contexts": [text for text in (_context_text(doc) for doc in docs) if text],
            "reference": row["reference"],
            "in_corpus": bool(row["in_corpus"]),
            "expected_sections": list(row.get("expected_sections") or []),
            "cited_sections": list(parsed.get("cited_sections") or []),
        })
    return samples


def passes_refusal_gate(sample: dict) -> bool:
    """Out-of-corpus questions must refuse, with no section citation."""
    if sample["in_corpus"]:
        return True
    return (
        str(sample["response"]).strip() == CORPUS_MISS
        and not sample["cited_sections"]
    )


def matched_expected_sections(sample: dict) -> list[dict]:
    """Expected sections that appear in the citations actually returned."""
    found = []
    for expected in sample.get("expected_sections") or []:
        needle = str(expected.get("section", "")).strip().lower()
        act_bit = str(expected.get("act_contains", "")).strip().lower()
        for cited in sample.get("cited_sections") or []:
            number = str(cited.get("section_number", "")).strip().lower()
            act = str(cited.get("act", "")).lower()
            if number == needle and (not act_bit or act_bit in act):
                found.append(expected)
                break
    return found


def score_in_corpus(samples: list[dict]) -> dict:
    """Score in-corpus rows that retrieved at least one chunk.

    Uses Gemini as the RAGAS judge. Needs the `ragas` package, a Gemini key,
    and the Chroma corpus. Rows with no retrieved text are reported and skipped
    so a metric is not asked to score an empty context.
    """
    _prepare_ragas_import()
    from config import GEMINI_MODEL_ADVISORY, gemini_api_key
    from ragas import EvaluationDataset, evaluate
    from ragas.run_config import RunConfig

    ThreadedChat, ThreadedEmbeddings = _threaded_models()
    from ragas.dataset_schema import SingleTurnSample
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from ragas.llms import LangchainLLMWrapper

    Faithfulness, ResponseRelevancy, ContextPrecision, ContextRecall = _metric_classes()

    scored = []
    skipped = []
    for sample in samples:
        if not sample["in_corpus"]:
            continue
        if not sample["retrieved_contexts"]:
            skipped.append({"id": sample["id"], "reason": "no retrieved context"})
            continue
        scored.append(SingleTurnSample(
            user_input=sample["user_input"],
            response=sample["response"],
            retrieved_contexts=sample["retrieved_contexts"],
            reference=sample["reference"],
        ))

    if not scored:
        return {"metrics": {}, "skipped": skipped, "count": 0}

    key = gemini_api_key()
    # Sync Gemini calls in a worker thread. ragas drives an async loop that
    # nest_asyncio has patched, and the async Gemini client does not finish there.
    judge = LangchainLLMWrapper(ThreadedChat(
        model=GEMINI_MODEL_ADVISORY,
        google_api_key=key,
        temperature=0,
        timeout=45,
    ))
    embeddings = LangchainEmbeddingsWrapper(ThreadedEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=key,
    ))
    metrics = [
        Faithfulness(llm=judge),
        ResponseRelevancy(llm=judge, embeddings=embeddings),
        ContextPrecision(llm=judge),
        ContextRecall(llm=judge),
    ]
    result = evaluate(
        dataset=EvaluationDataset(samples=scored),
        metrics=metrics,
        llm=judge,
        embeddings=embeddings,
        run_config=RunConfig(max_retries=2, timeout=60, max_workers=2),
        raise_exceptions=False,
    )
    scores = _result_scores(result)
    return {"metrics": scores, "skipped": skipped, "count": len(scored)}


def _allow_timeout_without_task() -> None:
    """ragas applies nest_asyncio, which hides the running task on Python 3.14.

    asyncio.timeout then refuses to start, and every metric comes back as NaN.
    When no task is visible and the timeout is open-ended, enter it anyway.
    """
    import asyncio.timeouts as timeouts

    if getattr(timeouts.Timeout.__aenter__, "_taxsaathi_patch", False):
        return

    class _OpenTimeoutTask:
        def cancelling(self):
            return 0

        def uncancel(self):
            return 0

        def cancel(self, msg=None):
            return False

    original = timeouts.Timeout.__aenter__

    async def _aenter(self):
        import asyncio.tasks as aio_tasks

        if aio_tasks.current_task() is not None:
            return await original(self)
        self._state = timeouts._State.ENTERED
        self._task = _OpenTimeoutTask()
        self._cancelling = 0
        self.reschedule(self._when)
        return self

    _aenter._taxsaathi_patch = True
    timeouts.Timeout.__aenter__ = _aenter


def _prepare_ragas_import() -> None:
    """Let ragas 0.2.15 import on LangChain 1.4.

    That release imports Vertex classes that langchain-community 0.4 removed.
    The classes are only used to detect Vertex models, so empty stand-ins are
    enough for the Gemini judge.
    """
    import sys
    import types

    _allow_timeout_without_task()
    import langchain_community.chat_models  # noqa: F401
    import langchain_community.llms  # noqa: F401

    stubs = (
        ("langchain_community.chat_models.vertexai", "ChatVertexAI"),
        ("langchain_community.llms.vertexai", "VertexAI"),
    )
    for module_name, class_name in stubs:
        if module_name in sys.modules:
            continue
        module = types.ModuleType(module_name)
        setattr(module, class_name, type(class_name, (), {}))
        sys.modules[module_name] = module


def _threaded_models():
    from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

    class ThreadedChat(ChatGoogleGenerativeAI):
        async def agenerate_prompt(self, prompts, stop=None, callbacks=None, **kwargs):
            return await asyncio.to_thread(
                self.generate_prompt, prompts, stop, callbacks, **kwargs
            )

    class ThreadedEmbeddings(GoogleGenerativeAIEmbeddings):
        async def aembed_documents(self, texts):
            return await asyncio.to_thread(self.embed_documents, texts)

        async def aembed_query(self, text):
            return await asyncio.to_thread(self.embed_query, text)

    return ThreadedChat, ThreadedEmbeddings


def _metric_classes():
    """The four brief metrics, under the names current RAGAS exports."""
    _prepare_ragas_import()
    candidates = [
        (
            "ragas.metrics",
            ("Faithfulness", "ResponseRelevancy", "LLMContextPrecisionWithReference", "LLMContextRecall"),
        ),
        (
            "ragas.metrics",
            ("Faithfulness", "AnswerRelevancy", "ContextPrecision", "ContextRecall"),
        ),
    ]
    errors = []
    for module_name, names in candidates:
        try:
            module = __import__(module_name, fromlist=list(names))
            return tuple(getattr(module, name) for name in names)
        except (ImportError, AttributeError) as exc:
            errors.append(f"{module_name} {names}: {exc}")
    raise ImportError(
        "ragas is installed but does not export faithfulness, answer relevancy, "
        "context precision, and context recall. " + " | ".join(errors)
    )


def _result_scores(result) -> dict:
    if hasattr(result, "to_pandas"):
        frame = result.to_pandas()
        scores = {}
        for column in frame.columns:
            if column in {"user_input", "response", "retrieved_contexts", "reference"}:
                continue
            series = frame[column]
            if series.dtype.kind not in "fc":
                continue
            scores[column] = float(series.mean())
        if scores:
            return scores
    raw = getattr(result, "scores", None)
    if isinstance(raw, dict):
        return {key: float(value) for key, value in raw.items()}
    try:
        return {key: float(value) for key, value in dict(result).items()}
    except (TypeError, ValueError):
        return {"raw": str(result)}
