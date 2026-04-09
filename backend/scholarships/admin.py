from django.contrib import admin
from .models import Scholarship, SavedScholarship


@admin.register(Scholarship)
class ScholarshipAdmin(admin.ModelAdmin):
    list_display = ["title", "offered_by", "student_level", "is_active", "award_type", "deadline"]
    list_filter = ["student_level", "is_active"]


@admin.register(SavedScholarship)
class SavedScholarshipAdmin(admin.ModelAdmin):
    list_display = ["user", "scholarship", "saved_at"]
    list_filter = ["saved_at"]
