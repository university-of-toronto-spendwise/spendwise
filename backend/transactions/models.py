from django.db import models


class PlaidItem(models.Model):
    """
    One row per connected institution (bank / credit card).
    Stores the access_token returned after the public_token exchange.

    In a real app you'd add:  user = models.ForeignKey(User, on_delete=models.CASCADE)
    """
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

    transaction_id = models.CharField(max_length=255, unique=True)

    account_id = models.CharField(max_length=255)

    merchant_name = models.CharField(max_length=255, null=True, blank=True)

    name = models.CharField(max_length=255)

    amount = models.DecimalField(max_digits=10, decimal_places=2)

    date = models.DateField()

    category = models.CharField(max_length=255, null=True, blank=True)

    pending = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)