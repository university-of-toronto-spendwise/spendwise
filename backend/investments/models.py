from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class InvestmentGoal(models.Model):
    GOAL_TYPE_CHOICES = [
        ("emergency_fund", "Emergency Fund"),
        ("tuition", "Tuition"),
        ("travel", "Travel"),
        ("laptop", "Laptop"),
        ("other", "Other"),
    ]

    RISK_CHOICES = [
        ("conservative", "Conservative"),
        ("balanced", "Balanced"),
        ("growth", "Growth"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="investment_goals",
    )
    goal_name = models.CharField(max_length=100)
    goal_type = models.CharField(
        max_length=50,
        choices=GOAL_TYPE_CHOICES,
        default="other",
    )
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    monthly_contribution = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    initial_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    target_date = models.DateField()
    risk_level = models.CharField(
        max_length=20,
        choices=RISK_CHOICES,
        default="balanced",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.goal_name}"


class PracticePortfolio(models.Model):
    PORTFOLIO_TYPE_CHOICES = [
        ("system", "System Generated"),
        ("custom", "Custom"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="practice_portfolios",
    )
    goal = models.ForeignKey(
        InvestmentGoal,
        on_delete=models.CASCADE,
        related_name="practice_portfolios",
    )
    portfolio_name = models.CharField(max_length=100, default="My Practice Portfolio")
    portfolio_type = models.CharField(
        max_length=20,
        choices=PORTFOLIO_TYPE_CHOICES,
        default="custom",
    )
    expected_annual_return = models.DecimalField(max_digits=5, decimal_places=2, default=6.00)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.portfolio_name}"


class PracticePortfolioHolding(models.Model):
    ASSET_TYPE_CHOICES = [
        ("etf", "ETF"),
        ("stock", "Stock"),
        ("bond", "Bond"),
        ("cash", "Cash"),
        ("other", "Other"),
    ]

    portfolio = models.ForeignKey(
        PracticePortfolio,
        on_delete=models.CASCADE,
        related_name="holdings",
    )
    symbol = models.CharField(max_length=20)
    asset_name = models.CharField(max_length=100)
    asset_type = models.CharField(
        max_length=20,
        choices=ASSET_TYPE_CHOICES,
        default="etf",
    )
    allocation_percent = models.DecimalField(max_digits=5, decimal_places=2)
    expected_annual_return = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.portfolio.portfolio_name} - {self.symbol}"