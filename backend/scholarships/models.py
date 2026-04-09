import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class AwardType(models.TextChoices):
    ADMISSIONS = "admissions", "Admissions"
    IN_COURSE  = "in_course", "In-course"
    GRADUATING = "graduating", "Graduating"


class StudentLevel(models.TextChoices):
    UNDERGRAD = "undergrad", "Undergraduate"
    GRAD = "grad", "Graduate"


class SavedScholarshipStatus(models.TextChoices):
    SAVED = "saved", "Saved / Planned"
    IN_PROGRESS = "in_progress", "In Progress"
    SUBMITTED = "submitted", "Submitted"
    AWARDED = "awarded", "Awarded"
    NOT_AWARDED = "not_awarded", "Not awarded"


class Scholarship(models.Model):
    # IDENTITY
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source = models.CharField(max_length=100, default="UOFT_AWARD_EXPLORER")
    student_level = models.CharField(
        max_length=16,
        choices=StudentLevel.choices,
        default=StudentLevel.UNDERGRAD,
        db_index=True,
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="False when not seen in last catalog ingest for this level.",
    )

    # CORE INFO
    # default is null = False
    title = models.CharField(max_length=500)
    description = models.TextField()
    offered_by = models.CharField(max_length=500, null=True)
    url = models.URLField(max_length=1000, null=True, blank=True)

    # AWARD TYPE
    award_type = models.CharField(max_length=50, choices=AwardType.choices, null=True, blank=True)

    # CITIZENSHIP
    open_to_domestic = models.BooleanField(default=False)
    open_to_international = models.BooleanField(default=False)

    # NATURE OF AWARD
    nature_academic_merit = models.BooleanField(default=False)
    nature_athletic_performance = models.BooleanField(default=False)
    nature_community = models.BooleanField(default=False)
    nature_financial_need = models.BooleanField(default=False)
    nature_leadership = models.BooleanField(default=False)
    nature_indigenous = models.BooleanField(default=False)
    nature_black_students = models.BooleanField(default=False)
    nature_extracurriculars = models.BooleanField(default=False)
    nature_other = models.BooleanField(default=False)

    # APPLICATION
    application_required = models.BooleanField(default=False)
    application_url = models.CharField(max_length=1000, null=True)

    # AMOUNT
    amount_text = models.CharField(max_length=500, null=True)
    amount_min = models.IntegerField(null=True, blank=True)
    amount_max = models.IntegerField(null=True, blank=True)

    # DATES
    deadline = models.DateField(null=True)
    deadline_is_estimated = models.BooleanField(
        default=False,
        help_text="True when deadline was assumed (e.g. April 30) because source had none.",
    )
    last_seen_at = models.DateTimeField(default=timezone.now)
    #sets it once on creation and never touches it again
    created_at = models.DateTimeField(auto_now_add=True)
    #updates it every single save.
    updated_at = models.DateTimeField(auto_now=True)


    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["title", "offered_by", "student_level"],
                name="uniq_scholarship_title_offered_by_level",
            ),
        ]
        indexes = [
            models.Index(fields=["deadline"]),
            models.Index(fields=["award_type"]),
            models.Index(fields=["open_to_domestic"]),
            models.Index(fields=["open_to_international"]),
            models.Index(fields=["student_level", "is_active"]),
        ]

    def __str__(self):
        return self.title


class SavedScholarship(models.Model):
    """Links a user to a scholarship they saved; used for profile and upcoming deadlines."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_scholarships",
    )
    scholarship = models.ForeignKey(
        Scholarship,
        on_delete=models.CASCADE,
        related_name="saved_by_users",
    )
    saved_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(
        max_length=20,
        choices=SavedScholarshipStatus.choices,
        default=SavedScholarshipStatus.SAVED,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "scholarship"],
                name="uniq_user_saved_scholarship",
            )
        ]
        ordering = ["saved_at"]

    def __str__(self):
        return f"{self.user_id} saved {self.scholarship_id}"        