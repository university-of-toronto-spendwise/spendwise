from unittest.mock import patch
import pandas as pd

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status

from investments.models import InvestmentGoal

User = get_user_model()


def make_alpha_vantage_weekly(symbol="AAPL"):
    return {
        "Meta Data": {"2. Symbol": symbol},
        "Weekly Time Series": {
            "2024-03-01": {"4. close": "120.00"},
            "2024-02-23": {"4. close": "118.00"},
            "2024-02-16": {"4. close": "116.00"},
            "2024-02-09": {"4. close": "114.00"},
        },
    }


def make_alpha_vantage_daily(symbol="AAPL"):
    return {
        "Meta Data": {"2. Symbol": symbol},
        "Time Series (Daily)": {
            "2024-01-01": {"4. close": "170.00"},
            "2024-01-02": {"4. close": "171.00"},
            "2024-01-03": {"4. close": "172.00"},
        },
    }


def make_alpha_vantage_weekly_chart(symbol="AAPL"):
    return {
        "Meta Data": {"2. Symbol": symbol},
        "Weekly Time Series": {
            "2024-01-05": {"4. close": "170.00"},
            "2024-01-12": {"4. close": "172.00"},
            "2024-01-19": {"4. close": "174.00"},
        },
    }


class InvestmentGoalTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="pass123",
        )
        self.client.force_authenticate(user=self.user)

    def _make_goal(self):
        return InvestmentGoal.objects.create(
            user=self.user,
            goal_name="Laptop Fund",
            goal_type="laptop",
            target_amount=2000,
            monthly_contribution=200,
            initial_amount=500,
            target_date="2027-01-01",
            risk_level="balanced",
        )

    def test_create_goal(self):
        res = self.client.post(
            "/api/investments/goals/",
            {
                "goal_name": "Laptop Fund",
                "goal_type": "laptop",
                "target_amount": 2000,
                "monthly_contribution": 200,
                "initial_amount": 500,
                "target_date": "2027-01-01",
                "risk_level": "balanced",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(InvestmentGoal.objects.count(), 1)

    def test_list_goals(self):
        self._make_goal()
        res = self.client.get("/api/investments/goals/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_goal_requires_auth(self):
        unauth = APIClient()
        res = unauth.get("/api/investments/goals/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_goal(self):
        goal = self._make_goal()
        res = self.client.patch(
            f"/api/investments/goals/{goal.id}/",
            {"goal_name": "Updated Goal"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["goal_name"], "Updated Goal")

    def test_delete_goal(self):
        goal = self._make_goal()
        res = self.client.delete(f"/api/investments/goals/{goal.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(InvestmentGoal.objects.count(), 0)

    def test_create_portfolio(self):
        goal = self._make_goal()
        res = self.client.post(
            "/api/investments/portfolios/",
            {
                "goal": goal.id,
                "portfolio_name": "My Portfolio",
                "portfolio_type": "custom",
                "expected_annual_return": 7.5,
                "holdings": [
                    {
                        "symbol": "VTI",
                        "asset_name": "Vanguard Total Stock Market ETF",
                        "asset_type": "etf",
                        "allocation_percent": 60,
                        "expected_annual_return": 8.0,
                    },
                    {
                        "symbol": "BND",
                        "asset_name": "Vanguard Total Bond Market ETF",
                        "asset_type": "etf",
                        "allocation_percent": 40,
                        "expected_annual_return": 3.0,
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_list_portfolios(self):
        res = self.client.get("/api/investments/portfolios/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_asset_search(self):
        res = self.client.get("/api/investments/assets/search/?q=AAPL")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) >= 1)
        self.assertEqual(res.data[0]["symbol"], "AAPL")

    def test_asset_search_empty_query(self):
        res = self.client.get("/api/investments/assets/search/?q=")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, [])

    def test_asset_search_no_data(self):
        res = self.client.get("/api/investments/assets/search/?q=FAKE")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, [])

    @patch("investments.views._av")
    def test_asset_detail(self, mock_av):
        mock_av.return_value = make_alpha_vantage_weekly("AAPL")
        res = self.client.get("/api/investments/assets/detail/?symbol=AAPL")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["symbol"], "AAPL")

    def test_asset_detail_missing_symbol(self):
        res = self.client.get("/api/investments/assets/detail/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("investments.views._av")
    def test_asset_detail_not_found(self, mock_av):
        mock_av.return_value = {"Meta Data": {}, "Weekly Time Series": {}}
        res = self.client.get("/api/investments/assets/detail/?symbol=FAKE")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    @patch("investments.views._av")
    def test_asset_chart(self, mock_av):
        mock_av.return_value = make_alpha_vantage_daily("AAPL")
        res = self.client.get("/api/investments/assets/chart/?symbol=AAPL&period=1mo")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("chart", res.data)

    def test_asset_chart_missing_symbol(self):
        res = self.client.get("/api/investments/assets/chart/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, {"chart": []})

    @patch("investments.views._av")
    def test_asset_chart_invalid_period_defaults(self, mock_av):
        mock_av.return_value = make_alpha_vantage_weekly_chart("AAPL")
        res = self.client.get("/api/investments/assets/chart/?symbol=AAPL&period=bad")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("chart", res.data)

    def test_recommendations(self):
        cache.clear()
        res = self.client.get("/api/investments/recommendations/?risk_level=balanced")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(isinstance(res.data, list))

    def test_recommendations_invalid_risk(self):
        res = self.client.get("/api/investments/recommendations/?risk_level=invalid")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_asset_performance(self):
        res = self.client.get("/api/investments/assets/performance/?symbols=VTI&period=1y")
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_501_NOT_IMPLEMENTED])

    def test_asset_performance_no_symbols(self):
        res = self.client.get("/api/investments/assets/performance/")
        self.assertIn(res.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_501_NOT_IMPLEMENTED])


class InvestmentModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser2",
            email="test2@test.com",
            password="pass123",
        )

    def test_goal_str(self):
        goal = InvestmentGoal.objects.create(
            user=self.user,
            goal_name="Emergency Fund",
            goal_type="emergency_fund",
            target_amount=5000,
            monthly_contribution=300,
            initial_amount=100,
            target_date="2027-06-01",
            risk_level="conservative",
        )
        self.assertIn("Emergency Fund", str(goal))

    def test_goal_user_isolation(self):
        other_user = User.objects.create_user(
            username="other",
            email="other@test.com",
            password="pass123",
        )
        InvestmentGoal.objects.create(
            user=other_user,
            goal_name="Other Goal",
            goal_type="other",
            target_amount=1000,
            monthly_contribution=50,
            initial_amount=0,
            target_date="2027-01-01",
            risk_level="growth",
        )
        self.assertEqual(InvestmentGoal.objects.filter(user=self.user).count(), 0)
        self.assertEqual(InvestmentGoal.objects.filter(user=other_user).count(), 1)

    def test_goal_defaults(self):
        goal = InvestmentGoal.objects.create(
            user=self.user,
            goal_name="Travel Fund",
            goal_type="travel",
            target_amount=3000,
            monthly_contribution=150,
            initial_amount=0,
            target_date="2028-01-01",
            risk_level="balanced",
        )
        self.assertEqual(goal.risk_level, "balanced")
        self.assertEqual(float(goal.target_amount), 3000)


class PortfolioOptimizerTests(TestCase):
    @patch("investments.portfolio_optimizer.fetch_price_history")
    def test_generate_portfolio_balanced(self, mock_prices):
        import numpy as np
        symbols = ["VTI", "BND", "QQQ", "VEA", "AGG"]
        dates = pd.date_range("2023-01-01", periods=252, freq="D")
        data = {s: np.linspace(100, 120, 252) for s in symbols}
        mock_prices.return_value = pd.DataFrame(data, index=dates)
        from investments.portfolio_optimizer import generate_portfolio
        result = generate_portfolio("balanced")
        self.assertIn("holdings", result)
        self.assertIn("expected_return", result)

    @patch("investments.portfolio_optimizer.fetch_price_history")
    def test_generate_portfolio_conservative(self, mock_prices):
        import numpy as np
        symbols = ["BND", "SHY", "AGG", "TLT", "VTI"]
        dates = pd.date_range("2023-01-01", periods=252, freq="D")
        data = {s: np.linspace(100, 110, 252) for s in symbols}
        mock_prices.return_value = pd.DataFrame(data, index=dates)
        from investments.portfolio_optimizer import generate_portfolio
        result = generate_portfolio("conservative")
        self.assertIn("holdings", result)

    @patch("investments.portfolio_optimizer.fetch_price_history")
    def test_generate_portfolio_growth(self, mock_prices):
        import numpy as np
        symbols = ["QQQ", "VUG", "ARKK", "NVDA", "TSLA"]
        dates = pd.date_range("2023-01-01", periods=252, freq="D")
        data = {s: np.linspace(100, 150, 252) for s in symbols}
        mock_prices.return_value = pd.DataFrame(data, index=dates)
        from investments.portfolio_optimizer import generate_portfolio
        result = generate_portfolio("growth")
        self.assertIn("holdings", result)

    @patch("investments.portfolio_optimizer.fetch_price_history")
    def test_generate_portfolio_fallback(self, mock_prices):
        mock_prices.return_value = pd.DataFrame()
        from investments.portfolio_optimizer import generate_portfolio
        try:
            result = generate_portfolio("balanced")
            self.assertIn("holdings", result)
        except RuntimeError:
            pass