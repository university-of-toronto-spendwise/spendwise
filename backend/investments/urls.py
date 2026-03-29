from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InvestmentGoalViewSet, PracticePortfolioViewSet, MLRecommendationsViewSet,
    AssetPerformanceAPIView, AssetSearchAPIView,
    AssetDetailAPIView, AssetChartAPIView, RecommendationsAPIView,
)

app_name = "investments"

router = DefaultRouter()
router.register(r"goals", InvestmentGoalViewSet, basename="goal")
router.register(r"portfolios", PracticePortfolioViewSet, basename="portfolio")
router.register(r"ml", MLRecommendationsViewSet, basename="ml")

urlpatterns = [
    path("", include(router.urls)),
    path("assets/performance/", AssetPerformanceAPIView.as_view(), name="asset-performance"),
    path("assets/search/",      AssetSearchAPIView.as_view(),      name="asset-search"),
    path("assets/detail/",      AssetDetailAPIView.as_view(),      name="asset-detail"),
    path("assets/chart/",       AssetChartAPIView.as_view(),       name="asset-chart"),
    path("recommendations/",    RecommendationsAPIView.as_view(),  name="recommendations"),
]
