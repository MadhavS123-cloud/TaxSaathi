"""Advisory grounding without Chroma or Gemini."""

from types import SimpleNamespace

import advisory


def _doc(act, section, text=None, title=""):
    if text is None:
        text = (
            "Every registered person shall, subject to such conditions and restrictions "
            "as may be prescribed, be entitled to take credit of input tax charged on any "
            "supply of goods or services or both which are used or intended to be used in "
            "the course or furtherance of business."
        )
    return SimpleNamespace(
        page_content=text,
        metadata={
            "act": act,
            "section_number": section,
            "section_title": title,
            "source_file": "act.pdf",
        },
    )


def test_empty_retrieval_says_corpus_does_not_contain_the_answer(monkeypatch):
    monkeypatch.setattr(advisory, "retrieve_relevant_documents", lambda query, top_k=7: [])
    called = {"llm": False}

    def _boom(chain, payload):
        called["llm"] = True
        raise AssertionError("the model must not be called")

    monkeypatch.setattr(advisory, "_invoke_with_backoff", _boom)
    result = advisory.ask_tax_copilot("What is the tax on imported widgets?")
    assert called["llm"] is False
    assert result["answer"] == advisory.CORPUS_MISS
    assert result["citations"] == []
    assert result["parsed"]["is_insufficient_context"] is True
    assert result["parsed"]["cited_sections"] == []


def test_repealed_1961_chunks_are_not_cited(monkeypatch):
    docs = [_doc("Income-tax Act, 1961", "80C", title="Deduction")]
    monkeypatch.setattr(advisory, "retrieve_relevant_documents", lambda query, top_k=7: docs)
    monkeypatch.setattr(
        advisory,
        "_invoke_with_backoff",
        lambda chain, payload: (_ for _ in ()).throw(AssertionError("the model must not be called")),
    )
    result = advisory.ask_tax_copilot("What is the 80C deduction?")
    assert result["answer"] == advisory.CORPUS_MISS
    assert result["parsed"]["cited_sections"] == []


def test_section_citation_is_kept_when_it_was_retrieved(monkeypatch):
    docs = [_doc("CGST Act, 2017", "16", title="ITC")]
    monkeypatch.setattr(advisory, "retrieve_relevant_documents", lambda query, top_k=7: docs)

    def _reply(chain, payload):
        return (
            "### Direct Answer\n"
            "Input tax credit follows the supplied CGST provision.\n\n"
            "CITED_SECTIONS:\n"
            "SECTION_REF: CGST Act, 2017 | Section 16 | | Eligibility and conditions\n"
            "CONFIDENCE_LEVEL: HIGH\n"
            "CONFIDENCE_REASON: The retrieved section addresses the question.\n"
        )

    monkeypatch.setattr(advisory, "_invoke_with_backoff", _reply)
    result = advisory.ask_tax_copilot("When is input tax credit available?")
    cited = result["parsed"]["cited_sections"]
    assert len(cited) == 1
    assert cited[0]["section_number"].strip() == "16"
    assert "cgst" in cited[0]["act"].lower()
    assert result["parsed"]["is_insufficient_context"] is False
    assert "16" in result["citations"][0]


def test_invented_section_is_dropped_and_answer_is_not_kept(monkeypatch):
    docs = [_doc("CGST Act, 2017", "16", title="ITC")]
    monkeypatch.setattr(advisory, "retrieve_relevant_documents", lambda query, top_k=7: docs)

    def _reply(chain, payload):
        return (
            "### Direct Answer\n"
            "A fabricated rate applies.\n\n"
            "CITED_SECTIONS:\n"
            "SECTION_REF: CGST Act, 2017 | Section 999 | | Invented\n"
            "SECTION_REF: Income-tax Act, 1961 | Section 80C | | Deduction\n"
            "CONFIDENCE_LEVEL: HIGH\n"
            "CONFIDENCE_REASON: Guess.\n"
        )

    monkeypatch.setattr(advisory, "_invoke_with_backoff", _reply)
    result = advisory.ask_tax_copilot("What rate applies?")
    assert result["answer"] == advisory.CORPUS_MISS
    assert result["citations"] == []
    assert result["parsed"]["cited_sections"] == []


def test_model_insufficiency_flag_overrides_a_guess(monkeypatch):
    docs = [_doc("IGST Act, 2017", "5", title="Levy")]
    monkeypatch.setattr(advisory, "retrieve_relevant_documents", lambda query, top_k=7: docs)

    def _reply(chain, payload):
        return "INSUFFICIENT_CONTEXT: The corpus does not contain the answer."

    monkeypatch.setattr(advisory, "_invoke_with_backoff", _reply)
    result = advisory.ask_tax_copilot("How is IGST levied on this contract?")
    assert result["answer"] == advisory.CORPUS_MISS
    assert result["parsed"]["cited_sections"] == []
