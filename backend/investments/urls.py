from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvestmentGoalViewSet, PracticePortfolioViewSet

router = DefaultRouter()
router.register(r'goals', InvestmentGoalViewSet, basename='goal')
router.register(r'portfolios', PracticePortfolioViewSet, basename='portfolio')

urlpatterns = [
    path('', include(router.urls)),
]
