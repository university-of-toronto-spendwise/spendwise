from django.db import models


class PlaidItem(models.Model):
    """
    One row per connected institution (bank / credit card).
    Stores the access_token returned after the public_token exchange.

    In a real app you'd add:  user = models.ForeignKey(User, on_delete=models.CASCADE)
    """
    user             = models.ForeignKey("auth.User", on_delete=models.CASCADE, null=True, blank=True)
    item_id          = models.CharField(max_length=255, unique=True)
    access_token     = models.CharField(max_length=255)
    institution_id   = models.CharField(max_length=100, blank=True)
    institution_name = models.CharField(max_length=255, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.institution_name} — {self.item_id[:14]}…"


class Transaction(models.Model):

    user = models.ForeignKey("auth.User", on_delete=models.CASCADE)

    item = models.ForeignKey(PlaidItem, on_delete=models.CASCADE)

    transaction_id = models.CharField(max_length=255)

    account_id = models.CharField(max_length=255)
    pending_transaction_id = models.CharField(max_length=255, null=True, blank=True)

    merchant_name = models.CharField(max_length=255, null=True, blank=True)

    name = models.CharField(max_length=255)
    logo_url = models.CharField(max_length=200, null=True, blank=True)
    website = models.CharField(max_length=200, null=True, blank=True)

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    iso_currency_code = models.CharField(max_length=10, default="USD")

    date = models.DateField()
    authorized_date = models.DateField(null=True, blank=True)

    category = models.JSONField(default=list, blank=True)
    category_id = models.CharField(max_length=255, null=True, blank=True)
    personal_finance_category = models.JSONField(null=True, blank=True)
    payment_channel = models.CharField(max_length=50, default="")

    pending = models.BooleanField(default=False)
    location = models.JSONField(default=dict, blank=True)
    raw_data = models.JSONField(default=dict, blank=True)
    synced_at = models.DateTimeField(auto_now=True)

    created_at = models.DateTimeField(auto_now_add=True)
    user_category = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "transaction_id"],
                name="uniq_transaction_user_transaction_id",
            )
        ]


class BankAccount(models.Model):
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE)
    item = models.ForeignKey(PlaidItem, on_delete=models.CASCADE, related_name="bank_accounts")
    account_id = models.CharField(max_length=255)
    name = models.CharField(max_length=255, blank=True)
    official_name = models.CharField(max_length=255, blank=True)
    account_type = models.CharField(max_length=100, blank=True)
    subtype = models.CharField(max_length=100, blank=True)
    mask = models.CharField(max_length=10, blank=True)
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    available_balance = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    limit_balance = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency_code = models.CharField(max_length=10, blank=True, default="USD")
    synced_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "account_id"],
                name="uniq_bank_account_user_account_id",
            )
        ]
