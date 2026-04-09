# Create your tests here.
from unittest.mock import Mock, patch
from types import SimpleNamespace
from django.test import TestCase
import requests

from student_codes.models import Codes
from student_codes.services import (
    clean_code_value,
    domain_tokens,
    normalize_text,
    score_code_against_transaction,
    score_code_for_transactions,
    serialize_code,
)


class SPCDealsAPITests(TestCase):
    @patch("student_codes.views.requests.get")
    def test_returns_normalized_deals(self, mock_get):
        mock_resp = Mock()
        mock_resp.raise_for_status.return_value = None
        mock_resp.json.return_value = {
            "next_page": 3,
            "total_count": 100,
            "offers": [
                {
                    "id": "offer-1",
                    "partner_id": "partner-1",
                    "category": "Food",
                    "title_en": "10% off",
                    "deals_description_en": "Save on meals",
                    "url": "https://example.com/deal",
                    "promo_code_online": "ONLINE10",
                    "promo_code_instore": "STORE10",
                    "online": True,
                    "in_store": True,
                    "is_spc_plus": False,
                }
            ],
            "partners_by_id": {
                "partner-1": {"partner_name": "Burger King"}
            },
        }
        mock_get.return_value = mock_resp

        res = self.client.get("/api/student-codes/spc/?page=2&page_size=24")
        self.assertEqual(res.status_code, 200)

        data = res.json()
        self.assertEqual(data["page"], 2)
        self.assertEqual(data["page_size"], 24)
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["deals"][0]["partner"], "Burger King")
        self.assertEqual(data["deals"][0]["promo_code_online"], "ONLINE10")

    @patch("student_codes.views.requests.get")
    def test_uses_defaults_when_params_missing_or_invalid(self, mock_get):
        mock_resp = Mock()
        mock_resp.raise_for_status.return_value = None
        mock_resp.json.return_value = {
            "offers": [],
            "partners_by_id": {},
            "total_count": 0,
            "next_page": None,
        }
        mock_get.return_value = mock_resp

        res = self.client.get("/api/student-codes/spc/?page=bad&page_size=bad")
        self.assertEqual(res.status_code, 200)

        # verify upstream call got defaults current_page=2, page_size=24
        _, kwargs = mock_get.call_args
        self.assertEqual(kwargs["params"]["current_page"], 2)
        self.assertEqual(kwargs["params"]["page_size"], 24)

    @patch("student_codes.views.requests.get")
    def test_clamps_page_and_page_size(self, mock_get):
        mock_resp = Mock()
        mock_resp.raise_for_status.return_value = None
        mock_resp.json.return_value = {
            "offers": [],
            "partners_by_id": {},
            "total_count": 0,
            "next_page": None,
        }
        mock_get.return_value = mock_resp

        res = self.client.get("/api/student-codes/spc/?page=0&page_size=9999")
        self.assertEqual(res.status_code, 200)

        _, kwargs = mock_get.call_args
        self.assertEqual(kwargs["params"]["current_page"], 1)
        self.assertEqual(kwargs["params"]["page_size"], 100)

    @patch("student_codes.views.requests.get")
    def test_returns_502_if_spc_call_fails(self, mock_get):
        mock_get.side_effect = requests.RequestException("network failure")
        res = self.client.get("/api/student-codes/spc/")
        self.assertEqual(res.status_code, 502)


class TrendingCodesAPITests(TestCase):
    def test_returns_top_10_codes_by_popularity(self):
        for index in range(12):
            Codes.objects.create(
                source=Codes.SOURCE_SPC,
                external_id=f"offer-{index}",
                company=f"Company {index}",
                title=f"Offer {index}",
                category="Food",
                popularity_score=index,
                source_rank=index,
            )

        res = self.client.get("/api/student-codes/trending/")
        self.assertEqual(res.status_code, 200)

        data = res.json()
        self.assertEqual(data["count"], 10)
        self.assertEqual(len(data["deals"]), 10)
        self.assertEqual(data["deals"][0]["partner"], "Company 11")
        self.assertEqual(data["deals"][-1]["partner"], "Company 2")

    def test_uses_source_rank_as_tiebreaker(self):
        Codes.objects.create(
            source=Codes.SOURCE_SPC,
            external_id="offer-a",
            company="Later Rank",
            title="Offer A",
            popularity_score=100,
            source_rank=5,
        )
        Codes.objects.create(
            source=Codes.SOURCE_UNIDAYS,
            external_id="offer-b",
            company="Earlier Rank",
            title="Offer B",
            popularity_score=100,
            source_rank=1,
        )

        res = self.client.get("/api/student-codes/trending/")
        self.assertEqual(res.status_code, 200)

        data = res.json()
        self.assertEqual(data["deals"][0]["partner"], "Earlier Rank")


