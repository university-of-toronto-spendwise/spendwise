from django.urls import path
from .views import RegistrationView

urlpatterns = [
    path('register/', RegistrationView.as_view(), name='register'),
]