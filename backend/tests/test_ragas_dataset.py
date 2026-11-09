"""Golden-set shape and the refusal gate. No network and no ragas import."""

from types import SimpleNamespace

from advisory import CORPUS_MISS
from eval.ragas_eval import (
    collect_samples,
    load_golden,
    matched_expected_sections,
    passes_refusal_gate,
)


def test_ragas_metrics_import_on_this_langchain():
    from eval.ragas_eval import _metric_classes

    faithfulness, relevancy, precision, recall = _metric_classes()
    assert faithfulness.__name__ == "Faithfulness"
    assert relevancy.__name__ == "ResponseRelevancy"
    assert precision.__name__ == "LLMContextPrecisionWithReference"
    assert recall.__name__ == "LLMContextRecall"


def test_golden_set_has_the_seven_scenarios_and_a_refusal():
    rows = load_golden()
    assert [row["id"] for row in rows] == ["A", "B", "C", "D", "E", "F", "G"]
    outside = [row for row in rows if not row["in_corpus"]]
    assert [row["id"] for row in outside] == ["E", "F"]
    assert all(row["reference"] == CORPUS_MISS for row in outside)
    assert all("1961" not in row["question"] for row in rows)
    income = next(row for row in rows if row["id"] == "G")
    assert income["expected_sections"] == [{"act_contains": "Income", "section": "19"}]


def test_refusal_gate_rejects_a_cited_answer_outside_the_corpus():
    rows = [row for row in load_golden() if row["id"] == "F"]

    def ask(question):
        return {
            "answer": "The cap is 10 percent.",
            "parsed": {"cited_sections": [{"act": "FCRA", "section_number": "9"}]},
        }

    def retrieve(question):
        return []

    sample = collect_samples(rows, ask, retrieve)[0]
    assert sample["user_input"].startswith("What are the foreign contribution")
    assert sample["retrieved_contexts"] == []
    assert passes_refusal_gate(sample) is False


def test_refusal_gate_accepts_the_corpus_sentence_and_section_match_is_separate():
    rows = load_golden()

    def ask(question):
        if "Foreign Contribution" in question or question.startswith("What is the penalty"):
            return {"answer": CORPUS_MISS, "parsed": {"cited_sections": []}}
        return {
            "answer": "Section 16 sets the conditions.",
            "parsed": {"cited_sections": [{"act": "CGST Act, 2017", "section_number": "16"}]},
        }

    def retrieve(question):
        return [SimpleNamespace(page_content="Section 16 input tax credit conditions. " * 8)]

    samples = collect_samples(rows, ask, retrieve)
    by_id = {sample["id"]: sample for sample in samples}
    assert passes_refusal_gate(by_id["F"]) is True
    assert passes_refusal_gate(by_id["E"]) is True
    assert passes_refusal_gate(by_id["B"]) is True
    assert matched_expected_sections(by_id["B"]) == [{"act_contains": "CGST", "section": "16"}]
    assert matched_expected_sections(by_id["C"]) == []
    assert by_id["D"]["retrieved_contexts"][0].startswith("Section 16")
