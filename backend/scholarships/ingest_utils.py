"""
Helpers for Award Explorer ingestion: default deadlines and catalog/saved cleanup.

Default deadline rule: next April 30 on or after the reference date; if that April 30
is strictly before the reference date, use April 30 of the following year.
(U of T–aligned end-of-academic-year proxy when the source omits a date.)
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import TYPE_CHECKING

from django.db import transaction
from django.utils import timezone

from .models import SavedScholarship, SavedScholarshipStatus, Scholarship, StudentLevel

if TYPE_CHECKING:
    pass


def default_school_year_end_deadline(reference: date) -> date:
    """Next April 30 that is still relevant for applications after `reference`."""
    y = reference.year
    this_year = date(y, 4, 30)
    if reference <= this_year:
        return this_year
    return date(y + 1, 4, 30)


def clean_text(text):
    if text is None:
        return ""
    if not text:
        return ""
    return str(text).replace("\x00", "")


def parse_amount(amount_text):
    if not amount_text:
        return None, None
    numbers = [int(n.replace(",", "")) for n in re.findall(r"\d[\d,]*", amount_text)]
    if not numbers:
        return None, None
    if len(numbers) == 1:
        return numbers[0], numbers[0]
    return min(numbers), max(numbers)


def parse_nature_flags(raw: str) -> dict:
    r = (raw or "").lower()
    return {
        "nature_academic_merit": "academic merit" in r,
        "nature_athletic_performance": "athletic performance" in r,
        "nature_community": "community" in r,
        "nature_financial_need": "financial need" in r,
        "nature_leadership": "leadership" in r,
        "nature_indigenous": "indigenous" in r,
        "nature_black_students": "black students" in r,
        "nature_extracurriculars": "extra curriculars" in r or "extracurriculars" in r,
        "nature_other": "other" in r,
    }


def default_estimated_deadline() -> date:
    return default_school_year_end_deadline(timezone.now().date())


def parse_undergrad_cells(cells) -> dict | None:
    """Parse 9-cell Award Explorer undergrad table row (BeautifulSoup td list)."""
    if len(cells) < 9:
        return None

    title = clean_text(cells[0].text.strip())

    desc = cells[1].find(text=True, recursive=False)
    if desc:
        description = clean_text(desc.strip())
    else:
        description = clean_text(cells[1].text.strip())

    offered_by = clean_text(cells[2].text.strip()) or None
    award_type_raw = clean_text(cells[3].text.strip().lower())
    award_type_map = {
        "admission": "admissions",
        "in-course": "in_course",
        "graduating": "graduating",
    }
    award_type = award_type_map.get(award_type_raw, None)

    url_tag = cells[1].find("a")
    url = clean_text(url_tag["href"]) if url_tag else None

    app_cell = clean_text(cells[5].text.strip())
    app_tag = cells[5].find("a")
    application_required = "yes" in app_cell.lower()
    application_url = clean_text(app_tag["href"]) if app_tag else None

    citizenship_raw = clean_text(cells[4].text.strip().lower())
    open_to_domestic = "domestic" in citizenship_raw
    open_to_international = "international" in citizenship_raw

    nature_raw = clean_text(cells[6].text.strip().lower())
    nature_academic_merit = "academic merit" in nature_raw
    nature_athletic_performance = "athletic performance" in nature_raw
    nature_community = "community" in nature_raw
    nature_financial_need = "financial need" in nature_raw
    nature_leadership = "leadership" in nature_raw
    nature_indigenous = "indigenous" in nature_raw
    nature_black_students = "black students" in nature_raw
    nature_extracurriculars = (
        "extra curriculars" in nature_raw or "extracurriculars" in nature_raw
    )
    nature_other = "other" in nature_raw

    deadline_raw = clean_text(cells[7].text.strip())
    deadline_parsed = None
    if deadline_raw:
        try:
            deadline_parsed = datetime.strptime(deadline_raw, "%Y-%m-%d %H:%M").date()
        except ValueError:
            pass

    amount_text = clean_text(cells[8].text.strip()) or None
    amount_min, amount_max = parse_amount(amount_text)

    return {
        "title": title,
        "description": description,
        "offered_by": offered_by,
        "award_type": award_type,
        "url": url,
        "application_required": application_required,
        "application_url": application_url,
        "open_to_domestic": open_to_domestic,
        "open_to_international": open_to_international,
        "nature_academic_merit": nature_academic_merit,
        "nature_athletic_performance": nature_athletic_performance,
        "nature_community": nature_community,
        "nature_financial_need": nature_financial_need,
        "nature_leadership": nature_leadership,
        "nature_indigenous": nature_indigenous,
        "nature_black_students": nature_black_students,
        "nature_extracurriculars": nature_extracurriculars,
        "nature_other": nature_other,
        "deadline": deadline_parsed,
        "deadline_parsed": deadline_parsed,
        "deadline_is_estimated": deadline_parsed is None,
        "amount_text": amount_text,
        "amount_min": amount_min,
        "amount_max": amount_max,
    }


def parse_grad_cells(cells) -> dict | None:
    """Parse 8-cell graduate catalog row; deadline is estimated when source omits it."""
    if len(cells) < 8:
        return None

    title = clean_text(cells[0].text.strip())

    desc = cells[1].find(text=True, recursive=False)
    if desc:
        description = clean_text(desc.strip())
    else:
        description = clean_text(cells[1].text.strip())

    offered_by = clean_text(cells[2].text.strip()) or None
    award_type_raw = clean_text(cells[3].text.strip().lower())
    award_type_map = {
        "admission": "admissions",
        "in-course": "in_course",
        "graduating": "graduating",
    }
    award_type = award_type_map.get(award_type_raw, None)

    url_tag = cells[1].find("a")
    url = clean_text(url_tag["href"]) if url_tag else None

    app_cell = clean_text(cells[5].text.strip())
    app_tag = cells[5].find("a")
    application_required = "yes" in app_cell.lower()
    application_url = clean_text(app_tag["href"]) if app_tag else None

    citizenship_raw = clean_text(cells[4].text.strip().lower())
    open_to_domestic = "domestic" in citizenship_raw
    open_to_international = "international" in citizenship_raw

    nature_raw = clean_text(cells[6].text.strip().lower())
    nature_academic_merit = "academic merit" in nature_raw
    nature_athletic_performance = "athletic performance" in nature_raw
    nature_community = "community" in nature_raw
    nature_financial_need = "financial need" in nature_raw
    nature_leadership = "leadership" in nature_raw
    nature_indigenous = "indigenous" in nature_raw
    nature_black_students = "black students" in nature_raw
    nature_extracurriculars = (
        "extra curriculars" in nature_raw or "extracurriculars" in nature_raw
    )
    nature_other = "other" in nature_raw

    amount_text = clean_text(cells[7].text.strip()) or None
    amount_min, amount_max = parse_amount(amount_text)

    est_deadline = default_estimated_deadline()

    return {
        "title": title,
        "description": description,
        "offered_by": offered_by,
        "award_type": award_type,
        "url": url,
        "application_required": application_required,
        "application_url": application_url,
        "open_to_domestic": open_to_domestic,
        "open_to_international": open_to_international,
        "nature_academic_merit": nature_academic_merit,
        "nature_athletic_performance": nature_athletic_performance,
        "nature_community": nature_community,
        "nature_financial_need": nature_financial_need,
        "nature_leadership": nature_leadership,
        "nature_indigenous": nature_indigenous,
        "nature_black_students": nature_black_students,
        "nature_extracurriculars": nature_extracurriculars,
        "nature_other": nature_other,
        "deadline": est_deadline,
        "deadline_parsed": None,
        "deadline_is_estimated": True,
        "amount_text": amount_text,
        "amount_min": amount_min,
        "amount_max": amount_max,
    }


def resolve_deadline_for_ingest(
    parsed_deadline: date | None,
    existing: Scholarship | None,
) -> tuple[date, bool]:
    """
    Returns (deadline, deadline_is_estimated).
    Preserves a previously reported deadline when the scrape has no date.
    """
    if parsed_deadline is not None:
        return parsed_deadline, False
    if existing and existing.deadline and not existing.deadline_is_estimated:
        return existing.deadline, False
    ref = timezone.now().date()
    return default_school_year_end_deadline(ref), True


@transaction.atomic
def deactivate_stale_scholarships(student_level: str, run_started_at) -> int:
    """Mark scholarships of this level not seen since run_started_at as inactive."""
    qs = Scholarship.objects.filter(
        student_level=student_level,
        last_seen_at__lt=run_started_at,
    )
    return qs.update(is_active=False)


@transaction.atomic
def prune_overdue_saved_scholarships(grace_days: int = 21) -> int:
    """
    Remove saved rows that are past deadline + grace for early pipeline statuses only.
    Submitted items are kept so users can still track outcomes.
    """
    today = timezone.now().date()
    cutoff = today - timedelta(days=grace_days)
    qs = SavedScholarship.objects.filter(
        status__in=[
            SavedScholarshipStatus.SAVED,
            SavedScholarshipStatus.IN_PROGRESS,
        ],
        scholarship__deadline__isnull=False,
        scholarship__deadline__lt=cutoff,
    )
    n = qs.count()
    qs.delete()
    return n
