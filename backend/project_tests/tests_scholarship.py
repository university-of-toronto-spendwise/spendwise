import uuid
from datetime import date, datetime
from decimal import Decimal
from unittest.mock import patch

from bs4 import BeautifulSoup
from accounts.models import UserProfile
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone as django_timezone
from rest_framework.test import APITestCase

from scholarships.api import _infer_student_level, _parse_bool, _resume_overlap
from scholarships.services import monthly_deficit_from_profile, nominal_amount_for_scholarship
from scholarships.ingest_utils import (
    clean_text,
    default_estimated_deadline,
    parse_amount,
    parse_grad_cells,
    parse_nature_flags,
    parse_undergrad_cells,
)
from scholarships.models import AwardType, SavedScholarship, Scholarship, StudentLevel

User = get_user_model()


class IngestParserTests(TestCase):
    def test_undergrad_requires_nine_cells(self):
        self.assertIsNone(parse_undergrad_cells([]))

    def test_grad_requires_eight_cells(self):
        self.assertIsNone(parse_grad_cells([]))


class ScholarshipsAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        Scholarship.objects.create(
            title="CS Scholarship",
            description="For Computer Science undergraduates. Domestic students.",
            offered_by="UofT",
            award_type=AwardType.IN_COURSE,
            student_level=StudentLevel.UNDERGRAD,
            is_active=True,
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
            student_level=StudentLevel.UNDERGRAD,
            is_active=True,
            open_to_domestic=False,
            open_to_international=True,
            nature_financial_need=True,
            application_required=False,
            amount_min=500,
            deadline=date(2026, 4, 1),
        )
        Scholarship.objects.create(
            title="Grad Research Award",
            description="For graduate students in engineering.",
            offered_by="UofT",
            student_level=StudentLevel.GRAD,
            is_active=True,
            open_to_domestic=True,
            open_to_international=True,
            nature_academic_merit=True,
            application_required=True,
            amount_min=5000,
            deadline=date(2026, 5, 1),
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
        res = self.client.get("/api/scholarships/?sort=-amount&student_level=undergrad")
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
        self.assertIn("eligible", res.data[0])

    def test_match_filters_grad_when_postgrad(self):
        payload = {
            "degree_type": "Postgrad",
            "citizenship": "Domestic",
        }
        res = self.client.post("/api/scholarships/match/", payload, format="json")
        self.assertEqual(res.status_code, 200)
        titles = [x["scholarship"]["title"] for x in res.data]
        self.assertIn("Grad Research Award", titles)
        self.assertNotIn("CS Scholarship", titles)

    def test_saved_stats_requires_auth(self):
        res = self.client.get("/api/scholarships/saved/stats/")
        self.assertEqual(res.status_code, 401)

    def test_saved_stats(self):
        user = User.objects.create_user(username="t1@mail.utoronto.ca", email="t1@mail.utoronto.ca", password="x")
        self.client.force_authenticate(user=user)
        cs = Scholarship.objects.get(title="CS Scholarship")
        SavedScholarship.objects.create(user=user, scholarship=cs, status="awarded")
        res = self.client.get("/api/scholarships/saved/stats/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["awarded"], 1)
        self.assertEqual(res.data["not_awarded"], 0)
        self.assertEqual(res.data["acceptance_rate"], 1.0)


class ScholarshipsApiHelperUnitTests(TestCase):
    def test_parse_bool_none_and_truthy_falsy(self):
        self.assertIsNone(_parse_bool(None))
        self.assertTrue(_parse_bool("true"))
        self.assertTrue(_parse_bool("  YES "))
        self.assertFalse(_parse_bool("false"))
        self.assertFalse(_parse_bool("0"))
        self.assertIsNone(_parse_bool("maybe"))

    def test_infer_student_level_explicit_and_degree_strings(self):
        self.assertEqual(_infer_student_level({"student_level": StudentLevel.GRAD}), StudentLevel.GRAD)
        self.assertEqual(_infer_student_level({"degree_type": "Undergraduate"}), StudentLevel.UNDERGRAD)
        self.assertEqual(_infer_student_level({"degree_type": "Postgrad"}), StudentLevel.GRAD)
        self.assertEqual(_infer_student_level({"degree_type": "graduate"}), StudentLevel.GRAD)
        self.assertEqual(_infer_student_level({"degree_type": "masters"}), StudentLevel.GRAD)
        self.assertEqual(_infer_student_level({"degree_type": "PhD"}), StudentLevel.GRAD)
        self.assertEqual(_infer_student_level({"degree_type": "Research grad"}), StudentLevel.GRAD)
        self.assertIsNone(_infer_student_level({}))

    def test_resume_overlap_empty_short_words_and_hits(self):
        self.assertEqual(_resume_overlap("", "blob"), 0.0)
        self.assertEqual(_resume_overlap("   ", "blob"), 0.0)
        self.assertEqual(_resume_overlap("ab xx yy", "ab xx yy"), 0.0)
        self.assertGreater(
            _resume_overlap("engineering computer science research", "engineering and science"),
            0.0,
        )


class ScholarshipsAPICoverageTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.sch = Scholarship.objects.create(
            title="Year Two Award",
            description="For year 2 students at St.George undergraduate in-course admissions.",
            offered_by="Engineering Faculty",
            award_type=AwardType.IN_COURSE,
            student_level=StudentLevel.UNDERGRAD,
            is_active=True,
            open_to_domestic=True,
            open_to_international=True,
            nature_academic_merit=True,
            nature_financial_need=True,
            nature_leadership=True,
            application_required=True,
            amount_min=100,
            amount_max=900,
            deadline=date(2026, 6, 15),
        )
        Scholarship.objects.create(
            title="Hidden Inactive",
            description="Should not appear in default list",
            offered_by="Other",
            student_level=StudentLevel.UNDERGRAD,
            is_active=False,
            open_to_domestic=True,
            open_to_international=False,
        )

    def test_list_include_inactive_and_invalid_student_level_no_filter(self):
        r = self.client.get("/api/scholarships/?include_inactive=true")
        self.assertEqual(r.status_code, 200)
        titles = [x["title"] for x in r.data["results"]]
        self.assertIn("Hidden Inactive", titles)

        r2 = self.client.get("/api/scholarships/?student_level=alien")
        self.assertEqual(r2.status_code, 200)

    def test_list_award_type_international_nature_application_faculty_deadlines_amount_sort(self):
        base = "/api/scholarships/?student_level=undergrad"
        self.assertEqual(self.client.get(f"{base}&award_type=in_course").status_code, 200)
        self.assertEqual(self.client.get(f"{base}&citizenship=international").status_code, 200)
        self.assertEqual(self.client.get(f"{base}&nature=financial_need,bogus").status_code, 200)
        self.assertEqual(self.client.get(f"{base}&application_required=true").status_code, 200)
        self.assertEqual(self.client.get(f"{base}&application_required=false").status_code, 200)
        self.assertEqual(self.client.get(f"{base}&faculty_college=Engineering").status_code, 200)
        self.assertEqual(self.client.get(f"{base}&deadline_after=2026-06-01").status_code, 200)
        self.assertEqual(self.client.get(f"{base}&deadline_before=2026-12-31").status_code, 200)
        self.assertEqual(self.client.get(f"{base}&min_amount=50").status_code, 200)
        self.assertEqual(self.client.get(f"{base}&min_amount=notint").status_code, 200)

    def test_list_sort_variants(self):
        base = "/api/scholarships/?student_level=undergrad"
        for params in ("sort=title", "sort=-title", "sort=amount", "sort=-amount", "sort=deadline", "sort=-deadline", "sort=unknown"):
            self.assertEqual(self.client.get(f"{base}&{params}").status_code, 200)

    def test_detail_found_and_not_found(self):
        r_ok = self.client.get(f"/api/scholarships/{self.sch.pk}/")
        self.assertEqual(r_ok.status_code, 200)
        self.assertEqual(r_ok.data["title"], "Year Two Award")

        missing = uuid.uuid4()
        r404 = self.client.get(f"/api/scholarships/{missing}/")
        self.assertEqual(r404.status_code, 404)

    def test_match_international_student_level_resume_gpa_financial_degree_year_campus(self):
        payload = {
            "citizenship": "International",
            "student_level": "undergrad",
            "faculty": "Engineering",
            "major": "Award",
            "degree_type": "Postgrad",
            "year": 2,
            "campus": "St.George",
            "gpa": 3.5,
            "resume_summary": "leadership engineering research volunteer",
            "financial_need": True,
        }
        res = self.client.post("/api/scholarships/match/", payload, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(len(res.data) >= 1)
        any_reason = any("Financial need" in " ".join(x.get("reasons", [])) for x in res.data)
        self.assertTrue(any_reason)

    def test_saved_list_save_unsave_patch_stats_coverage(self):
        user = User.objects.create_user(username="cov@mail.utoronto.ca", email="cov@mail.utoronto.ca", password="x")
        self.client.force_authenticate(user=user)

        self.assertEqual(self.client.get("/api/scholarships/saved/").status_code, 200)

        bad_save = self.client.post(f"/api/scholarships/{uuid.uuid4()}/save/")
        self.assertEqual(bad_save.status_code, 404)

        r_create = self.client.post(f"/api/scholarships/{self.sch.pk}/save/")
        self.assertEqual(r_create.status_code, 201)

        r_again = self.client.post(f"/api/scholarships/{self.sch.pk}/save/")
        self.assertEqual(r_again.status_code, 200)

        saved = SavedScholarship.objects.get(user=user, scholarship=self.sch)

        r_bad_patch = self.client.patch(
            f"/api/scholarships/saved/99999/status/",
            {"status": "submitted"},
            format="json",
        )
        self.assertEqual(r_bad_patch.status_code, 404)

        r_invalid = self.client.patch(
            f"/api/scholarships/saved/{saved.id}/status/",
            {"status": "not_a_real_status"},
            format="json",
        )
        self.assertEqual(r_invalid.status_code, 400)

        r_ok = self.client.patch(
            f"/api/scholarships/saved/{saved.id}/status/",
            {"status": "submitted"},
            format="json",
        )
        self.assertEqual(r_ok.status_code, 200)

        r_del_miss = self.client.delete(f"/api/scholarships/{uuid.uuid4()}/save/")
        self.assertEqual(r_del_miss.status_code, 404)

        r_del = self.client.delete(f"/api/scholarships/{self.sch.pk}/save/")
        self.assertEqual(r_del.status_code, 204)

        r_del_again = self.client.delete(f"/api/scholarships/{self.sch.pk}/save/")
        self.assertEqual(r_del_again.status_code, 404)

        SavedScholarship.objects.create(user=user, scholarship=self.sch, status="saved")
        stats = self.client.get("/api/scholarships/saved/stats/")
        self.assertEqual(stats.status_code, 200)
        self.assertIsNone(stats.data.get("acceptance_rate"))


class IngestUtilsCoverageTests(TestCase):
    def test_clean_text_and_parse_amount(self):
        self.assertEqual(clean_text(None), "")
        self.assertEqual(clean_text(""), "")
        self.assertEqual(clean_text("a\x00b"), "ab")

        self.assertEqual(parse_amount(None), (None, None))
        self.assertEqual(parse_amount(""), (None, None))
        self.assertEqual(parse_amount("no digits"), (None, None))
        self.assertEqual(parse_amount("$3,000"), (3000, 3000))
        self.assertEqual(parse_amount("$1,000 - $2,000"), (1000, 2000))

    def test_parse_nature_flags_covers_keys(self):
        raw = (
            "academic merit athletic performance community financial need leadership "
            "indigenous black students extra curriculars other"
        )
        flags = parse_nature_flags(raw)
        self.assertTrue(flags["nature_academic_merit"])
        self.assertTrue(flags["nature_extracurriculars"])
        self.assertTrue(flags["nature_other"])

    @patch("scholarships.ingest_utils.timezone.now")
    def test_default_estimated_deadline_branches(self, mock_now):
        mock_now.return_value = django_timezone.make_aware(datetime(2026, 3, 1, 12, 0))
        self.assertEqual(default_estimated_deadline(), date(2026, 4, 30))

        mock_now.return_value = django_timezone.make_aware(datetime(2026, 5, 15, 12, 0))
        self.assertEqual(default_estimated_deadline(), date(2027, 4, 30))

    def test_parse_undergrad_cells_from_html(self):
        row = """
        <tr>
          <td>Test Award</td>
          <td>Direct text only</td>
          <td>Faculty X</td>
          <td>In-course</td>
          <td>Domestic;International</td>
          <td>Yes, apply <a href="https://apply.example/apply">link</a></td>
          <td>Academic Merit, Leadership</td>
          <td>2026-06-01 12:00</td>
          <td>$500 - $800</td>
        </tr>
        """
        cells = BeautifulSoup(row, "html.parser").find("tr").find_all("td")
        out = parse_undergrad_cells(cells)
        self.assertIsNotNone(out)
        self.assertEqual(out["title"], "Test Award")
        self.assertEqual(out["award_type"], "in_course")
        self.assertTrue(out["application_required"])
        self.assertEqual(out["application_url"], "https://apply.example/apply")
        self.assertEqual(out["deadline"], date(2026, 6, 1))
        self.assertEqual(out["amount_min"], 500)
        self.assertEqual(out["amount_max"], 800)
        self.assertFalse(out["deadline_is_estimated"])

    def test_parse_undergrad_cells_deadline_invalid_and_desc_with_link(self):
        row = """
        <tr>
          <td>Linked Desc</td>
          <td><a href="https://info.example/more">Learn more</a></td>
          <td>Dept</td>
          <td>Admission</td>
          <td>Domestic</td>
          <td>No</td>
          <td>Other</td>
          <td>bad-deadline</td>
          <td>Based on need</td>
        </tr>
        """
        cells = BeautifulSoup(row, "html.parser").find("tr").find_all("td")
        out = parse_undergrad_cells(cells)
        self.assertIsNotNone(out)
        self.assertIsNone(out["deadline"])
        self.assertEqual(out["url"], "https://info.example/more")
        self.assertEqual(out["award_type"], "admissions")
        self.assertIsNone(out["amount_min"])

    @patch("scholarships.ingest_utils.default_estimated_deadline", return_value=date(2027, 4, 30))
    def test_parse_grad_cells_from_html(self, _mock_deadline):
        row = """
        <tr>
          <td>Grad Prize</td>
          <td>For phd students</td>
          <td>Grad Dept</td>
          <td>Graduating</td>
          <td>International</td>
          <td>Yes <a href="https://g.example/">go</a></td>
          <td>Financial need</td>
          <td>Up to $2,500</td>
        </tr>
        """
        cells = BeautifulSoup(row, "html.parser").find("tr").find_all("td")
        out = parse_grad_cells(cells)
        self.assertIsNotNone(out)
        self.assertEqual(out["title"], "Grad Prize")
        self.assertEqual(out["award_type"], "graduating")
        self.assertTrue(out["deadline_is_estimated"])
        self.assertEqual(out["deadline"], date(2027, 4, 30))
        self.assertEqual(out["amount_max"], 2500)


class ScholarshipsServiceUnitTests(TestCase):
    def test_monthly_deficit_zero_when_surplus(self):
        p = UserProfile(
            total_expenses=Decimal("100"),
            total_earnings=Decimal("200"),
            parental_support=Decimal("0"),
            receives_scholarships_or_aid=False,
        )
        self.assertEqual(monthly_deficit_from_profile(p), Decimal("0"))

    def test_monthly_deficit_with_aid(self):
        p = UserProfile(
            total_expenses=Decimal("500"),
            total_earnings=Decimal("100"),
            parental_support=Decimal("50"),
            receives_scholarships_or_aid=True,
            scholarship_aid_amount=Decimal("50"),
        )
        # 500 - 200 = 300
        self.assertEqual(monthly_deficit_from_profile(p), Decimal("300"))

    def test_nominal_amount_for_scholarship(self):
        s = Scholarship(amount_max=100, amount_min=10)
        self.assertEqual(nominal_amount_for_scholarship(s), 100)
        s2 = Scholarship(amount_max=None, amount_min=40)
        self.assertEqual(nominal_amount_for_scholarship(s2), 40)
        s3 = Scholarship(amount_max=None, amount_min=None)
        self.assertEqual(nominal_amount_for_scholarship(s3), 0)


class SavedScholarshipDeficitImpactAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="deficit@mail.utoronto.ca",
            email="deficit@mail.utoronto.ca",
            password="secret123",
        )
        UserProfile.objects.create(
            user=cls.user,
            total_expenses=Decimal("500.00"),
            total_earnings=Decimal("200.00"),
            parental_support=Decimal("100.00"),
            receives_scholarships_or_aid=False,
        )
        cls.s1 = Scholarship.objects.create(
            title="Big Award",
            description="d",
            offered_by="A",
            student_level=StudentLevel.UNDERGRAD,
            is_active=True,
            open_to_domestic=True,
            open_to_international=False,
            amount_max=1000,
            amount_min=100,
            deadline=date(2026, 8, 1),
        )
        cls.s2 = Scholarship.objects.create(
            title="Small Award",
            description="d",
            offered_by="B",
            student_level=StudentLevel.UNDERGRAD,
            is_active=True,
            open_to_domestic=True,
            open_to_international=False,
            amount_max=None,
            amount_min=500,
            deadline=date(2026, 9, 1),
        )
        SavedScholarship.objects.create(user=cls.user, scholarship=cls.s1)
        SavedScholarship.objects.create(user=cls.user, scholarship=cls.s2)

    def test_deficit_impact_requires_auth(self):
        res = self.client.get("/api/scholarships/saved/deficit-impact/")
        self.assertEqual(res.status_code, 401)

    def test_deficit_impact_default_probability_and_query(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/api/scholarships/saved/deficit-impact/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["saved_count"], 2)
        self.assertEqual(res.data["total_nominal_amount"], 1500)
        self.assertEqual(res.data["monthly_deficit"], "200.00")
        self.assertEqual(res.data["assumed_award_probability"], 0.8)
        self.assertEqual(res.data["potential_amount"], "1200.00")
        self.assertEqual(res.data["remaining_deficit_after_potential"], "0.00")
        self.assertIn("disclaimer", res.data)

        res2 = self.client.get("/api/scholarships/saved/deficit-impact/?probability=0.1")
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.data["potential_amount"], "150.00")
        self.assertEqual(res2.data["remaining_deficit_after_potential"], "50.00")

    def test_deficit_impact_invalid_probability(self):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(
            self.client.get("/api/scholarships/saved/deficit-impact/?probability=bad").status_code,
            400,
        )
        self.assertEqual(
            self.client.get("/api/scholarships/saved/deficit-impact/?probability=0").status_code,
            400,
        )
        self.assertEqual(
            self.client.get("/api/scholarships/saved/deficit-impact/?probability=1.5").status_code,
            400,
        )
