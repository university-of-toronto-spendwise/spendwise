import hashlib
import random

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone
from rest_framework import serializers


VERIFICATION_CODE_LENGTH = 6
ALLOWED_UOFT_DOMAINS = ("utoronto.ca", "mail.utoronto.ca")


def normalize_uoft_email(email):
    return email.strip().lower()


def is_valid_uoft_email(email):
    normalized = normalize_uoft_email(email)
    return any(normalized.endswith(f"@{domain}") for domain in ALLOWED_UOFT_DOMAINS)


def generate_verification_code():
    return f"{random.randint(0, (10 ** VERIFICATION_CODE_LENGTH) - 1):0{VERIFICATION_CODE_LENGTH}d}"


def hash_verification_code(code):
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def verification_expiry():
    ttl_minutes = getattr(settings, "EMAIL_VERIFICATION_CODE_TTL_MINUTES", 10)
    return timezone.now() + timezone.timedelta(minutes=ttl_minutes)


def send_registration_verification_email(email, code, first_name):
    sender_email = getattr(settings, "DEFAULT_FROM_EMAIL", "")
    sender_name = getattr(settings, "EMAIL_FROM_NAME", "SpendWise")
    email_host = getattr(settings, "EMAIL_HOST", "")
    email_host_user = getattr(settings, "EMAIL_HOST_USER", "")
    email_host_password = getattr(settings, "EMAIL_HOST_PASSWORD", "")

    subject = "Verify your SpendWise UofT account"
    ttl_minutes = getattr(settings, "EMAIL_VERIFICATION_CODE_TTL_MINUTES", 10)
    text_content = (
        f"Hi {first_name},\n\n"
        f"Your SpendWise verification code is: {code}\n\n"
        f"This code expires in {ttl_minutes} minutes.\n\n"
        "If you did not request this, you can ignore this email."
    )
    html_content = (
        f"<p>Hi {first_name},</p>"
        "<p>Your SpendWise verification code is:</p>"
        f"<h2 style='letter-spacing: 0.2em;'>{code}</h2>"
        f"<p>This code expires in {ttl_minutes} minutes.</p>"
        "<p>If you did not request this, you can ignore this email.</p>"
    )

    if not (email_host and email_host_user and email_host_password and sender_email):
        raise serializers.ValidationError(
            {"email": "Email verification is not configured yet. Add SMTP email settings to the backend environment."}
        )

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=f"{sender_name} <{sender_email}>",
        to=[email],
    )
    message.attach_alternative(html_content, "text/html")
    try:
        message.send(fail_silently=False)
    except Exception as exc:
        raise serializers.ValidationError(
            {"email": f"We couldn't send the verification code right now. {exc}"}
        ) from exc
