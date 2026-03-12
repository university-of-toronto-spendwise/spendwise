from django.test import TestCase
from rest_framework import status 
from rest_framework.test import APITestCase 
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

class RegistrationAPITest(APITestCase):
    def setUp(self):
        self.url = reverse('register')
        self.valid_payload = {
            "first_name": "jane",
            "last_name": "doe",
            "username": "testuser",
            "email": "testuser@example.com",
            "password": "StrongPass123!",
            "password2": "StrongPass123!"
        }
        self.invalid_payload_password_mismatch = {
            "first_name": "john",
            "last_name": "doe",
            "username": "testuser2",
            "email": "testuser2@example.com",
            "password": "StrongPass123!",
            "password2": "WrongPass123!"
        }
        self.invalid_payload_missing_email = {
            "first_name": "june",
            "last_name": "bug",
            "username": "testuser3",
            "password": "StrongPass123!",
            "password2": "StrongPass123!"
        }

    def test_registration_success(self):
        response = self.client.post(self.url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], "User registered successfully")
        self.assertTrue(User.objects.filter(username="testuser@example.com").exists())

    def test_registration_password_mismatch(self):
        response = self.client.post(self.url, self.invalid_payload_password_mismatch, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_registration_missing_email(self):
        response = self.client.post(self.url, self.invalid_payload_missing_email, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)


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
        self.assertFalse(response.data["onboarding_completed"])

    def test_put_profile_marks_onboarding_complete(self):
        payload = {
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
        self.assertTrue(response.data["onboarding_completed"])

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
