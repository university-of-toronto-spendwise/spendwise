import json
import os
import re
from collections import OrderedDict
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand

from student_codes.models import Codes
from student_codes.services import score_code_for_transactions
from transactions.models import Transaction

SPC_OFFERS_URL = "https://offers-and-partners-7ada7hxd2a-uc.a.run.app/v5/offers/summary"
SPC_IMAGE_BASE = "https://storage.spccard.ca/"
UNIDAYS_BASE = "https://www.myunidays.com"
STUDENT_BEANS_BASE = "https://www.studentbeans.com"
UNIDAYS_SEED_PAGES = [
    "/US/en-US",
    "/US/en-US/id",
    "/US/en-US/lists/trendingoffers",
    "/US/en-US/lists/welcomeoffers",
    "/US/en-US/list/featured-for-you",
    "/US/en-US/category/lifestyle",
]
STUDENT_BEANS_SEED_PAGES = [
    "/ca",
    "/student-discount/ca/brands",
    "/ca/cats",
]
STUDENT_BEANS_MAX_PAGES = int(os.environ.get("STUDENT_BEANS_MAX_PAGES", "150"))


def to_image_url(path_value):
    if not path_value:
        return ""

    value = str(path_value).strip()
    if value.startswith("http://") or value.startswith("https://"):
        return value
    return f"{SPC_IMAGE_BASE}{value.lstrip('/')}"


