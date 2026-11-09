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
from itertools import combinations
from typing import Optional

from .models import Transaction, MatchResult, MatchType

# Path B never inspects more than this many payments for one invoice.
_PARTIAL_CANDIDATE_CAP = 12


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
        partial_window_days: Optional[int] = None,
    ):
        """
        date_tolerance_days: how many days apart a payment can be from an
            invoice and still be considered a plausible match (accounts for
            bank processing delays).
        amount_tolerance: absolute rupee tolerance for "exact" amount
            matching in Tier 3 (accounts for rounding/bank charges).
        partial_window_days: how far a one-to-many amount match may sit from
            the invoice date. Defaults to config.PARTIAL_WINDOW_DAYS (30).
        """
        self.date_tolerance_days = date_tolerance_days
        self.amount_tolerance = amount_tolerance
        if partial_window_days is None:
            from config import PARTIAL_WINDOW_DAYS
            partial_window_days = PARTIAL_WINDOW_DAYS
        self.partial_window_days = partial_window_days

    def reconcile(
        self, invoices: list[Transaction], payments: list[Transaction]
    ) -> list[MatchResult]:
        results: list[MatchResult] = []

        remaining_invoices = list(invoices)
        remaining_payments = list(payments)

        # ---------- Tier 1: exact reference match (Hash Map) ----------
        # A reference carried by two or more payments is not a one-to-one
        # match. Leave that whole group unmatched so the later partial tier
        # can sum it. A reference with a single payment behaves as before.
        ref_counts: dict[str, int] = {}
        for p in remaining_payments:
            ref = p.normalized_reference()
            if ref:
                ref_counts[ref] = ref_counts.get(ref, 0) + 1

        payment_by_ref: dict[str, Transaction] = {}
        for p in remaining_payments:
            ref = p.normalized_reference()
            if ref and ref_counts[ref] == 1:
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

        # One-to-many partials, only on what tiers 1-3 left over.
        partial_matches, unmatched_inv, unmatched_pay, review_notes = self._match_partial_payments_inner(
            unmatched_inv, unmatched_pay
        )
        results.extend(partial_matches)

        # ---------- Tier 4: whatever's left is unmatched ----------
        for inv in unmatched_inv:
            results.append(
                MatchResult(
                    match_type=MatchType.UNMATCHED_INVOICE,
                    invoice=inv,
                    confidence=0.0,
                    notes=review_notes.get(inv.id, "No payment found within tolerance."),
                )
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

    def _match_partial_payments_inner(
        self,
        invoices: list[Transaction],
        payments: list[Transaction],
    ) -> tuple[list[MatchResult], list[Transaction], list[Transaction], dict[str, str]]:
        used: set[str] = set()
        consumed_invoices: set[str] = set()
        review_notes: dict[str, str] = {}
        matches: list[MatchResult] = []
        ordered = sorted(invoices, key=lambda t: (t.txn_date, t.amount, t.id))

        for inv in ordered:
            group = self._reference_group(inv, payments, used)
            if len(group) < 2:
                continue
            total = sum((p.amount for p in group), Decimal("0"))
            gap = inv.amount - total
            if abs(gap) <= self.amount_tolerance:
                matches.append(self._partial_result(inv, group, total, Decimal("0"), 0.9, "reference"))
                used.update(p.id for p in group)
                consumed_invoices.add(inv.id)
            elif total < inv.amount:
                matches.append(self._partial_result(inv, group, total, gap, 0.7, "reference"))
                used.update(p.id for p in group)
                consumed_invoices.add(inv.id)
            else:
                excess = total - inv.amount
                ids = ", ".join(p.id for p in group)
                review_notes[inv.id] = (
                    f"Overpayment: payments {ids} sum to {total}, "
                    f"above invoice amount {inv.amount} by {excess}."
                )

        for inv in ordered:
            if inv.id in consumed_invoices or inv.id in review_notes:
                continue
            chosen = self._amount_subset(inv, payments, used)
            if not chosen:
                continue
            total = sum((p.amount for p in chosen), Decimal("0"))
            matches.append(self._partial_result(inv, chosen, total, Decimal("0"), 0.6, "amount"))
            used.update(p.id for p in chosen)
            consumed_invoices.add(inv.id)

        remaining_invoices = [inv for inv in invoices if inv.id not in consumed_invoices]
        remaining_payments = [pay for pay in payments if pay.id not in used]
        return matches, remaining_invoices, remaining_payments, review_notes

    def _reference_group(
        self, invoice: Transaction, payments: list[Transaction], used: set[str]
    ) -> list[Transaction]:
        ref = invoice.normalized_reference()
        if not ref:
            return []
        group = [
            pay for pay in payments
            if pay.id not in used and pay.normalized_reference() == ref
        ]
        return sorted(group, key=lambda pay: pay.id)

    def _amount_subset(
        self, invoice: Transaction, payments: list[Transaction], used: set[str]
    ) -> Optional[list[Transaction]]:
        available = []
        for pay in payments:
            if pay.id in used:
                continue
            if abs((pay.txn_date - invoice.txn_date).days) <= self.partial_window_days:
                available.append(pay)
        available.sort(key=lambda pay: (abs((pay.txn_date - invoice.txn_date).days), pay.id))
        candidates = available[:_PARTIAL_CANDIDATE_CAP]

        best: Optional[tuple[Transaction, ...]] = None
        best_key = None
        for size in range(2, 5):
            if len(candidates) < size:
                break
            for subset in combinations(candidates, size):
                total = sum((pay.amount for pay in subset), Decimal("0"))
                if abs(total - invoice.amount) > self.amount_tolerance:
                    continue
                dates = [pay.txn_date for pay in subset]
                spread = (max(dates) - min(dates)).days
                ids = tuple(sorted(pay.id for pay in subset))
                key = (size, spread, ids)
                if best_key is None or key < best_key:
                    best_key = key
                    best = subset
        if best is None:
            return None
        return list(best)

    def _partial_result(
        self,
        invoice: Transaction,
        group: list[Transaction],
        total: Decimal,
        shortfall: Decimal,
        confidence: float,
        kind: str,
    ) -> MatchResult:
        ordered = sorted(group, key=lambda pay: pay.id)
        ids = [pay.id for pay in ordered]
        if kind == "amount":
            note = f"Payments used: {', '.join(ids)}."
        elif shortfall > 0:
            note = f"Partial payment: {', '.join(ids)} total {total}; shortfall {shortfall}."
        else:
            note = f"Partial payment: {', '.join(ids)} total {total}; shortfall 0."
        dates = [pay.txn_date for pay in ordered]
        return MatchResult(
            match_type=MatchType.PARTIAL_PAYMENT,
            invoice=invoice,
            payment=None,
            confidence=confidence,
            amount_diff=abs(invoice.amount - total),
            date_diff_days=(max(dates) - min(dates)).days,
            notes=note,
            payment_ids=ids,
            payments=ordered,
            total_paid=total,
            shortfall=shortfall,
        )
