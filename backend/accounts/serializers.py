from decimal import Decimal

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import PendingRegistration, UserProfile
from .services import generate_verification_code, hash_verification_code, is_valid_uoft_email, normalize_uoft_email, send_registration_verification_email, verification_expiry

User = get_user_model()


class RegistrationRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    def validate_email(self, value):
        email = normalize_uoft_email(value)
        if not is_valid_uoft_email(email):
            raise serializers.ValidationError("Please use your UofT email address.")
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_first_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Please enter your first name.")
        return cleaned

    def validate_last_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Please enter your last name.")
        return cleaned

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords didn't match."})
        return attrs

    def save(self):
        email = self.validated_data["email"]
        code = generate_verification_code()
        pending_registration, _ = PendingRegistration.objects.update_or_create(
            email=email,
            defaults={
                "first_name": self.validated_data["first_name"],
                "last_name": self.validated_data["last_name"],
                "password_hash": make_password(self.validated_data["password"]),
                "verification_code_hash": hash_verification_code(code),
                "code_expires_at": verification_expiry(),
            },
        )
        send_registration_verification_email(
            email=email,
            code=code,
            first_name=pending_registration.first_name,
        )
        return pending_registration


class RegistrationVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    code = serializers.CharField(required=True, min_length=6, max_length=6)
    password = serializers.CharField(required=False, write_only=True, allow_blank=False)

    default_error_messages = {
        "invalid_code": "That verification code is incorrect.",
        "expired_code": f"That verification code expired. Request a new code to continue.",
        "missing_request": "Start registration first so we can send you a verification code.",
        "duplicate_email": "An account with this email already exists.",
    }

    def validate_email(self, value):
        return normalize_uoft_email(value)

    def validate(self, attrs):
        email = attrs["email"]
        existing_user = self._get_existing_user(email)

        try:
            pending_registration = PendingRegistration.objects.get(email=email)
        except PendingRegistration.DoesNotExist as exc:
            authenticated_user = self._authenticate_existing_user(existing_user, attrs.get("password"))
            if authenticated_user:
                attrs["existing_user"] = authenticated_user
                return attrs

            raise serializers.ValidationError({"email": self.error_messages["missing_request"]}) from exc

        if existing_user:
            pending_registration.delete()
            raise serializers.ValidationError({"email": self.error_messages["duplicate_email"]})

        if pending_registration.is_expired:
            raise serializers.ValidationError({"code": self.error_messages["expired_code"]})

        if pending_registration.verification_code_hash != hash_verification_code(attrs["code"]):
            raise serializers.ValidationError({"code": self.error_messages["invalid_code"]})

        attrs["pending_registration"] = pending_registration
        return attrs

    def _get_existing_user(self, email):
        return User.objects.filter(email__iexact=email).first()

    def _authenticate_existing_user(self, user, password):
        if not user or not password:
            return None
        return authenticate(username=user.username, password=password)

    def create_user(self):
        existing_user = self.validated_data.get("existing_user")
        if existing_user:
            return existing_user

        pending_registration = self.validated_data["pending_registration"]
        user = User.objects.create(
            username=pending_registration.email,
            email=pending_registration.email,
            first_name=pending_registration.first_name,
            last_name=pending_registration.last_name,
            password=pending_registration.password_hash,
        )
        pending_registration.delete()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name", required=False, allow_blank=True)
    last_name = serializers.CharField(source="user.last_name", required=False, allow_blank=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    net_annual_cost_after_aid = serializers.SerializerMethodField()

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
            "estimated_annual_school_cost",
            "gpa",
            "resume_summary",
            "net_annual_cost_after_aid",
            "onboarding_completed",
        )
        read_only_fields = ("onboarding_completed", "net_annual_cost_after_aid")

    def get_net_annual_cost_after_aid(self, obj):
        if obj.estimated_annual_school_cost is None:
            return None
        cost = obj.estimated_annual_school_cost
        if obj.receives_scholarships_or_aid and obj.scholarship_aid_amount is not None:
            # scholarship_aid_amount is stored as monthly (same convention as other budget fields)
            annual_aid = obj.scholarship_aid_amount * 12
            return max(Decimal("0"), cost - annual_aid)
        return cost

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
