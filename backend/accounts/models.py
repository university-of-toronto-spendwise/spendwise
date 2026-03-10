from django.conf import settings
from django.db import models


class UserProfile(models.Model):
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
    citizenship_status = models.CharField(max_length=32, choices=CITIZENSHIP_CHOICES, blank=True)
    campus = models.CharField(max_length=32, choices=CAMPUS_CHOICES, blank=True)
    receives_scholarships_or_aid = models.BooleanField(default=False)
    scholarship_aid_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_earnings = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_expenses = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    parental_support = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    degree_type = models.CharField(max_length=32, choices=DEGREE_CHOICES, blank=True)
    expected_graduation = models.CharField(max_length=120, blank=True)
    onboarding_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile<{self.user_id}>"
