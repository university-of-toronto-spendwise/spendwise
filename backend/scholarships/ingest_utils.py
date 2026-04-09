"""
Shared parsing helpers for Award Explorer HTML rows.

Undergraduate table rows have 9 <td> cells (deadline + amount).
Graduate rows have 8 cells (amount only; no separate deadline column).
"""

from __future__ import annotations

import re
from datetime import date
from typing import Any

from django.utils import timezone


def clean_text(text: str | None) -> str:
    if not text:
        return ""
    return text.replace("\x00", "")


def parse_amount(amount_text: str | None) -> tuple[int | None, int | None]:
    """Parse amount string into (min, max) tuple of integers."""
    if not amount_text:
        return None, None
    numbers = [int(n.replace(",", "")) for n in re.findall(r"\d[\d,]*", amount_text)]
    if not numbers:
        return None, None
    if len(numbers) == 1:
        return numbers[0], numbers[0]
    return min(numbers), max(numbers)


def _first_text_node(cell) -> str:
    """Prefer direct text under the cell (avoids pulling in nested link text twice)."""
    if cell is None:
        return ""
    first = cell.find(string=True, recursive=False)
    if first:
        return clean_text(str(first).strip())
    return clean_text(cell.get_text(strip=True))


def _parse_deadline_cell(deadline_raw: str):
    from datetime import datetime

    deadline_raw = clean_text(deadline_raw.strip())
    if not deadline_raw:
        return None
    try:
        return datetime.strptime(deadline_raw, "%Y-%m-%d %H:%M").date()
    except ValueError:
        return None


AWARD_TYPE_MAP = {
    "admission": "admissions",
    "in-course": "in_course",
    "graduating": "graduating",
}


def default_estimated_deadline() -> date:
    """When the catalog has no deadline (graduate rows), assume next April 30 cycle."""
    today = timezone.now().date()
    y = today.year
    april = date(y, 4, 30)
    if today <= april:
        return april
    return date(y + 1, 4, 30)


def parse_nature_flags(nature_raw: str) -> dict[str, bool]:
    nature_raw = nature_raw.lower()
    return {
        "nature_academic_merit": "academic merit" in nature_raw,
        "nature_athletic_performance": "athletic performance" in nature_raw,
        "nature_community": "community" in nature_raw,
        "nature_financial_need": "financial need" in nature_raw,
        "nature_leadership": "leadership" in nature_raw,
        "nature_indigenous": "indigenous" in nature_raw,
        "nature_black_students": "black students" in nature_raw,
        "nature_extracurriculars": "extra curriculars" in nature_raw or "extracurriculars" in nature_raw,
        "nature_other": "other" in nature_raw,
    }


def parse_undergrad_cells(cells: list) -> dict[str, Any] | None:
    if len(cells) < 9:
        return None

    title = clean_text(cells[0].text.strip())
    desc = _first_text_node(cells[1]) or clean_text(cells[1].text.strip())
    offered_by = clean_text(cells[2].text.strip()) or None
    award_type_raw = clean_text(cells[3].text.strip().lower())
    award_type = AWARD_TYPE_MAP.get(award_type_raw)

    url_tag = cells[1].find("a")
    url = clean_text(url_tag["href"]) if url_tag and url_tag.get("href") else None

    app_cell = clean_text(cells[5].text.strip())
    app_tag = cells[5].find("a")
    application_required = "yes" in app_cell.lower()
    application_url = clean_text(app_tag["href"]) if app_tag and app_tag.get("href") else None

    citizenship_raw = clean_text(cells[4].text.strip().lower())
    open_to_domestic = "domestic" in citizenship_raw
    open_to_international = "international" in citizenship_raw

    nature_raw = clean_text(cells[6].text.strip().lower())
    nature = parse_nature_flags(nature_raw)

    deadline = _parse_deadline_cell(cells[7].text)
    amount_text = clean_text(cells[8].text.strip()) or None
    amount_min, amount_max = parse_amount(amount_text)

    return {
        "title": title,
        "description": desc,
        "offered_by": offered_by,
        "award_type": award_type,
        "url": url,
        "application_required": application_required,
        "application_url": application_url,
        "open_to_domestic": open_to_domestic,
        "open_to_international": open_to_international,
        **nature,
        "deadline": deadline,
        "deadline_is_estimated": False,
        "amount_text": amount_text,
        "amount_min": amount_min,
        "amount_max": amount_max,
    }


def parse_grad_cells(cells: list) -> dict[str, Any] | None:
    if len(cells) < 8:
        return None

    title = clean_text(cells[0].text.strip())
    desc = _first_text_node(cells[1]) or clean_text(cells[1].text.strip())
    offered_by = clean_text(cells[2].text.strip()) or None
    award_type_raw = clean_text(cells[3].text.strip().lower())
    award_type = AWARD_TYPE_MAP.get(award_type_raw)

    url_tag = cells[1].find("a")
    url = clean_text(url_tag["href"]) if url_tag and url_tag.get("href") else None

    app_cell = clean_text(cells[5].text.strip())
    app_tag = cells[5].find("a")
    application_required = "yes" in app_cell.lower()
    application_url = clean_text(app_tag["href"]) if app_tag and app_tag.get("href") else None

    citizenship_raw = clean_text(cells[4].text.strip().lower())
    open_to_domestic = "domestic" in citizenship_raw
    open_to_international = "international" in citizenship_raw

    nature_raw = clean_text(cells[6].text.strip().lower())
    nature = parse_nature_flags(nature_raw)

    amount_text = clean_text(cells[7].text.strip()) or None
    amount_min, amount_max = parse_amount(amount_text)

    d = default_estimated_deadline()
    return {
        "title": title,
        "description": desc,
        "offered_by": offered_by,
        "award_type": award_type,
        "url": url,
        "application_required": application_required,
        "application_url": application_url,
        "open_to_domestic": open_to_domestic,
        "open_to_international": open_to_international,
        **nature,
        "deadline": d,
        "deadline_is_estimated": True,
        "amount_text": amount_text,
        "amount_min": amount_min,
        "amount_max": amount_max,
    }
