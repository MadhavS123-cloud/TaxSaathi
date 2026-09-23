"""
matcher.py

Tiered reconciliation engine.

Tier 1 - Exact reference match       : Hash Map, O(N)
Tier 2 - Exact amount+date match     : Hash Map, O(N)
Tier 3 - Fuzzy amount/date match     : sort + Two-Pointer sweep, O(N log N)
Tier 4 - Whatever's left             : unmatched, flagged for manual review

Overall complexity is O(N log N), dominated by the Tier 3 sort. Tiers 1-2
are linear and run first specifically to shrink the input to Tier 3, since
the two-pointer sweep is the most expensive step.
"""

from __future__ import annotations

from decimal import Decimal
from difflib import SequenceMatcher
from typing import Optional

from .models import Transaction, MatchResult, MatchType


def _name_similarity(a: Optional[str], b: Optional[str]) -> float:
    """Cheap fuzzy string similarity, 0..1. Swap for rapidfuzz if you need speed at scale."""
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


class Reconciler:
    def __init__(
        self,
        date_tolerance_days: int = 3,
        amount_tolerance: Decimal = Decimal("1.00"),
    ):
        """
        date_tolerance_days: how many days apart a payment can be from an
            invoice and still be considered a plausible match (accounts for
            bank processing delays).
        amount_tolerance: absolute rupee tolerance for "exact" amount
            matching in Tier 3 (accounts for rounding/bank charges).
        """
        self.date_tolerance_days = date_tolerance_days
        self.amount_tolerance = amount_tolerance

    def reconcile(
        self, invoices: list[Transaction], payments: list[Transaction]
    ) -> list[MatchResult]:
        results: list[MatchResult] = []

        remaining_invoices = list(invoices)
        remaining_payments = list(payments)

        # ---------- Tier 1: exact reference match (Hash Map) ----------
        payment_by_ref: dict[str, Transaction] = {}
        for p in remaining_payments:
            ref = p.normalized_reference()
            if ref:
                payment_by_ref.setdefault(ref, p)

        matched_payment_ids: set[str] = set()
        still_unmatched_invoices = []
        for inv in remaining_invoices:
            ref = inv.normalized_reference()
            pay = payment_by_ref.get(ref) if ref else None
            if pay and pay.id not in matched_payment_ids:
                results.append(self._make_match(MatchType.EXACT_REFERENCE, inv, pay, confidence=1.0))
                matched_payment_ids.add(pay.id)
            else:
                still_unmatched_invoices.append(inv)

        remaining_invoices = still_unmatched_invoices
        remaining_payments = [p for p in remaining_payments if p.id not in matched_payment_ids]

        # ---------- Tier 2: exact amount + date match (Hash Map) ----------
        payment_by_amount_date: dict[tuple, Transaction] = {}
        for p in remaining_payments:
            key = (p.amount, p.txn_date)
            payment_by_amount_date.setdefault(key, p)

        matched_payment_ids = set()
        still_unmatched_invoices = []
        for inv in remaining_invoices:
            key = (inv.amount, inv.txn_date)
            pay = payment_by_amount_date.get(key)
            if pay and pay.id not in matched_payment_ids:
                results.append(self._make_match(MatchType.EXACT_AMOUNT_DATE, inv, pay, confidence=0.95))
                matched_payment_ids.add(pay.id)
            else:
                still_unmatched_invoices.append(inv)

        remaining_invoices = still_unmatched_invoices
        remaining_payments = [p for p in remaining_payments if p.id not in matched_payment_ids]

        # ---------- Tier 3: fuzzy match via sort + two-pointer ----------
        fuzzy_matches, unmatched_inv, unmatched_pay = self._two_pointer_match(
            remaining_invoices, remaining_payments
        )
        results.extend(fuzzy_matches)

        # ---------- Tier 4: whatever's left is unmatched ----------
        for inv in unmatched_inv:
            results.append(
                MatchResult(match_type=MatchType.UNMATCHED_INVOICE, invoice=inv, confidence=0.0,
                             notes="No payment found within tolerance.")
            )
        for pay in unmatched_pay:
            results.append(
                MatchResult(match_type=MatchType.UNMATCHED_PAYMENT, payment=pay, confidence=0.0,
                             notes="No invoice found within tolerance.")
            )

        return results

    def _two_pointer_match(
        self, invoices: list[Transaction], payments: list[Transaction]
    ) -> tuple[list[MatchResult], list[Transaction], list[Transaction]]:
        """
        Sort both lists by amount, then sweep with two pointers. For each
        invoice, advance the payment pointer past amounts too low to be
        within tolerance, then scan forward while payments stay within
        tolerance, picking the best candidate by date-closeness (and name
        similarity as a tiebreaker) rather than just the first hit.
        """
        inv_sorted = sorted(invoices, key=lambda t: t.amount)
        pay_sorted = sorted(payments, key=lambda t: t.amount)

        matched_results: list[MatchResult] = []
        used_payment_ids: set[str] = set()

        j_start = 0  # left edge of the payment window, advances monotonically
        for inv in inv_sorted:
            lower = inv.amount - self.amount_tolerance
            upper = inv.amount + self.amount_tolerance

            # advance window start past payments now too low for ANY future invoice
            while j_start < len(pay_sorted) and pay_sorted[j_start].amount < lower:
                j_start += 1

            best_pay = None
            best_score = None  # (date_diff_days, -name_similarity) - lower is better
            j = j_start
            while j < len(pay_sorted) and pay_sorted[j].amount <= upper:
                pay = pay_sorted[j]
                j += 1
                if pay.id in used_payment_ids:
                    continue
                date_diff = abs((pay.txn_date - inv.txn_date).days)
                if date_diff > self.date_tolerance_days:
                    continue
                name_sim = _name_similarity(inv.party_name, pay.party_name)
                score = (date_diff, -name_sim)
                if best_score is None or score < best_score:
                    best_score = score
                    best_pay = pay

            if best_pay:
                used_payment_ids.add(best_pay.id)
                date_diff_days, neg_sim = best_score
                confidence = round(0.85 - 0.05 * date_diff_days + 0.1 * (-neg_sim), 2)
                confidence = max(0.3, min(confidence, 0.9))
                matched_results.append(
                    self._make_match(
                        MatchType.FUZZY_AMOUNT_DATE, inv, best_pay, confidence=confidence
                    )
                )

        matched_invoice_ids = {m.invoice.id for m in matched_results}
        unmatched_invoices = [i for i in invoices if i.id not in matched_invoice_ids]
        unmatched_payments = [p for p in payments if p.id not in used_payment_ids]

        return matched_results, unmatched_invoices, unmatched_payments

    @staticmethod
    def _make_match(
        match_type: MatchType, invoice: Transaction, payment: Transaction, confidence: float
    ) -> MatchResult:
        amount_diff = abs(invoice.amount - payment.amount)
        date_diff = abs((invoice.txn_date - payment.txn_date).days)
        notes = ""
        if amount_diff > 0:
            notes += f"Amount differs by {amount_diff}. "
        if date_diff > 0:
            notes += f"Dates differ by {date_diff} day(s)."
        return MatchResult(
            match_type=match_type,
            invoice=invoice,
            payment=payment,
            confidence=confidence,
            amount_diff=amount_diff,
            date_diff_days=date_diff,
            notes=notes.strip(),
        )
