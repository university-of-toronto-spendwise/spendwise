from django.core.management.base import BaseCommand
from django.db.models import Count

from scholarships.models import Scholarship, StudentLevel


class Command(BaseCommand):
    help = "Report counts of scholarships by student level and active flag (diagnostic)."

    def handle(self, *args, **options):
        self.stdout.write("Scholarship catalog snapshot")
        for sl in StudentLevel:
            n = Scholarship.objects.filter(student_level=sl.value).count()
            active = Scholarship.objects.filter(student_level=sl.value, is_active=True).count()
            self.stdout.write(f"  {sl.label}: total={n}, active={active}, inactive={n - active}")

        by_level = (
            Scholarship.objects.values("student_level", "is_active")
            .annotate(c=Count("id"))
            .order_by("student_level", "is_active")
        )
        self.stdout.write("Breakdown:")
        for row in by_level:
            self.stdout.write(
                f"  level={row['student_level']} active={row['is_active']} count={row['c']}"
            )
