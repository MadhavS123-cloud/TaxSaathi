"""
test_advisory_eval.py - Evaluation Suite for TaxSaathi CA Advisory Assistant
=============================================================================
Evaluates the RAG system across the 7 mandatory scenarios from the specification:
  A. Salary / CTC income tax calculation
  B. Input Tax Credit (ITC) eligibility under GST
  C. Inter-state vs intra-state supply determination
  D. Conditions and exceptions under a specific statutory section (Section 16 CGST)
  E. Underspecified penalty question
  F. Question whose provision is absent from the knowledge base
  G. Question involving a specific financial year / amendment applicability
"""

import sys
import io
import json
import logging
from advisory import ask_tax_copilot

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
logging.basicConfig(level=logging.WARNING)

TEST_CASES = [
    {
        "id": "A",
        "title": "CTC Calculation & Assumptions",
        "query": "What is the income tax liability for an employee with a CTC of ₹20 lakh?",
        "expected": "Distinguish CTC from taxable salary, state assumptions clearly, provide structured calculation or explain required data, avoid ungrounded guesses.",
    },
    {
        "id": "B",
        "title": "GST Input Tax Credit Eligibility",
        "query": "When can a registered business claim input tax credit under GST?",
        "expected": "Retrieve CGST Act provisions (Section 16 etc.), list key conditions, restrictions, and statutory citations.",
    },
    {
        "id": "C",
        "title": "Inter-State vs Intra-State Supply",
        "query": "How do I determine whether a supply is inter-state or intra-state?",
        "expected": "Differentiate location of supplier vs place of supply under IGST Act (Section 7, 8 etc.), provide clear criteria.",
    },
    {
        "id": "D",
        "title": "Specific Provision Deep-Dive",
        "query": "Explain the conditions and exceptions under Section 16 of the CGST Act.",
        "expected": "Accurately extract conditions (possession of invoice, receipt of goods, payment to supplier, tax paid) and exceptions.",
    },
    {
        "id": "E",
        "title": "Underspecified Penalty Question",
        "query": "What is the penalty for this violation?",
        "expected": "Detect missing violation context, ask for necessary details, distinguish penalty from interest/late fee, avoid fabricating.",
    },
    {
        "id": "F",
        "title": "Out-of-Corpus / Absent Provision",
        "query": "What are the cross-border investment rules and foreign contribution caps under the Foreign Contribution Regulation Act (FCRA)?",
        "expected": "Explicitly identify insufficient context; do not hallucinate statutory provisions or fake citations.",
    },
    {
        "id": "G",
        "title": "Financial Year / Amendment Applicability",
        "query": "What is the standard deduction and tax slab under Section 115BAC for Financial Year 2024-25 (Assessment Year 2025-26)?",
        "expected": "State verified rates/deductions or disclose statutory applicability limits based on available corpus version.",
    },
]


def run_eval():
    print("=" * 80)
    print("TAXSAATHI CA ADVISORY ASSISTANT — COMPREHENSIVE EVALUATION SUITE")
    print("=" * 80)

    results = []

    for test in TEST_CASES:
        t_id = test["id"]
        title = test["title"]
        query = test["query"]
        expected = test["expected"]

        print(f"\n[{t_id}] Running Test: {title}")
        print(f"Query: \"{query}\"")
        print(f"Expected: {expected}")
        print("-" * 60)

        try:
            res = ask_tax_copilot(query)
            parsed = res.get("parsed", {})

            conf = parsed.get("confidence_level", "UNKNOWN")
            conf_reason = parsed.get("confidence_reason", "")
            is_insufficient = parsed.get("is_insufficient_context", False)
            cited_sections = parsed.get("cited_sections", [])
            summary = parsed.get("summary", "")
            detailed = parsed.get("detailed_answer", "")
            action_note = parsed.get("ca_action_note", "")

            print(f"Confidence Level: {conf}")
            print(f"Confidence Reason: {conf_reason}")
            print(f"Insufficient Context Flag: {is_insufficient}")
            print(f"Citations Count: {len(cited_sections)}")
            if cited_sections:
                print("Cited Provisions:")
                for sec in cited_sections:
                    subsec = f"({sec['subsection']})" if sec.get("subsection") else ""
                    print(f"  • {sec.get('act')} Section {sec.get('section_number')}{subsec} - {sec.get('section_title')}")

            print("\nDirect Answer / Summary:")
            print(summary[:400] + ("..." if len(summary) > 400 else ""))

            test_result = {
                "id": t_id,
                "title": title,
                "query": query,
                "confidence_level": conf,
                "confidence_reason": conf_reason,
                "is_insufficient_context": is_insufficient,
                "num_citations": len(cited_sections),
                "citations": cited_sections,
                "summary": summary,
                "detailed_answer": detailed,
                "ca_action_note": action_note,
            }
            results.append(test_result)

        except Exception as e:
            print(f"ERROR executing test {t_id}: {e}")
            results.append({
                "id": t_id,
                "title": title,
                "query": query,
                "error": str(e),
            })

        print("=" * 60)

    # Save output to evaluation log
    with open("eval_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print("\nEvaluation complete! Results saved to backend/eval_results.json")


if __name__ == "__main__":
    run_eval()
