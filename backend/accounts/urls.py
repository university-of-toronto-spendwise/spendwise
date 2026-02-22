from django.urls import path
from .views import RegistrationView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('register/', RegistrationView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]