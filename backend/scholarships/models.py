import uuid
from django.db import models
from django.utils import timezone


class AwardType(models.TextChoices):
    ADMISSIONS = "admissions", "Admissions"
    IN_COURSE  = "in_course", "In-course"
    GRADUATING = "graduating", "Graduating"


class Scholarship(models.Model):
    # IDENTITY
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source = models.CharField(max_length=100, default="UOFT_AWARD_EXPLORER")

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
    last_seen_at = models.DateTimeField(default=timezone.now)
    #sets it once on creation and never touches it again
    created_at = models.DateTimeField(auto_now_add=True)
    #updates it every single save.
    updated_at = models.DateTimeField(auto_now=True)


    class Meta:
        unique_together = [["title", "offered_by"]]
        indexes = [
            models.Index(fields=["deadline"]),
            models.Index(fields=["award_type"]),
            models.Index(fields=["open_to_domestic"]),
            models.Index(fields=["open_to_international"]),
        ]
    def __str__(self):
        return self.title        