class Command(BaseCommand):
    help = "Fetch SPC and UNiDAYS offers and store them in the database."

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting sync...")
        session = requests.Session()
        session.headers.update(
            {
                "User-Agent": "Mozilla/5.0",
                "Accept-Language": "en-US,en;q=0.9",
            }
        )

        offers = []
        self.stdout.write("Fetching SPC offers...")
        offers.extend(self.fetch_spc(session))
        self.stdout.write(f"Fetched {len(offers)} offers after SPC.")
        self.stdout.write("Fetching UNiDAYS offers...")
        offers.extend(self.fetch_unidays(session))
        self.stdout.write(f"Fetched {len(offers)} total offers after UNiDAYS.")
        self.stdout.write("Fetching Student Beans offers...")
        offers.extend(self.fetch_student_beans(session))
        self.stdout.write(f"Fetched {len(offers)} total offers after Student Beans.")

        seen_keys = set()
        self.stdout.write("Upserting offers into the database...")
        for rank, offer in enumerate(offers, start=1):
            key = (offer["source"], offer["external_id"])
            seen_keys.add(key)

            Codes.objects.update_or_create(
                source=offer["source"],
                external_id=offer["external_id"],
                defaults={
                    "category": offer.get("category", ""),
                    "company": offer.get("company", ""),
                    "title": offer.get("title", ""),
                    "desc": offer.get("desc", ""),
                    "code": offer.get("code", ""),
                    "in_store_code": offer.get("in_store_code", ""),
                    "url": offer.get("url", ""),
                    "online": offer.get("online", False),
                    "in_store": offer.get("in_store", False),
                    "is_spc_plus": offer.get("is_spc_plus", False),
                    "logo": offer.get("logo", ""),
                    "image": offer.get("image", ""),
                    "source_rank": rank,
                    "metadata": offer.get("metadata", {}),
                },
            )

        self.stdout.write("Removing stale offers...")
        for existing in Codes.objects.all():
            if (existing.source, existing.external_id) not in seen_keys:
                existing.delete()

        self.stdout.write("Recomputing popularity scores...")
        self.recompute_popularity()
        self.stdout.write(self.style.SUCCESS(f"Synced {len(offers)} discount codes."))

    def fetch_spc(self, session):
        results = []
        page = 1

        while True:
            self.stdout.write(f"Fetching SPC page {page}...")
            response = session.get(
                SPC_OFFERS_URL,
                params={"current_page": page, "page_size": 100},
                timeout=20,
            )
            response.raise_for_status()
            payload = response.json()

            offers = payload.get("offers", [])
            partners_by_id = payload.get("partners_by_id", {})

            if not offers:
                self.stdout.write(f"No offers returned on SPC page {page}. Stopping.")
                break

            for offer in offers:
                partner = partners_by_id.get(offer.get("partner_id"), {})
                logo_path = partner.get("logo_web") or partner.get("logo_mobile") or ""
                image_path = offer.get("image_small_en") or offer.get("image_large_en") or ""

                external_id = str(offer.get("id") or offer.get("offer_id") or "")
                if not external_id:
                    continue

                results.append(
                    {
                        "source": Codes.SOURCE_SPC,
                        "external_id": external_id,
                        "company": partner.get("partner_name") or partner.get("name") or "Unknown Partner",
                        "category": offer.get("category") or "",
                        "title": offer.get("title_en") or offer.get("deals_title_en") or "",
                        "desc": offer.get("deals_description_en") or "",
                        "code": offer.get("promo_code_online") or "",
                        "in_store_code": offer.get("promo_code_instore") or "",
                        "url": offer.get("url") or "",
                        "online": bool(offer.get("online")),
                        "in_store": bool(offer.get("in_store")),
                        "is_spc_plus": bool(offer.get("is_spc_plus")),
                        "logo": to_image_url(logo_path),
                        "image": to_image_url(image_path),
                        "metadata": {"partner_id": offer.get("partner_id"), "page": page},
                    }
                )

            page += 1

        return results

    def fetch_unidays(self, session):
        results = OrderedDict()
        pages_to_visit = self.discover_unidays_pages(session)

        for path in pages_to_visit:
            self.stdout.write(f"Fetching UNiDAYS page: {path}")
            url = urljoin(UNIDAYS_BASE, path)
            response = session.get(url, timeout=20)
            if response.status_code == 404:
                self.stdout.write(f"Skipping missing UNiDAYS page: {path}")
                continue
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")
            category = self.page_category(path, soup)

            for offer in self.extract_unidays_json_offers(soup, category, path):
                results[offer["external_id"]] = offer

            for anchor in soup.select('a[href*="/US/en-US/partners/"]'):
                href = anchor.get("href", "").strip()
                full_url = urljoin(UNIDAYS_BASE, href)
                external_id = urlparse(full_url).path.strip("/")

                text_parts = [text.strip() for text in anchor.stripped_strings if text.strip()]
                text_parts = [text for text in text_parts if text.lower() not in {"shop now", "get now", "view offer"}]
                if not text_parts:
                    continue

                company = text_parts[0]
                title = text_parts[1] if len(text_parts) > 1 else company
                desc = " ".join(text_parts[2:6]) if len(text_parts) > 2 else ""

                results[external_id] = {
                    "source": Codes.SOURCE_UNIDAYS,
                    "external_id": external_id,
                    "company": company,
                    "category": category,
                    "title": title,
                    "desc": desc,
                    "code": "",
                    "in_store_code": "",
                    "url": full_url,
                    "online": True,
                    "in_store": False,
                    "is_spc_plus": False,
                    "logo": "",
                    "image": "",
                    "metadata": {"page": path},
                }

        return list(results.values())

    def extract_unidays_json_offers(self, soup, fallback_category, path):
        script = soup.find("script", id="__NEXT_DATA__")
        if not script:
            return []

        try:
            payload = json.loads(script.string or script.get_text() or "{}")
        except json.JSONDecodeError:
            return []

        offers = OrderedDict()
        for entry in self.iter_unidays_offer_entries(payload):
            benefit = entry.get("benefit") or {}
            partner = entry.get("partner") or {}
            content = benefit.get("content") or {}

            external_id = str(benefit.get("id") or "")
            if not external_id:
                continue

            category = fallback_category
            category_ids = benefit.get("categoryIds") or []
            if category_ids:
                category = ",".join(str(value) for value in category_ids)

            offers[external_id] = {
                "source": Codes.SOURCE_UNIDAYS,
                "external_id": external_id,
                "company": partner.get("displayName") or content.get("slug") or "Unknown Partner",
                "category": category,
                "title": benefit.get("displayName") or partner.get("displayName") or "",
                "desc": benefit.get("type") or "",
                "code": "",
                "in_store_code": "",
                "url": benefit.get("url") or urljoin(UNIDAYS_BASE, f"/US/en-US/partners/{content.get('slug', '')}/view"),
                "online": benefit.get("channel") == "online",
                "in_store": benefit.get("channel") == "instore",
                "is_spc_plus": False,
                "logo": partner.get("logo") or "",
                "image": benefit.get("defaultImageUrl") or "",
                "metadata": {
                    "page": path,
                    "partner_id": partner.get("id"),
                    "partner_slug": content.get("slug"),
                    "perk_exclusivity_type": content.get("perkExclusivityType"),
                },
            }

        return list(offers.values())

    def iter_unidays_offer_entries(self, value):
        if isinstance(value, dict):
            if "benefit" in value and "partner" in value:
                yield value
            for child in value.values():
                yield from self.iter_unidays_offer_entries(child)
        elif isinstance(value, list):
            for child in value:
                yield from self.iter_unidays_offer_entries(child)

    def discover_unidays_pages(self, session):
        discovered = OrderedDict()

        for path in UNIDAYS_SEED_PAGES:
            discovered[path] = True
            url = urljoin(UNIDAYS_BASE, path)
            try:
                response = session.get(url, timeout=20)
            except requests.RequestException:
                continue

            if response.status_code >= 400:
                continue

            soup = BeautifulSoup(response.text, "html.parser")
            for match in re.findall(r"/US/en-US/(?:lists?/[^\"'#?\s<]+|partners/[^\"'#?\s<]+)", response.text):
                discovered[match] = True
            for anchor in soup.select('a[href^="/US/en-US/"]'):
                href = (anchor.get("href") or "").strip()
                if not href:
                    continue
                if any(token in href for token in ("/category/", "/list/", "/lists/", "/partners/")):
                    discovered[href] = True

        return list(discovered.keys())

    def fetch_student_beans(self, session):
        results = OrderedDict()
        pages_to_visit = self.discover_student_beans_pages(session)
        pages_to_visit = pages_to_visit[:STUDENT_BEANS_MAX_PAGES]
        self.stdout.write(f"Student Beans candidate pages: {len(pages_to_visit)}")

        for path in pages_to_visit:
            self.stdout.write(f"Fetching Student Beans page: {path}")
            url = urljoin(STUDENT_BEANS_BASE, path)
            response = session.get(url, timeout=20)
            if response.status_code == 404:
                self.stdout.write(f"Skipping missing Student Beans page: {path}")
                continue
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")
            category = self.page_category(path, soup)

            for offer in self.extract_student_beans_json_offers(soup, category, path):
                results[offer["external_id"]] = offer

            fallback_offer = self.extract_student_beans_meta_offer(soup, category, path)
            if fallback_offer:
                results[fallback_offer["external_id"]] = fallback_offer

            for anchor in soup.select('a[href^="/ca/"]'):
                href = (anchor.get("href") or "").strip()
                if not href:
                    continue

                normalized_path = self.normalize_student_beans_path(href)
                if not normalized_path:
                    continue

                full_url = urljoin(STUDENT_BEANS_BASE, normalized_path)
                external_id = urlparse(full_url).path.strip("/")
                if not external_id:
                    continue
                text_parts = [text.strip() for text in anchor.stripped_strings if text.strip()]
                if not text_parts:
                    continue

                company = text_parts[0]
                title = text_parts[1] if len(text_parts) > 1 else company
                desc = " ".join(text_parts[2:6]) if len(text_parts) > 2 else ""

                results[external_id] = {
                    "source": Codes.SOURCE_STUDENT_BEANS,
                    "external_id": external_id,
                    "company": company,
                    "category": category,
                    "title": title,
                    "desc": desc,
                    "code": "",
                    "in_store_code": "",
                    "url": full_url,
                    "online": True,
                    "in_store": False,
                    "is_spc_plus": False,
                    "logo": "",
                    "image": "",
                    "metadata": {"page": path},
                }

        return list(results.values())

    def discover_student_beans_pages(self, session):
        discovered = OrderedDict()

        for path in STUDENT_BEANS_SEED_PAGES:
            discovered[path] = True
            url = urljoin(STUDENT_BEANS_BASE, path)
            try:
                response = session.get(url, timeout=20)
            except requests.RequestException:
                continue

            if response.status_code >= 400:
                continue

            for href in re.findall(r"/(?:student-discount/ca|ca)/[A-Za-z0-9-]+(?:/[A-Za-z0-9-]+)?", response.text):
                normalized = self.normalize_student_beans_path(href)
                if normalized:
                    if self.student_beans_path_looks_like_offer(normalized):
                        discovered[normalized] = True

        return list(discovered.keys())

    def normalize_student_beans_path(self, href):
        normalized = (href or "").strip().rstrip("\\/")
        if not normalized.startswith("/"):
            return ""

        blocked_prefixes = (
            "/ca/about",
            "/ca/info",
            "/ca/how-it-works",
            "/ca/app",
            "/ca/country-links",
            "/ca/cats",
            "/ca/collections",
            "/ca/accessibility",
            "/student-discount/ca/brands",
            "/student-discount/ca/cats",
            "/student-discount/ca/collections",
            "/student-discount/ca/about",
            "/student-discount/ca/info",
        )
        if any(normalized.startswith(prefix) for prefix in blocked_prefixes):
            return ""

        if normalized.startswith("/student-discount/ca/"):
            return normalized

        if normalized.startswith("/ca/") and normalized.count("/") == 2:
            slug = normalized.split("/")[-1]
            return f"/student-discount/ca/{slug}"

        return ""

    def student_beans_path_looks_like_offer(self, path):
        slug = path.rstrip("/").split("/")[-1]
        blocked_slugs = {
            "brands",
            "about",
            "cats",
            "collections",
            "accessibility",
            "country-links",
            "how-it-works",
        }
        return slug not in blocked_slugs and len(slug) > 1

    def extract_student_beans_json_offers(self, soup, fallback_category, path):
        offers = OrderedDict()

        for script in soup.find_all("script"):
            raw = script.string or script.get_text() or ""
            if not raw or ("discount" not in raw.lower() and "offer" not in raw.lower()):
                continue

            for entry in self.iter_student_beans_offer_entries(raw):
                external_id = str(entry.get("id") or entry.get("slug") or entry.get("url") or "")
                if not external_id:
                    continue

                company = entry.get("brand") or entry.get("merchant") or entry.get("name") or entry.get("title") or "Unknown Partner"
                title = entry.get("title") or entry.get("name") or company
                url = entry.get("url") or entry.get("link") or ""
                if url and not url.startswith("http"):
                    url = urljoin(STUDENT_BEANS_BASE, url)

                offers[external_id] = {
                    "source": Codes.SOURCE_STUDENT_BEANS,
                    "external_id": external_id,
                    "company": company,
                    "category": entry.get("category") or fallback_category,
                    "title": title,
                    "desc": entry.get("description") or entry.get("summary") or "",
                    "code": entry.get("code") or "",
                    "in_store_code": "",
                    "url": url,
                    "online": True,
                    "in_store": False,
                    "is_spc_plus": False,
                    "logo": entry.get("logo") or entry.get("image") or "",
                    "image": entry.get("image") or "",
                    "metadata": {"page": path},
                }

        return list(offers.values())

    def extract_student_beans_meta_offer(self, soup, fallback_category, path):
        title = ""
        description = ""

        title_tag = soup.find("meta", attrs={"property": "og:title"}) or soup.find("meta", attrs={"name": "twitter:title"})
        if title_tag:
            title = title_tag.get("content", "").strip()
        if not title and soup.title:
            title = soup.title.get_text(strip=True)

        desc_tag = soup.find("meta", attrs={"property": "og:description"}) or soup.find("meta", attrs={"name": "description"})
        if desc_tag:
            description = desc_tag.get("content", "").strip()

        if not title or title.startswith("404"):
            return None

        slug = path.rstrip("/").split("/")[-1]
        company = title.split("|")[0].strip().split(" student discount")[0].strip()
        if not company:
            company = slug.replace("-", " ").title()

        return {
            "source": Codes.SOURCE_STUDENT_BEANS,
            "external_id": path.strip("/"),
            "company": company,
            "category": fallback_category,
            "title": title,
            "desc": description,
            "code": "",
            "in_store_code": "",
            "url": urljoin(STUDENT_BEANS_BASE, path),
            "online": True,
            "in_store": False,
            "is_spc_plus": False,
            "logo": "",
            "image": "",
            "metadata": {"page": path, "extracted_from": "meta"},
        }

    def iter_student_beans_offer_entries(self, raw):
        decoder = json.JSONDecoder()
        for marker in ('"offers"', '"discounts"', '"brands"'):
            start = 0
            while True:
                index = raw.find(marker, start)
                if index == -1:
                    break
                array_start = raw.find("[", index)
                if array_start == -1:
                    break
                try:
                    values, end = decoder.raw_decode(raw[array_start:])
                except json.JSONDecodeError:
                    start = index + len(marker)
                    continue
                if isinstance(values, list):
                    for item in values:
                        if isinstance(item, dict):
                            yield item
                start = array_start + end

    def page_category(self, path, soup):
        header = soup.find("h1")
        if header and header.get_text(strip=True):
            return header.get_text(strip=True)

        slug = path.rstrip("/").split("/")[-1]
        return slug.replace("-", " ").title()

    def recompute_popularity(self):
        transactions = list(Transaction.objects.all().order_by("-date")[:500])

        for code in Codes.objects.all():
            matched_transactions = sum(
                1 for tx in transactions if score_code_for_transactions(code, [tx]) > 0
            )
            base_rank = max(0, 1000 - min(code.source_rank, 1000))
            code.popularity_score = matched_transactions * 1000 + base_rank
            code.save(update_fields=["popularity_score"])
