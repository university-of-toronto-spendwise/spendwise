from django.db import models


class Codes(models.Model):
    SOURCE_SPC = "spc"
    SOURCE_UNIDAYS = "unidays"
    SOURCE_STUDENT_BEANS = "studentbeans"
    SOURCE_CHOICES = (
        (SOURCE_SPC, "SPC"),
        (SOURCE_UNIDAYS, "UNiDAYS"),
        (SOURCE_STUDENT_BEANS, "Student Beans"),
    )

    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default=SOURCE_SPC, db_index=True)
    external_id = models.CharField(max_length=255, db_index=True)
    category = models.CharField(max_length=100, blank=True, default="")
    company = models.CharField(max_length=255)
    title = models.CharField(max_length=255, blank=True, default="")
    desc = models.TextField(blank=True, default="")
    code = models.CharField(max_length=200, blank=True, default="")
    in_store_code = models.CharField(max_length=200, blank=True, default="")
    url = models.URLField(max_length=500, blank=True, default="")
    online = models.BooleanField(default=False)
    in_store = models.BooleanField(default=False)
    is_spc_plus = models.BooleanField(default=False)
    logo = models.URLField(max_length=500, blank=True, default="")
    image = models.URLField(max_length=500, blank=True, default="")
    source_rank = models.PositiveIntegerField(default=0)
    popularity_score = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-popularity_score", "source_rank", "company"]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "external_id"],
                name="uniq_student_code_source_external_id",
            )
        ]

    def __str__(self):
        return f"{self.company} ({self.source})"
