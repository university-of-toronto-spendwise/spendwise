from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import RegistrationVerificationView, RegistrationView, UserProfileView

urlpatterns = [
    path('register/', RegistrationView.as_view(), name='register'),
    path("register/verify/", RegistrationVerificationView.as_view(), name="register_verify"),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
