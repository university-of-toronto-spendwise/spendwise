from django.urls import path
from .views import SPCDealsAPI

urlpatterns = [
    path("student-codes/spc/", SPCDealsAPI.as_view(), name="student-codes-spc"),
]
