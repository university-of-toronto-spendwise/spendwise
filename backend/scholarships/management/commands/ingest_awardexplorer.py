import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from django.utils import timezone
from scholarships.models import Scholarship
import re

MAX_PAGES = 250  # small buffer

BASE_URL = "https://awardexplorer.utoronto.ca/undergrad"  # get token from here
POST_URL = "https://uoftscholarships.smartsimple.com/ex/ex_openreport.jsp"  # post here

# HELPER: Hidden nulls: \x00 aka invisible null bytes that can appear in scraped HTML
def clean_text(text):
    """Remove NUL characters that Postgres cannot store."""
    if not text:
        return text
    return text.replace("\x00", "")


# HELPER: Need to handle all amount cases
# Inputs here can look like: "$3,000", "up to $1,000", "Between $1,500 - $1,800", "Based on financial need", "variable"
def parse_amount(amount_text):
    """Parse amount string into (min, max) tuple of integers."""
    if not amount_text:
        return None, None
    
    # find all numbers in the string e.g. "$1,000 - $5,000" == [1000, 5000]
    numbers = [
        int(n.replace(",", ""))
        for n in re.findall(r"\d[\d,]*", amount_text)
    ]
    
    if not numbers:
        return None, None
    if len(numbers) == 1:
        return numbers[0], numbers[0]  # single value -> min and max are same
    return min(numbers), max(numbers)  # range -> take min and max


class Command(BaseCommand):
    help = "Scrape scholarships from UofT Award Explorer"

    def handle(self, *args, **kwargs):
        session = requests.Session()

        # Step 1: GET the main page to get token + session cookie
        self.stdout.write("Fetching main page...")
        response = session.get(BASE_URL, timeout=20)
        soup = BeautifulSoup(response.text, "html.parser")
        token = soup.find("input", {"name": "token"})["value"]

        created_count = 0
        updated_count = 0
        page = 1

        seen_signatures = set()
        while page <= MAX_PAGES:
            self.stdout.write(f"Scraping page {page}...")

            # Step 2: POST to get scholarship data
            data = {
                "ss_formtoken": "",
                "isframe": "1",
                "cf_4_c1753503": "",
                "cf_0_c1754210": "",
                "cf_1_c1753296": "%",
                "cf_2_c1744720": "",
                "cf_5_c1744705": "%",
                "cf_3_c1744765": "%",
                "reportid": "46862",
                "reportname": "Award Explorer | Undergraduate | University of Toronto",
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

            # Step 3: Find all rows
            rows = soup.select("tbody#x-body tr")

            if not rows:
                break  # no more pages
            
            # signature: first+last scholarship title on the page
            first_title = rows[0].find_all("td")[0].get_text(strip=True)
            last_title  = rows[-1].find_all("td")[0].get_text(strip=True)
            sig = (first_title, last_title)

            if sig in seen_signatures:
                self.stdout.write("Reached repeated page content: stopping.")
                break
            seen_signatures.add(sig)

            for row in rows:
                cells = row.find_all("td")
                if len(cells) < 9:
                    continue

                # Step 4: Extract fields
                # CORE
                title = clean_text(cells[0].text.strip())
                
                desc = clean_text(cells[1].text.strip())
                # get all text nodes, skipping tags like <a> for hyperlinks
                desc = cells[1].find(text=True, recursive=False)
                if desc:
                    desc = clean_text(desc.strip())
                else:
                    desc = clean_text(cells[1].text.strip())

                offered_by = clean_text(cells[2].text.strip()) or None
                award_type_raw = clean_text(cells[3].text.strip().lower())
                # normalize award_type to match models enum
                award_type_map = {
                    "admission": "admissions",
                    "in-course": "in_course",
                    "graduating": "graduating",
                }
                award_type = award_type_map.get(award_type_raw, None)

                # URLS
                url_tag = cells[1].find("a")
                url = clean_text(url_tag["href"]) if url_tag else None

                app_cell = clean_text(cells[5].text.strip())
                app_tag = cells[5].find("a")
                application_required = "yes" in app_cell.lower()
                application_url = clean_text(app_tag["href"]) if app_tag else None

                # CITIZENSHIP
                citizenship_raw = clean_text(cells[4].text.strip().lower())
                open_to_domestic      = "domestic" in citizenship_raw
                open_to_international = "international" in citizenship_raw

                # NATURE OF AWARD
                nature_raw = clean_text(cells[6].text.strip().lower())
                nature_academic_merit = "academic merit" in nature_raw
                nature_athletic_performance = "athletic performance" in nature_raw
                nature_community = "community" in nature_raw
                nature_financial_need = "financial need" in nature_raw
                nature_leadership = "leadership" in nature_raw
                nature_indigenous = "indigenous" in nature_raw
                nature_black_students = "black students" in nature_raw
                nature_extracurriculars = "extra curriculars" in nature_raw or "extracurriculars" in nature_raw
                nature_other = "other" in nature_raw

                # DEADLINE
                deadline_raw = clean_text(cells[7].text.strip())
                deadline = None
                if deadline_raw:
                    try:
                        from datetime import datetime
                        deadline = datetime.strptime(
                            deadline_raw, "%Y-%m-%d %H:%M"
                        ).date()
                    except ValueError:
                        pass

                # AMOUNT
                amount_text = clean_text(cells[8].text.strip()) or None
                amount_min, amount_max = parse_amount(amount_text)

                # NOW UPDATE AS ROW IN TABLE:
                scholarship, created = Scholarship.objects.update_or_create(
                    title=title,
                    offered_by=offered_by,
                    defaults={
                        "source": "UOFT_AWARD_EXPLORER",
                        "description": desc,
                        "url": url,
                        "award_type": award_type,
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
                        "application_required": application_required,
                        "application_url": application_url,
                        "amount_text": amount_text,
                        "amount_min": amount_min,
                        "amount_max": amount_max,
                        "deadline": deadline,
                        "last_seen_at": timezone.now(),
                    }
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

            page += 1

        if page > MAX_PAGES:
            self.stdout.write("Hit MAX_PAGES safety cap: stopped.")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created: {created_count}, Updated: {updated_count}"
            )
        )


# SAMPLE ROW FROM PAGE
# <tr>
# 	<td class="Data2 AlignLeft" style="font-weight: 800;">6T6 Industrial Engineering 50th Anniversary Award in Healthcare Engineering</td>
# 	<td class="Data2 AlignLeft">To be awarded to one PhD student who excels in the use of Industrial Engineering principles and techniques to create innovative solutions for the healthcare industry. Recipients will be encouraged to submit a letter of thanks to the Donor that includes a synopsis of their academic studies and their involvement in the Skule community and beyond. 
# <a href=https://www.mie.utoronto.ca/programs/graduate/scholarships-funding/ target=_blank style="color:blue"><i><u>Learn more.</u></i></a>


# </td>
# 	<td class="Data2 AlignLeft">Faculty of Applied Science & Engineering</td>
# 	<td class="Data2 AlignLeft">In-course</td>
# 	<td class="Data2 AlignLeft">Domestic;International</td>
# 	<td class="Data2 AlignLeft">
# <a href=https://www.mie.utoronto.ca/programs/graduate/scholarships-funding/ target=_blank style="color:blue"><i><u>Yes, apply</u></i></a>

# </td>
# 	<td class="Data2 AlignLeft">Academic Merit, Other</td><td class="Data2 AlignLeft">$3,000 per award</td>
# </tr>