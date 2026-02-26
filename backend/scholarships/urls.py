from django.urls import path
from .api import (
    ScholarshipsListAPI,
    ScholarshipDetailAPI,
    ScholarshipsMetaAPI,
    ScholarshipsMatchAPI,
)

urlpatterns = [
    path("scholarships/", ScholarshipsListAPI.as_view(), name="scholarships-list"),
    path("scholarships/meta/", ScholarshipsMetaAPI.as_view(), name="scholarships-meta"),
    path("scholarships/match/", ScholarshipsMatchAPI.as_view(), name="scholarships-match"),
    path("scholarships/<uuid:pk>/", ScholarshipDetailAPI.as_view(), name="scholarships-detail"),
]
