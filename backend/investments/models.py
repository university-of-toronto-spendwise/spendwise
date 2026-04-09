from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class InvestmentGoal(models.Model):
    GOAL_TYPE_CHOICES = [
        ("laptop", "Laptop"), ("tuition", "Tuition"),
        ("travel", "Travel"), ("emergency_fund", "Emergency Fund"), ("other", "Other"),
    ]
    RISK_LEVEL_CHOICES = [
        ("conservative", "Conservative"), ("balanced", "Balanced"), ("growth", "Growth"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="investment_goals")
    goal_name = models.CharField(max_length=255)
    goal_type = models.CharField(max_length=50, choices=GOAL_TYPE_CHOICES, default="other")
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    monthly_contribution = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    initial_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    target_date = models.DateField()
    risk_level = models.CharField(max_length=20, choices=RISK_LEVEL_CHOICES, default="balanced")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "created_at"])]

    def __str__(self):
        return f"{self.goal_name} - {self.user}"


class PracticePortfolio(models.Model):
    PORTFOLIO_TYPE_CHOICES = [("system", "System"), ("custom", "Custom")]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="practice_portfolios")
    goal = models.ForeignKey(InvestmentGoal, on_delete=models.CASCADE, related_name="practice_portfolios")
    portfolio_name = models.CharField(max_length=255)
    portfolio_type = models.CharField(max_length=20, choices=PORTFOLIO_TYPE_CHOICES, default="system")
    expected_annual_return = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "goal"])]

    def __str__(self):
        return self.portfolio_name


class PracticePortfolioHolding(models.Model):
    ASSET_TYPE_CHOICES = [
        ("stock", "Stock"), ("etf", "ETF"), ("bond", "Bond"), ("cash", "Cash"),
    ]
    portfolio = models.ForeignKey(PracticePortfolio, on_delete=models.CASCADE, related_name="holdings")
    symbol = models.CharField(max_length=20)
    asset_name = models.CharField(max_length=255)
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPE_CHOICES, default="etf")
    allocation_percent = models.DecimalField(max_digits=5, decimal_places=2)
    expected_annual_return = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    class Meta:
        ordering = ["symbol"]
        indexes = [models.Index(fields=["portfolio", "symbol"])]

    def __str__(self):
        return f"{self.symbol} ({self.allocation_percent}%)"


class MLRecommendation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="ml_recommendations")
    symbol = models.CharField(max_length=20)
    asset_name = models.CharField(max_length=100)
    asset_type = models.CharField(max_length=20, default="etf")
    recommendation_score = models.DecimalField(max_digits=5, decimal_places=4)
    risk_score = models.DecimalField(max_digits=5, decimal_places=4)
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recommendation_score"]
        indexes = [models.Index(fields=["user", "recommendation_score"])]

    def __str__(self):
        return f"{self.symbol} ({self.recommendation_score:.3f})"
