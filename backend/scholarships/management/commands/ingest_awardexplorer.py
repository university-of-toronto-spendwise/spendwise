import requests
from bs4 import BeautifulSoup
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from scholarships.ingest_utils import (
    deactivate_stale_scholarships,
    parse_undergrad_cells,
    prune_overdue_saved_scholarships,
    resolve_deadline_for_ingest,
)
from scholarships.models import Scholarship, StudentLevel

MAX_PAGES = 250


def _level_config():
    """Build per-level ingest config from Django settings (env-overridable)."""
    return {
        "undergrad": {
            "base_url": settings.AWARD_EXPLORER_UNDERGRAD_BASE_URL,
            "reportid": str(settings.AWARD_EXPLORER_UNDERGRAD_REPORT_ID),
            "reportname": settings.AWARD_EXPLORER_UNDERGRAD_REPORT_NAME,
            "student_level": StudentLevel.UNDERGRAD,
        },
        "grad": {
            "base_url": settings.AWARD_EXPLORER_GRAD_BASE_URL,
            "reportid": str(settings.AWARD_EXPLORER_GRAD_REPORT_ID),
            "reportname": settings.AWARD_EXPLORER_GRAD_REPORT_NAME,
            "student_level": StudentLevel.GRAD,
        },
    }


def parse_row_cells(cells):
    """Parse table row into field dict; returns None if row too short."""
    return parse_undergrad_cells(cells)


class Command(BaseCommand):
    help = "Scrape scholarships from UofT Award Explorer (undergraduate or graduate catalog)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--level",
            choices=["undergrad", "grad"],
            default="undergrad",
            help="Which Award Explorer catalog to ingest (default: undergrad).",
        )
        parser.add_argument(
            "--no-cleanup",
            action="store_true",
            help="Skip deactivating stale rows and pruning overdue saved scholarships.",
        )
        parser.add_argument(
            "--prune-grace-days",
            type=int,
            default=21,
            help="Days after deadline before pruning saved/in_progress items (default: 21).",
        )

    def handle(self, *args, **options):
        level_key = options["level"]
        cfg = _level_config()[level_key]
        student_level = cfg["student_level"]
        no_cleanup = options["no_cleanup"]
        grace_days = options["prune_grace_days"]

        session = requests.Session()
        self.stdout.write(f"Fetching {cfg['base_url']}...")
        response = session.get(cfg["base_url"], timeout=20)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        token_input = soup.find("input", {"name": "token"})
        if not token_input or not token_input.get("value"):
            self.stderr.write("Could not find token on Award Explorer page.")
            return
        token = token_input["value"]

        run_started_at = timezone.now()
        created_count = 0
        updated_count = 0
        page = 1
        seen_signatures = set()

        while page <= MAX_PAGES:
            self.stdout.write(f"Scraping page {page}...")

            data = {
                "ss_formtoken": "",
                "isframe": "1",
                "cf_4_c1753503": "",
                "cf_0_c1754210": "",
                "cf_1_c1753296": "%",
                "cf_2_c1744720": "",
                "cf_5_c1744705": "%",
                "cf_3_c1744765": "%",
                "reportid": cfg["reportid"],
                "reportname": cfg["reportname"],
                "chartid": "0",
                "export": "",
                "token": token,
                "key": "",
                "lang": "0",
                "width": "640",
                "height": "400",
                "curpagesize": "20",
                "page": str(page),
                "sorttype": "",
                "sortdirection": "asc",
            }

            result = session.post(settings.AWARD_EXPLORER_POST_URL, data=data, timeout=30)
            result.raise_for_status()
            soup = BeautifulSoup(result.text, "html.parser")
            rows = soup.select("tbody#x-body tr")

            if not rows:
                break

            first_title = rows[0].find_all("td")[0].get_text(strip=True)
            last_title = rows[-1].find_all("td")[0].get_text(strip=True)
            sig = (first_title, last_title)
            if sig in seen_signatures:
                self.stdout.write("Reached repeated page content: stopping.")
                break
            seen_signatures.add(sig)

            for row in rows:
                cells = row.find_all("td")
                parsed = parse_row_cells(cells)
                if not parsed:
                    continue

                existing = Scholarship.objects.filter(
                    title=parsed["title"],
                    offered_by=parsed["offered_by"],
                    student_level=student_level,
                ).first()
                dl, est = resolve_deadline_for_ingest(
                    parsed["deadline_parsed"], existing
                )

                _, created = Scholarship.objects.update_or_create(
                    title=parsed["title"],
                    offered_by=parsed["offered_by"],
                    student_level=student_level,
                    defaults={
                        "source": "UOFT_AWARD_EXPLORER",
                        "description": parsed["description"],
                        "url": parsed["url"],
                        "award_type": parsed["award_type"],
                        "open_to_domestic": parsed["open_to_domestic"],
                        "open_to_international": parsed["open_to_international"],
                        "nature_academic_merit": parsed["nature_academic_merit"],
                        "nature_athletic_performance": parsed[
                            "nature_athletic_performance"
                        ],
                        "nature_community": parsed["nature_community"],
                        "nature_financial_need": parsed["nature_financial_need"],
                        "nature_leadership": parsed["nature_leadership"],
                        "nature_indigenous": parsed["nature_indigenous"],
                        "nature_black_students": parsed["nature_black_students"],
                        "nature_extracurriculars": parsed["nature_extracurriculars"],
                        "nature_other": parsed["nature_other"],
                        "application_required": parsed["application_required"],
                        "application_url": parsed["application_url"],
                        "amount_text": parsed["amount_text"],
                        "amount_min": parsed["amount_min"],
                        "amount_max": parsed["amount_max"],
                        "deadline": dl,
                        "deadline_is_estimated": est,
                        "last_seen_at": timezone.now(),
                        "is_active": True,
                    },
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1

            page += 1

        if page > MAX_PAGES:
            self.stdout.write("Hit MAX_PAGES safety cap: stopped.")

        stale_count = 0
        pruned_count = 0
        if not no_cleanup:
            stale_count = deactivate_stale_scholarships(student_level, run_started_at)
            pruned_count = prune_overdue_saved_scholarships(grace_days=grace_days)
            self.stdout.write(
                f"Cleanup: deactivated {stale_count} stale rows for level={student_level}; "
                f"pruned {pruned_count} overdue saved scholarships (grace={grace_days}d)."
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done ({level_key}). Created: {created_count}, Updated: {updated_count}"
            )
        )
