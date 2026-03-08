from django.test import TestCase
from rest_framework import status 
from rest_framework.test import APITestCase 
from django.contrib.auth import get_user_model
from django.urls import reverse

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

    #def test_registration_success(self):
        #response = self.client.post(self.url, self.valid_payload, format='json')
        #self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        #self.assertEqual(response.data['message'], "User registered successfully")
        #self.assertTrue(User.objects.filter(username="testuser").exists())

    def test_registration_password_mismatch(self):
        response = self.client.post(self.url, self.invalid_payload_password_mismatch, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_registration_missing_email(self):
        response = self.client.post(self.url, self.invalid_payload_missing_email, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)