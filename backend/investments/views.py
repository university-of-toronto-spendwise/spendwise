from rest_framework import viewsets, serializers
from rest_framework.permissions import IsAuthenticated
from .models import InvestmentGoal, PracticePortfolio
from .serializers import InvestmentGoalSerializer, PracticePortfolioSerializer


class InvestmentGoalViewSet(viewsets.ModelViewSet):
    serializer_class = InvestmentGoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return InvestmentGoal.objects.filter(user=self.request.user).prefetch_related(
            "practice_portfolios__holdings"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PracticePortfolioViewSet(viewsets.ModelViewSet):
    serializer_class = PracticePortfolioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PracticePortfolio.objects.filter(user=self.request.user).select_related(
            "goal"
        ).prefetch_related("holdings")

    def perform_create(self, serializer):
        goal = serializer.validated_data["goal"]

        if goal.user != self.request.user:
            raise serializers.ValidationError(
                {"goal": "You can only create portfolios for your own goals."}
            )

        serializer.save(user=self.request.user)