from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SpendingViewset  # ✅ THIS IS MISSING

router = DefaultRouter()
router.register('spending', SpendingViewset, basename='project')

urlpatterns = [
    path('', include(router.urls)),
]