from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserProfile
from .serializers import RegistrationRequestSerializer, RegistrationVerificationSerializer, UserProfileSerializer


def build_token_response(user):
    refresh = RefreshToken.for_user(user)
    return {
        "message": "Email verified successfully.",
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


class RegistrationView(APIView):
    def post(self, request):
        serializer = RegistrationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "Verification code sent to your UofT email.", "email": serializer.validated_data["email"]},
            status=status.HTTP_200_OK,
        )


class RegistrationVerificationView(APIView):
    def post(self, request):
        serializer = RegistrationVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.create_user()
        return Response(build_token_response(user), status=status.HTTP_201_CREATED)


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get_profile(self, user):
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return profile

    def get(self, request):
        serializer = UserProfileSerializer(self.get_profile(request.user))
        return Response(serializer.data)

    def put(self, request):
        profile = self.get_profile(request.user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
