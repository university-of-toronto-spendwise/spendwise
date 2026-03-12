from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import UserProfile

User = get_user_model()

class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'password', 'password2')
        extra_kwargs = {
            'email': {'required': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords didn't match."})
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "An account with this email already exists."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user


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
