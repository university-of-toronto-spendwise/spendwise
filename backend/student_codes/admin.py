from django.contrib import admin

from student_codes.models import Codes


@admin.register(Codes)
class CodesAdmin(admin.ModelAdmin):
    list_display = ("company", "source", "category", "popularity_score", "updated_at")
    list_filter = ("source", "category", "is_spc_plus", "online", "in_store")
    search_fields = ("company", "title", "desc", "category", "url")
