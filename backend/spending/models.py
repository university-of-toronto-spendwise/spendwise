from django.db import models
from django.conf import settings

class RecurringMerchant(models.Model):
    """
    User-approved recurring merchants.

    This is used to persist the user's "Yes, treat this merchant as recurring" choice.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    merchant_key = models.CharField(max_length=255)
    merchant_name = models.CharField(max_length=255, blank=True, default="")
    account_id = models.CharField(max_length=255, blank=True, default="")
    is_recurring = models.BooleanField(default=False)
    dismissed_until = models.DateTimeField(null=True, blank=True, db_index=True)
    dismissed_after = models.DateField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "merchant_key", "account_id"],
                name="uniq_recurringmerchant_user_merchant_key_account_id",
            )
        ]
