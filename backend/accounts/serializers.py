from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password

from .models import PendingRegistration, UserProfile
from .services import (
    generate_verification_code,
    hash_verification_code,
    is_valid_uoft_email,
    normalize_uoft_email,
    send_registration_verification_email,
    verification_expiry,
)

User = get_user_model()


class RegistrationRequestSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    def validate_email(self, value):
        if not is_valid_uoft_email(value):
            raise serializers.ValidationError(
                "Use a UofT email address ending in @utoronto.ca or @mail.utoronto.ca."
            )
        normalized = normalize_uoft_email(value)
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return normalized

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2", None)
        email = validated_data["email"]
        code = generate_verification_code()
        PendingRegistration.objects.update_or_create(
            email=email,
            defaults={
                "first_name": validated_data["first_name"],
                "last_name": validated_data["last_name"],
                "password_hash": make_password(validated_data["password"]),
                "verification_code_hash": hash_verification_code(code),
                "code_expires_at": verification_expiry(),
            },
        )
        send_registration_verification_email(
            email=email,
            code=code,
            first_name=validated_data["first_name"],
        )
        return validated_data


class RegistrationVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    def validate_email(self, value):
        return normalize_uoft_email(value)

    def create_user(self):
        email = self.validated_data["email"]
        code = self.validated_data["code"]
        password_plain = (self.validated_data.get("password") or "").strip()

        user = User.objects.filter(email__iexact=email).first()
        if user is not None:
            if not password_plain:
                raise serializers.ValidationError({"password": "Password is required."})
            if not user.check_password(password_plain):
                raise serializers.ValidationError({"password": "Invalid password."})
            return user

        try:
            pending = PendingRegistration.objects.get(email=email)
        except PendingRegistration.DoesNotExist:
            raise serializers.ValidationError({"email": "No pending registration for this email."})

        if pending.code_expires_at < timezone.now():
            raise serializers.ValidationError({"code": "This code has expired. Request a new one."})
        if pending.verification_code_hash != hash_verification_code(code):
            raise serializers.ValidationError({"code": "Invalid verification code."})

        new_user = User(
            username=email,
            email=email,
            first_name=pending.first_name,
            last_name=pending.last_name,
        )
        new_user.password = pending.password_hash
        new_user.save()
        pending.delete()
        return new_user


class UserProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name", required=False, allow_blank=True)
    last_name = serializers.CharField(source="user.last_name", required=False, allow_blank=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = UserProfile
        fields = (
            "first_name",
            "last_name",
            "email",
            "faculty",
            "major",
            "year",
            "citizenship_status",
            "campus",
            "receives_scholarships_or_aid",
            "scholarship_aid_amount",
            "total_earnings",
            "total_expenses",
            "parental_support",
            "degree_type",
            "expected_graduation",
            "onboarding_completed",
        )
        read_only_fields = ("onboarding_completed",)

    def validate(self, attrs):
        attrs = super().validate(attrs)

        receives_aid = attrs.get(
            "receives_scholarships_or_aid",
            getattr(self.instance, "receives_scholarships_or_aid", False),
        )
        scholarship_amount = attrs.get(
            "scholarship_aid_amount",
            getattr(self.instance, "scholarship_aid_amount", None),
        )

        if receives_aid and scholarship_amount in (None, ""):
            raise serializers.ValidationError(
                {"scholarship_aid_amount": "Please enter how much scholarship or aid you receive."}
            )

        return attrs

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", None)
        if user_data:
            user = instance.user
            if "first_name" in user_data:
                user.first_name = user_data.get("first_name", user.first_name)
            if "last_name" in user_data:
                user.last_name = user_data.get("last_name", user.last_name)
            user.save()

        if not validated_data.get("receives_scholarships_or_aid", instance.receives_scholarships_or_aid):
            validated_data["scholarship_aid_amount"] = None

        instance = super().update(instance, validated_data)

        required_values = [
            instance.citizenship_status,
            instance.campus,
            instance.total_earnings,
            instance.total_expenses,
            instance.parental_support,
            instance.degree_type,
            instance.expected_graduation,
        ]
        instance.onboarding_completed = all(value not in (None, "") for value in required_values) and (
            not instance.receives_scholarships_or_aid or instance.scholarship_aid_amount is not None
        )
        instance.save(update_fields=["onboarding_completed", "updated_at"])
        return instance
