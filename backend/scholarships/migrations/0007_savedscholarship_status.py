# Generated for SavedScholarship.status

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("scholarships", "0006_savedscholarship"),
    ]

    operations = [
        migrations.AddField(
            model_name="savedscholarship",
            name="status",
            field=models.CharField(
                choices=[
                    ("saved", "Saved / Planned"),
                    ("in_progress", "In Progress"),
                    ("submitted", "Submitted"),
                ],
                default="saved",
                max_length=20,
            ),
            preserve_default=True,
        ),
    ]
