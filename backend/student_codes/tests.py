# Create your tests here.
from unittest.mock import Mock, patch
from django.test import TestCase
import requests

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

