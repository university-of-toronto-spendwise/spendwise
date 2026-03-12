from django.urls import path
from .api import (
    ScholarshipsListAPI,
    ScholarshipDetailAPI,
    ScholarshipsMetaAPI,
    ScholarshipsMatchAPI,
    SavedScholarshipsListAPI,
    SaveUnsaveScholarshipAPI,
    SavedScholarshipStatusAPI,
)

urlpatterns = [
    path("scholarships/", ScholarshipsListAPI.as_view(), name="scholarships-list"),
    path("scholarships/meta/", ScholarshipsMetaAPI.as_view(), name="scholarships-meta"),
    path("scholarships/match/", ScholarshipsMatchAPI.as_view(), name="scholarships-match"),
    path("scholarships/saved/", SavedScholarshipsListAPI.as_view(), name="scholarships-saved"),
    path("scholarships/saved/<int:pk>/status/", SavedScholarshipStatusAPI.as_view(), name="scholarships-saved-status"),
    path("scholarships/<uuid:pk>/", ScholarshipDetailAPI.as_view(), name="scholarships-detail"),
    path("scholarships/<uuid:pk>/save/", SaveUnsaveScholarshipAPI.as_view(), name="scholarships-save-unsave"),
]