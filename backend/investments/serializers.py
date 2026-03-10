from rest_framework import serializers
from .models import (
    InvestmentGoal,
    PracticePortfolio,
    PracticePortfolioHolding,
)


class PracticePortfolioHoldingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PracticePortfolioHolding
        fields = [
            "id",
            "symbol",
            "asset_name",
            "asset_type",
            "allocation_percent",
            "expected_annual_return",
        ]


class PracticePortfolioSerializer(serializers.ModelSerializer):
    holdings = PracticePortfolioHoldingSerializer(many=True)

    class Meta:
        model = PracticePortfolio
        fields = [
            "id",
            "user",
            "goal",
            "portfolio_name",
            "portfolio_type",
            "expected_annual_return",
            "holdings",
            "created_at",
        ]
        read_only_fields = ["id", "user", "created_at"]

    def create(self, validated_data):
        holdings_data = validated_data.pop("holdings")

        portfolio = PracticePortfolio.objects.create(**validated_data)

        for holding in holdings_data:
            PracticePortfolioHolding.objects.create(
                portfolio=portfolio,
                **holding
            )

        return portfolio


class InvestmentGoalSerializer(serializers.ModelSerializer):
    practice_portfolios = PracticePortfolioSerializer(many=True, read_only=True)

    class Meta:
        model = InvestmentGoal
        fields = [
            "id",
            "user",
            "goal_name",
            "goal_type",
            "target_amount",
            "monthly_contribution",
            "initial_amount",
            "target_date",
            "risk_level",
            "practice_portfolios",
            "created_at",
        ]
        read_only_fields = ["id", "user", "created_at"]