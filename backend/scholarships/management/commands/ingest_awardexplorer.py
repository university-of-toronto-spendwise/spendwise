import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from django.utils import timezone

from scholarships.ingest_utils import clean_text, parse_grad_cells, parse_undergrad_cells
from scholarships.models import Scholarship, StudentLevel

MAX_PAGES = 250

LEVEL_CONFIG = {
    "undergrad": {
        "base_url": "https://awardexplorer.utoronto.ca/undergrad",
        "reportid": "46862",
        "reportname": "Award Explorer | Undergraduate | University of Toronto",
    },
    "grad": {
        "base_url": "https://awardexplorer.utoronto.ca/grad",
        "reportid": "46864",
        "reportname": "Award Explorer | Graduate | University of Toronto",
    },
}

POST_URL = "https://uoftscholarships.smartsimple.com/ex/ex_openreport.jsp"


class Command(BaseCommand):
    help = "Scrape scholarships from UofT Award Explorer (undergraduate or graduate catalog)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--level",
            choices=("undergrad", "grad"),
            default="undergrad",
            help="Which catalog to ingest (default: undergrad). Graduate rows use an 8-column HTML layout.",
        )

    def handle(self, *args, **options):
        level_key = options["level"]
        cfg = LEVEL_CONFIG[level_key]
        student_level = StudentLevel.UNDERGRAD if level_key == "undergrad" else StudentLevel.GRAD
        parse_row = parse_undergrad_cells if level_key == "undergrad" else parse_grad_cells

        session = requests.Session()
        self.stdout.write(f"Fetching main page ({level_key})...")
        response = session.get(cfg["base_url"], timeout=20)
        soup = BeautifulSoup(response.text, "html.parser")
        token_el = soup.find("input", {"name": "token"})
        if not token_el or not token_el.get("value"):
            self.stderr.write(self.style.ERROR("Could not read form token from Award Explorer."))
            return
        token = token_el["value"]

        created_count = 0
        updated_count = 0
        page = 1
        seen_signatures = set()
        seen_ids: list = []

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

            result = session.post(POST_URL, data=data, timeout=30)
            soup = BeautifulSoup(result.text, "html.parser")
            rows = soup.select("tbody#x-body tr")

            if not rows:
                break

            first_title = clean_text(rows[0].find_all("td")[0].get_text(strip=True))
            last_title = clean_text(rows[-1].find_all("td")[0].get_text(strip=True))
            sig = (first_title, last_title)

            if sig in seen_signatures:
                self.stdout.write("Reached repeated page content: stopping.")
                break
            seen_signatures.add(sig)

            for row in rows:
                cells = row.find_all("td")
                parsed = parse_row(cells)
                if not parsed:
                    continue

                title = parsed["title"]
                if not title:
                    continue

                defaults = {
                    "source": "UOFT_AWARD_EXPLORER",
                    "description": parsed["description"],
                    "url": parsed["url"],
                    "award_type": parsed["award_type"],
                    "open_to_domestic": parsed["open_to_domestic"],
                    "open_to_international": parsed["open_to_international"],
                    "nature_academic_merit": parsed["nature_academic_merit"],
                    "nature_athletic_performance": parsed["nature_athletic_performance"],
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
                    "deadline": parsed["deadline"],
                    "deadline_is_estimated": parsed["deadline_is_estimated"],
                    "last_seen_at": timezone.now(),
                    "is_active": True,
                }

                scholarship, created = Scholarship.objects.update_or_create(
                    title=title,
                    offered_by=parsed["offered_by"],
                    student_level=student_level,
                    defaults=defaults,
                )

                seen_ids.append(scholarship.id)
                if created:
                    created_count += 1
                else:
                    updated_count += 1

            page += 1

        if seen_ids:
            stale_n = (
                Scholarship.objects.filter(student_level=student_level)
                .exclude(pk__in=seen_ids)
                .update(is_active=False)
            )
            if stale_n:
                self.stdout.write(
                    self.style.WARNING(
                        f"Marked {stale_n} scholarship(s) inactive (not in latest catalog)."
                    )
                )
        else:
            self.stdout.write(
                self.style.WARNING(
                    "No rows ingested — skipping inactive sweep so existing catalog entries stay active."
                )
            )

        if page > MAX_PAGES:
            self.stdout.write("Hit MAX_PAGES safety cap: stopped.")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done ({level_key}). Created: {created_count}, Updated: {updated_count}, "
                f"Catalog rows seen: {len(seen_ids)}"
            )
        )