class AllCodesAPITests(TestCase):
    def setUp(self):
        Codes.objects.create(
            source=Codes.SOURCE_SPC,
            external_id="spc-1",
            company="Best Buy",
            title="Laptop discount",
            desc="Save on laptops",
            category="Tech",
            code="LAPTOP10",
            online=True,
            in_store=False,
            is_spc_plus=False,
            popularity_score=10,
            source_rank=1,
        )
        Codes.objects.create(
            source=Codes.SOURCE_UNIDAYS,
            external_id="uni-1",
            company="Apple",
            title="MacBook savings",
            desc="Student laptop deal",
            category="Electronics",
            code="",
            online=True,
            in_store=True,
            is_spc_plus=False,
            popularity_score=20,
            source_rank=2,
        )
        Codes.objects.create(
            source=Codes.SOURCE_STUDENT_BEANS,
            external_id="sb-1",
            company="Nike",
            title="Shoes sale",
            desc="Running shoes",
            category="Fashion",
            code="RUNFAST",
            online=False,
            in_store=True,
            is_spc_plus=False,
            popularity_score=5,
            source_rank=3,
        )

    def test_returns_all_codes(self):
        res = self.client.get("/api/student-codes/all/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["count"], 3)

    def test_filters_by_search_source_and_channel(self):
        res = self.client.get("/api/student-codes/all/?q=laptop&source=spc&channel=online")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["deals"][0]["partner"], "Best Buy")


class StudentCodeServicesTests(TestCase):
    def test_normalize_text_strips_and_lowercases(self):
        self.assertEqual(normalize_text("  Best-Buy!!  "), "best buy")
        self.assertEqual(normalize_text(None), "")

    def test_domain_tokens_extracts_hostname_words(self):
        tokens = domain_tokens("https://www.bestbuy.com/deals?x=1")
        self.assertIn("bestbuy", tokens)
        self.assertNotIn("com", tokens)

    def test_clean_code_value_filters_placeholders(self):
        self.assertEqual(clean_code_value("no_code"), "")
        self.assertEqual(clean_code_value(" UNIQUE "), "")
        self.assertEqual(clean_code_value("random"), "")
        self.assertEqual(clean_code_value("N/A"), "")
        self.assertEqual(clean_code_value("SAVE10"), "SAVE10")

    def test_serialize_code_cleans_codes_and_includes_relevance(self):
        code = SimpleNamespace(
            id=1,
            source="spc",
            external_id="offer-1",
            company="Best Buy",
            category="Tech",
            title="Laptop discount",
            desc="Save on laptops",
            url="https://bestbuy.com",
            code="unique",
            in_store_code="STORE10",
            online=True,
            in_store=False,
            is_spc_plus=False,
            logo="",
            image="",
            popularity_score=10,
        )
        payload = serialize_code(code, relevance_score=7)
        self.assertEqual(payload["partner"], "Best Buy")
        self.assertEqual(payload["promo_code_online"], "")  # cleaned "unique"
        self.assertEqual(payload["promo_code_instore"], "STORE10")
        self.assertEqual(payload["relevance_score"], 7)

    def test_score_code_against_transaction_rewards_matches(self):
        code = SimpleNamespace(company="Best Buy", title="Laptop", category="Tech", url="https://bestbuy.com")
        tx = SimpleNamespace(
            merchant_name="BEST BUY",
            name="Best Buy #1234",
            category=["Tech", "Shopping"],
            website="https://www.bestbuy.com",
        )
        score = score_code_against_transaction(code, tx)
        self.assertGreaterEqual(score, 15)

    def test_score_code_for_transactions_sums_scores(self):
        code = SimpleNamespace(company="Nike", title="Shoes", category="Fashion", url="https://nike.com")
        tx1 = SimpleNamespace(merchant_name="NIKE", name="Nike", category=["Fashion"], website="https://www.nike.com")
        tx2 = SimpleNamespace(merchant_name="GROCERY", name="Store", category=["Food"], website="")
        self.assertEqual(
            score_code_for_transactions(code, [tx1, tx2]),
            score_code_against_transaction(code, tx1) + score_code_against_transaction(code, tx2),
        )
