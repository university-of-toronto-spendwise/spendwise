"""Business logic for scholarships (deficit impact, shared helpers)."""

from __future__ import annotations

from decimal import Decimal

from accounts.models import UserProfile


def monthly_deficit_from_profile(profile: UserProfile) -> Decimal:
    """
    Monthly funding gap from profile fields (aligned with frontend financialSnapshot.deficit).
    effective_income = total_earnings + parental_support + scholarship_aid (if receiving aid).
    deficit = max(total_expenses - effective_income, 0).
    """
    def to_dec(v) -> Decimal:
        if v is None:
            return Decimal("0")
        return Decimal(str(v))

    expenses = to_dec(profile.total_expenses)
    revenue = to_dec(profile.total_earnings)
    parental = to_dec(profile.parental_support)
    aid = to_dec(profile.scholarship_aid_amount) if profile.receives_scholarships_or_aid else Decimal("0")
    effective = revenue + parental + aid
    gap = expenses - effective
    return gap if gap > 0 else Decimal("0")


def nominal_amount_for_scholarship(s) -> int:
    """Best-effort dollar amount for a scholarship row (max over min)."""
    if s.amount_max is not None:
        return int(s.amount_max)
    if s.amount_min is not None:
        return int(s.amount_min)
    return 0


def saved_scholarships_nominal_total(saved_rows) -> int:
    """Sum nominal amounts for iterable of SavedScholarship with .scholarship loaded."""
    return sum(nominal_amount_for_scholarship(row.scholarship) for row in saved_rows)
