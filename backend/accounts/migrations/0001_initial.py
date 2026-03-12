from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("citizenship_status", models.CharField(blank=True, choices=[("Domestic", "Domestic"), ("International", "International")], max_length=32)),
                ("campus", models.CharField(blank=True, choices=[("St.George", "St.George"), ("Scarborough", "Scarborough"), ("Mississauga", "Mississauga")], max_length=32)),
                ("receives_scholarships_or_aid", models.BooleanField(default=False)),
                ("scholarship_aid_amount", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("total_earnings", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("total_expenses", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("parental_support", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("degree_type", models.CharField(blank=True, choices=[("Undergrad", "Undergrad"), ("Postgrad", "Postgrad")], max_length=32)),
                ("expected_graduation", models.CharField(blank=True, max_length=120)),
                ("onboarding_completed", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="profile", to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
