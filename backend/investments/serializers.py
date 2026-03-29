from datetime import date
from rest_framework import serializers
from .models import InvestmentGoal, PracticePortfolio, PracticePortfolioHolding, MLRecommendation


class PracticePortfolioHoldingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PracticePortfolioHolding
        fields = ["id", "symbol", "asset_name", "asset_type", "allocation_percent", "expected_annual_return"]
        read_only_fields = ["id"]


class PracticePortfolioSerializer(serializers.ModelSerializer):
    holdings = PracticePortfolioHoldingSerializer(many=True)

    class Meta:
        model = PracticePortfolio
        fields = ["id", "goal", "portfolio_name", "portfolio_type", "expected_annual_return", "holdings", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_holdings(self, holdings):
        total = sum(float(h.get("allocation_percent", 0)) for h in holdings)
        if abs(total - 100) > 0.5:
            raise serializers.ValidationError(f"Holdings must sum to 100% (got {total:.1f}%)")
        return holdings

    def create(self, validated_data):
        holdings_data = validated_data.pop("holdings", [])
        portfolio = PracticePortfolio.objects.create(**validated_data)
        for h in holdings_data:
            PracticePortfolioHolding.objects.create(portfolio=portfolio, **h)
        return portfolio

    def update(self, instance, validated_data):
        holdings_data = validated_data.pop("holdings", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if holdings_data is not None:
            instance.holdings.all().delete()
            for h in holdings_data:
                PracticePortfolioHolding.objects.create(portfolio=instance, **h)
        return instance


class InvestmentGoalSerializer(serializers.ModelSerializer):
    practice_portfolios = PracticePortfolioSerializer(many=True, read_only=True)

    class Meta:
        model = InvestmentGoal
        fields = [
            "id", "goal_name", "goal_type", "target_amount",
            "monthly_contribution", "initial_amount", "target_date",
            "risk_level", "practice_portfolios", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_target_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Target amount must be positive.")
        return value

    def validate_target_date(self, value):
        if value <= date.today():
            raise serializers.ValidationError("Target date must be in the future.")
        return value


class MLRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MLRecommendation
        fields = ["id", "symbol", "asset_name", "asset_type", "recommendation_score", "risk_score", "reason", "created_at"]
        read_only_fields = ["id", "created_at"]
