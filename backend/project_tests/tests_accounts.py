from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import PendingRegistration
from accounts.services import hash_verification_code

User = get_user_model()


class RegistrationAPITest(APITestCase):
    def setUp(self):
        self.register_url = reverse("register")
        self.verify_url = reverse("register_verify")
        self.valid_payload = {
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "jane.doe@mail.utoronto.ca",
            "password": "StrongPass123!",
            "password2": "StrongPass123!",
        }

    @patch("accounts.serializers.send_registration_verification_email")
    @patch("accounts.serializers.generate_verification_code", return_value="654321")
    def test_registration_request_sends_code_and_does_not_create_user(self, _generate_code, mock_send_email):
        response = self.client.post(self.register_url, self.valid_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Verification code sent to your UofT email.")
        self.assertFalse(User.objects.filter(email=self.valid_payload["email"]).exists())

        pending_registration = PendingRegistration.objects.get(email=self.valid_payload["email"])
        self.assertEqual(pending_registration.first_name, "Jane")
        self.assertEqual(pending_registration.verification_code_hash, hash_verification_code("654321"))
        mock_send_email.assert_called_once_with(
            email="jane.doe@mail.utoronto.ca",
            code="654321",
            first_name="Jane",
        )

    def test_registration_rejects_non_uoft_email(self):
        payload = {**self.valid_payload, "email": "jane@gmail.com"}
        response = self.client.post(self.register_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    @patch("accounts.serializers.send_registration_verification_email")
    @patch("accounts.serializers.generate_verification_code", return_value="654321")
    def test_verification_creates_user_and_returns_tokens(self, _generate_code, _mock_send_email):
        self.client.post(self.register_url, self.valid_payload, format="json")

        response = self.client.post(
            self.verify_url,
            {"email": self.valid_payload["email"], "code": "654321"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertTrue(User.objects.filter(email=self.valid_payload["email"]).exists())
        self.assertFalse(PendingRegistration.objects.filter(email=self.valid_payload["email"]).exists())

    def test_verification_returns_tokens_for_already_created_user_when_password_matches(self):
        existing_user = User.objects.create_user(
            username=self.valid_payload["email"],
            email=self.valid_payload["email"],
            first_name=self.valid_payload["first_name"],
            last_name=self.valid_payload["last_name"],
            password=self.valid_payload["password"],
        )

        response = self.client.post(
            self.verify_url,
            {
                "email": self.valid_payload["email"],
                "code": "654321",
                "password": self.valid_payload["password"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(User.objects.filter(email=self.valid_payload["email"]).count(), 1)
        self.assertEqual(existing_user.email, self.valid_payload["email"])

    @patch("accounts.serializers.send_registration_verification_email")
    @patch("accounts.serializers.generate_verification_code", return_value="654321")
    def test_verification_rejects_expired_code(self, _generate_code, _mock_send_email):
        self.client.post(self.register_url, self.valid_payload, format="json")
        pending_registration = PendingRegistration.objects.get(email=self.valid_payload["email"])
        pending_registration.code_expires_at = timezone.now() - timedelta(minutes=1)
        pending_registration.save(update_fields=["code_expires_at"])

        response = self.client.post(
            self.verify_url,
            {"email": self.valid_payload["email"], "code": "654321"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("code", response.data)


class UserProfileAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="profile@example.com",
            email="profile@example.com",
            password="StrongPass123!",
        )
        token = RefreshToken.for_user(self.user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        self.url = reverse("profile")

    def test_get_profile_creates_default_profile(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "profile@example.com")
        self.assertEqual(response.data["faculty"], "")
        self.assertEqual(response.data["major"], "")
        self.assertEqual(response.data["year"], 1)
        self.assertFalse(response.data["onboarding_completed"])

    def test_put_profile_marks_onboarding_complete(self):
        payload = {
            "first_name": "Jane",
            "last_name": "Student",
            "faculty": "Engineering",
            "major": "Computer Engineering",
            "year": 3,
            "citizenship_status": "Domestic",
            "campus": "St.George",
            "receives_scholarships_or_aid": True,
            "scholarship_aid_amount": "1500.00",
            "total_earnings": "22000.00",
            "total_expenses": "12000.00",
            "parental_support": "5000.00",
            "degree_type": "Undergrad",
            "expected_graduation": "Spring 2028",
        }
        response = self.client.put(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "Jane")
        self.assertEqual(response.data["last_name"], "Student")
        self.assertEqual(response.data["faculty"], "Engineering")
        self.assertEqual(response.data["major"], "Computer Engineering")
        self.assertEqual(response.data["year"], 3)
        self.assertTrue(response.data["onboarding_completed"])

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "Jane")
        self.assertEqual(response.data["last_name"], "Student")
        self.assertEqual(response.data["faculty"], "Engineering")
        self.assertEqual(response.data["major"], "Computer Engineering")
        self.assertEqual(response.data["year"], 3)
        self.assertEqual(response.data["campus"], "St.George")
        self.assertEqual(response.data["degree_type"], "Undergrad")
        self.assertEqual(response.data["total_earnings"], "22000.00")

    def test_requires_aid_amount_when_receiving_aid(self):
        payload = {
            "citizenship_status": "Domestic",
            "campus": "St.George",
            "receives_scholarships_or_aid": True,
            "total_earnings": "22000.00",
            "total_expenses": "12000.00",
            "parental_support": "5000.00",
            "degree_type": "Undergrad",
            "expected_graduation": "Spring 2028",
        }
        response = self.client.put(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scholarship_aid_amount", response.data)
