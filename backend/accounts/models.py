from django.conf import settings
from django.db import models
from django.utils import timezone


class PendingRegistration(models.Model):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    password_hash = models.CharField(max_length=255)
    verification_code_hash = models.CharField(max_length=64)
    code_expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"PendingRegistration<{self.email}>"

    @property
    def is_expired(self):
        return self.code_expires_at <= timezone.now()


class UserProfile(models.Model):
    AUTH_PROVIDER_CHOICES = [
        ("email", "Email"),
        ("uoft_sso", "UofT SSO"),
    ]

    CITIZENSHIP_CHOICES = [
        ("Domestic", "Domestic"),
        ("International", "International"),
    ]

    CAMPUS_CHOICES = [
        ("St.George", "St.George"),
        ("Scarborough", "Scarborough"),
        ("Mississauga", "Mississauga"),
    ]

    DEGREE_CHOICES = [
        ("Undergrad", "Undergrad"),
        ("Postgrad", "Postgrad"),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    faculty = models.CharField(max_length=120, blank=True)
    major = models.CharField(max_length=120, blank=True)
    year = models.PositiveSmallIntegerField(default=1)
    citizenship_status = models.CharField(max_length=32, choices=CITIZENSHIP_CHOICES, blank=True)
    campus = models.CharField(max_length=32, choices=CAMPUS_CHOICES, blank=True)
    receives_scholarships_or_aid = models.BooleanField(default=False)
    scholarship_aid_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_earnings = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_expenses = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    parental_support = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    degree_type = models.CharField(max_length=32, choices=DEGREE_CHOICES, blank=True)
    expected_graduation = models.CharField(max_length=120, blank=True)
    estimated_annual_school_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Estimated total school-year cost (tuition, fees, housing, books).",
    )
    gpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    resume_summary = models.TextField(blank=True, help_text="Short text for scholarship matching (achievements, leadership, etc.).")
    auth_provider = models.CharField(max_length=32, choices=AUTH_PROVIDER_CHOICES, default="email")
    is_uoft_verified = models.BooleanField(default=True)
    utorid = models.CharField(max_length=64, null=True, blank=True, unique=True)
    onboarding_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile<{self.user_id}>"
