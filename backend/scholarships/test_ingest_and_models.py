"""Tests for student_level uniqueness, deadline helpers, cleanup, and list filters."""
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone

from scholarships.ingest_utils import (
    deactivate_stale_scholarships,
    default_school_year_end_deadline,
    prune_overdue_saved_scholarships,
    resolve_deadline_for_ingest,
)
from scholarships.models import (
    AwardType,
    SavedScholarship,
    SavedScholarshipStatus,
    Scholarship,
    StudentLevel,
)

User = get_user_model()


class DefaultDeadlineTests(TestCase):
    def test_april_30_same_year_when_before_may(self):
        self.assertEqual(
            default_school_year_end_deadline(date(2026, 3, 24)),
            date(2026, 4, 30),
        )
        self.assertEqual(
            default_school_year_end_deadline(date(2026, 4, 30)),
            date(2026, 4, 30),
        )

    def test_april_30_next_year_after_spring(self):
        self.assertEqual(
            default_school_year_end_deadline(date(2026, 5, 1)),
            date(2027, 4, 30),
        )

    def test_resolve_parsed_clears_estimated(self):
        dl, est = resolve_deadline_for_ingest(date(2026, 6, 1), None)
        self.assertEqual(dl, date(2026, 6, 1))
        self.assertFalse(est)

    def test_resolve_preserves_reported_when_parse_fails(self):
        existing = Scholarship(
            title="A",
            description="d",
            deadline=date(2026, 8, 1),
            deadline_is_estimated=False,
            student_level=StudentLevel.UNDERGRAD,
        )
        existing.save()
        dl, est = resolve_deadline_for_ingest(None, existing)
        self.assertEqual(dl, date(2026, 8, 1))
        self.assertFalse(est)

    def test_resolve_default_when_no_existing_deadline(self):
        dl, est = resolve_deadline_for_ingest(None, None)
        self.assertTrue(est)
        self.assertEqual(dl.month, 4)
        self.assertEqual(dl.day, 30)


class StudentLevelUniquenessTests(TestCase):
    def test_same_title_different_levels_allowed(self):
        Scholarship.objects.create(
            title="Twin",
            description="u",
            offered_by="Dept",
            student_level=StudentLevel.UNDERGRAD,
        )
        Scholarship.objects.create(
            title="Twin",
            description="g",
            offered_by="Dept",
            student_level=StudentLevel.GRAD,
        )
        self.assertEqual(Scholarship.objects.filter(title="Twin").count(), 2)

    def test_duplicate_same_level_rejected(self):
        Scholarship.objects.create(
            title="Once",
            description="a",
            offered_by="Dept",
            student_level=StudentLevel.UNDERGRAD,
        )
        with self.assertRaises(IntegrityError):
            Scholarship.objects.create(
                title="Once",
                description="b",
                offered_by="Dept",
                student_level=StudentLevel.UNDERGRAD,
            )


class CleanupAndFilterTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="t1", email="t1@test.com", password="x"
        )

    def test_prune_removes_only_early_statuses_past_grace(self):
        old_deadline = timezone.now().date() - timedelta(days=60)
        s = Scholarship.objects.create(
            title="Old",
            description="d",
            deadline=old_deadline,
            student_level=StudentLevel.UNDERGRAD,
        )
        SavedScholarship.objects.create(
            user=self.user,
            scholarship=s,
            status=SavedScholarshipStatus.SAVED,
        )
        n = prune_overdue_saved_scholarships(grace_days=21)
        self.assertEqual(n, 1)
        self.assertEqual(SavedScholarship.objects.count(), 0)

    def test_prune_keeps_submitted(self):
        old_deadline = timezone.now().date() - timedelta(days=60)
        s = Scholarship.objects.create(
            title="Sub",
            description="d",
            deadline=old_deadline,
            student_level=StudentLevel.UNDERGRAD,
        )
        SavedScholarship.objects.create(
            user=self.user,
            scholarship=s,
            status=SavedScholarshipStatus.SUBMITTED,
        )
        n = prune_overdue_saved_scholarships(grace_days=21)
        self.assertEqual(n, 0)
        self.assertEqual(SavedScholarship.objects.count(), 1)

    def test_deactivate_stale_marks_inactive(self):
        run_start = timezone.now()
        s = Scholarship.objects.create(
            title="Stale",
            description="d",
            student_level=StudentLevel.GRAD,
            is_active=True,
        )
        Scholarship.objects.filter(pk=s.pk).update(
            last_seen_at=run_start - timedelta(days=1)
        )
        n = deactivate_stale_scholarships(StudentLevel.GRAD, run_start)
        self.assertEqual(n, 1)
        s.refresh_from_db()
        self.assertFalse(s.is_active)


class ScholarshipsListFilterTests(TestCase):
    def setUp(self):
        Scholarship.objects.create(
            title="U Award",
            description="undergrad",
            award_type=AwardType.IN_COURSE,
            open_to_domestic=True,
            student_level=StudentLevel.UNDERGRAD,
            is_active=True,
        )
        Scholarship.objects.create(
            title="G Award",
            description="graduate phd",
            award_type=AwardType.IN_COURSE,
            open_to_domestic=True,
            student_level=StudentLevel.GRAD,
            is_active=True,
        )
        Scholarship.objects.create(
            title="Hidden",
            description="inactive",
            student_level=StudentLevel.UNDERGRAD,
            is_active=False,
        )

    def test_list_excludes_inactive(self):
        from rest_framework.test import APIClient

        client = APIClient()
        res = client.get("/api/scholarships/")
        titles = {x["title"] for x in res.data["results"]}
        self.assertIn("U Award", titles)
        self.assertIn("G Award", titles)
        self.assertNotIn("Hidden", titles)

    def test_student_level_filter_grad(self):
        from rest_framework.test import APIClient

        client = APIClient()
        res = client.get("/api/scholarships/?student_level=grad")
        titles = [x["title"] for x in res.data["results"]]
        self.assertEqual(titles, ["G Award"])

    def test_detail_404_when_inactive(self):
        from rest_framework.test import APIClient

        s = Scholarship.objects.get(title="Hidden")
        client = APIClient()
        res = client.get(f"/api/scholarships/{s.id}/")
        self.assertEqual(res.status_code, 404)
