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