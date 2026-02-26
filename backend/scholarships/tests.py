from django.test import TestCase
from datetime import date
from rest_framework.test import APITestCase
from .models import Scholarship, AwardType


class ScholarshipsAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        Scholarship.objects.create(
            title="CS Scholarship",
            description="For Computer Science undergraduates. Domestic students.",
            offered_by="UofT",
            award_type=AwardType.IN_COURSE,
            open_to_domestic=True,
            open_to_international=False,
            nature_academic_merit=True,
            application_required=True,
            amount_min=1000,
            amount_max=2000,
            deadline=date(2026, 3, 1),
        )
        Scholarship.objects.create(
            title="International Bursary",
            description="For international students with financial need.",
            offered_by="UofT",
            award_type=AwardType.ADMISSIONS,
            open_to_domestic=False,
            open_to_international=True,
            nature_financial_need=True,
            application_required=False,
            amount_min=500,
            deadline=date(2026, 4, 1),
        )

    def test_list_returns_paginated(self):
        res = self.client.get("/api/scholarships/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("results", res.data)

    def test_search_q(self):
        res = self.client.get("/api/scholarships/?q=computer")
        self.assertEqual(res.status_code, 200)
        titles = [x["title"] for x in res.data["results"]]
        self.assertIn("CS Scholarship", titles)

    def test_filter_citizenship(self):
        res = self.client.get("/api/scholarships/?citizenship=Domestic")
        self.assertEqual(res.status_code, 200)
        titles = [x["title"] for x in res.data["results"]]
        self.assertIn("CS Scholarship", titles)

    def test_sort_amount_desc(self):
        res = self.client.get("/api/scholarships/?sort=-amount")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["results"][0]["title"], "CS Scholarship")

    def test_meta(self):
        res = self.client.get("/api/scholarships/meta/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("award_type", res.data)
        self.assertIn("citizenship", res.data)
        self.assertIn("nature", res.data)

    def test_match(self):
        payload = {
            "faculty": "Computer Science",
            "major": "Computer Science",
            "year": 2,
            "degree_type": "Undergrad",
            "citizenship": "Domestic",
            "campus": "St.George",
        }
        res = self.client.post("/api/scholarships/match/", payload, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)
        self.assertIn("score", res.data[0])
        self.assertIn("reasons", res.data[0])
        self.assertIn("scholarship", res.data[0])
# Create your tests here.
