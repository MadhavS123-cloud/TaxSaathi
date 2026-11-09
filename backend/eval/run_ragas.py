"""Score the golden advisory questions with RAGAS.

Run from backend/, with the venv active and the corpus already embedded:

    python -m eval.run_ragas

This calls Gemini and Chroma. It is not part of the default pytest run.
"""

from advisory import ask_tax_copilot, retrieve_relevant_documents
from eval.ragas_eval import (
    collect_samples,
    load_golden,
    matched_expected_sections,
    passes_refusal_gate,
    score_in_corpus,
)


def main() -> None:
    rows = load_golden()
    samples = collect_samples(rows, ask_tax_copilot, lambda query: retrieve_relevant_documents(query))

    print("Refusal gate (out-of-corpus questions must not cite a section)")
    for sample in samples:
        if sample["in_corpus"]:
            continue
        status = "PASS" if passes_refusal_gate(sample) else "FAIL"
        print(f"  {sample['id']} {status}  {sample['title']}")

    print("Expected sections found in the answer")
    for sample in samples:
        if not sample["expected_sections"]:
            continue
        found = matched_expected_sections(sample)
        print(f"  {sample['id']} {len(found)}/{len(sample['expected_sections'])}  {sample['title']}")

    print("RAGAS (in-corpus rows with retrieved text)")
    try:
        outcome = score_in_corpus(samples)
    except ImportError as exc:
        print(f"  RAGAS did not run: {exc}")
        return
    print(f"  scored {outcome['count']} rows")
    for name, value in outcome["metrics"].items():
        print(f"  {name}: {value:.3f}" if isinstance(value, float) else f"  {name}: {value}")
    for skipped in outcome["skipped"]:
        print(f"  skipped {skipped['id']}: {skipped['reason']}")


if __name__ == "__main__":
    main()
