from decimal import Decimal
import statistics
import requests
from django.conf import settings
from django.core.cache import cache
from rest_framework import viewsets, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import InvestmentGoal, PracticePortfolio, MLRecommendation
from .serializers import (
    InvestmentGoalSerializer,
    PracticePortfolioSerializer,
    MLRecommendationSerializer,
)
from .portfolio_optimizer import generate_portfolio

AV_BASE = "https://www.alphavantage.co/query"

CACHE_TTL = 60 * 60
DETAIL_CACHE_TTL = 60 * 30
CHART_CACHE_TTL = 60 * 30
RECS_CACHE_TTL = 60 * 60

PERIOD_MAP = {
    "1d":  ("TIME_SERIES_INTRADAY", "5min",  "compact"),
    "5d":  ("TIME_SERIES_INTRADAY", "60min", "full"),
    "1mo": ("TIME_SERIES_DAILY",    None,    "compact"),
    "3mo": ("TIME_SERIES_DAILY",    None,    "full"),
    "6mo": ("TIME_SERIES_DAILY",    None,    "full"),
    "1y":  ("TIME_SERIES_WEEKLY",   None,    "full"),
    "2y":  ("TIME_SERIES_WEEKLY",   None,    "full"),
    "5y":  ("TIME_SERIES_MONTHLY",  None,    "full"),
}

PERIOD_SLICE = {
    "1d": 78,
    "5d": 40,
    "1mo": 22,
    "3mo": 63,
    "6mo": 126,
    "1y": 52,
    "2y": 104,
    "5y": 60,
}

TS_KEY_MAP = {
    "TIME_SERIES_INTRADAY": lambda interval: f"Time Series ({interval})",
    "TIME_SERIES_DAILY": lambda _: "Time Series (Daily)",
    "TIME_SERIES_WEEKLY": lambda _: "Weekly Time Series",
    "TIME_SERIES_MONTHLY": lambda _: "Monthly Time Series",
}

ASSET_CATALOG = {
    "AAPL": ("Apple Inc.", "stock"),
    "MSFT": ("Microsoft Corporation", "stock"),
    "TSLA": ("Tesla, Inc.", "stock"),
    "NVDA": ("NVIDIA Corporation", "stock"),
    "AMZN": ("Amazon.com, Inc.", "stock"),
    "META": ("Meta Platforms, Inc.", "stock"),
    "GOOG": ("Alphabet Inc. Class C", "stock"),
    "GOOGL": ("Alphabet Inc. Class A", "stock"),
    "VTI": ("Vanguard Total Stock Market ETF", "etf"),
    "QQQ": ("Invesco QQQ Trust", "etf"),
    "BND": ("Vanguard Total Bond Market ETF", "etf"),
    "VXUS": ("Vanguard Total International Stock ETF", "etf"),
    "VEA": ("Vanguard FTSE Developed Markets ETF", "etf"),
    "VUG": ("Vanguard Growth ETF", "etf"),
    "IWM": ("iShares Russell 2000 ETF", "etf"),
    "AGG": ("iShares Core U.S. Aggregate Bond ETF", "etf"),
    "TLT": ("iShares 20+ Year Treasury Bond ETF", "etf"),
    "SHY": ("iShares 1-3 Year Treasury Bond ETF", "etf"),
    "ARKK": ("ARK Innovation ETF", "etf"),
    "SPY": ("SPDR S&P 500 ETF Trust", "etf"),
}

RECOMMENDATION_PRESETS = {
    "conservative": [
        {
            "symbol": "BND",
            "asset_name": "Vanguard Total Bond Market ETF",
            "asset_type": "etf",
            "recommendation_score": 82.0,
            "risk_score": 22.0,
            "expected_return": 4.5,
            "reason": "Broad bond exposure with lower volatility for capital preservation.",
        },
        {
            "symbol": "AGG",
            "asset_name": "iShares Core U.S. Aggregate Bond ETF",
            "asset_type": "etf",
            "recommendation_score": 79.0,
            "risk_score": 24.0,
            "expected_return": 4.3,
            "reason": "Diversified bond mix suitable for conservative goals.",
        },
        {
            "symbol": "SHY",
            "asset_name": "iShares 1-3 Year Treasury Bond ETF",
            "asset_type": "etf",
            "recommendation_score": 76.0,
            "risk_score": 12.0,
            "expected_return": 3.8,
            "reason": "Short-duration treasury exposure with relatively low risk.",
        },
    ],
    "balanced": [
        {
            "symbol": "VTI",
            "asset_name": "Vanguard Total Stock Market ETF",
            "asset_type": "etf",
            "recommendation_score": 88.0,
            "risk_score": 55.0,
            "expected_return": 8.5,
            "reason": "Broad U.S. market exposure with strong long-run diversification.",
        },
        {
            "symbol": "VXUS",
            "asset_name": "Vanguard Total International Stock ETF",
            "asset_type": "etf",
            "recommendation_score": 81.0,
            "risk_score": 58.0,
            "expected_return": 7.4,
            "reason": "Adds international diversification to reduce concentration risk.",
        },
        {
            "symbol": "BND",
            "asset_name": "Vanguard Total Bond Market ETF",
            "asset_type": "etf",
            "recommendation_score": 77.0,
            "risk_score": 22.0,
            "expected_return": 4.5,
            "reason": "Stabilizes a balanced portfolio with bond exposure.",
        },
        {
            "symbol": "QQQ",
            "asset_name": "Invesco QQQ Trust",
            "asset_type": "etf",
            "recommendation_score": 75.0,
            "risk_score": 68.0,
            "expected_return": 10.2,
            "reason": "Growth tilt through large-cap technology exposure.",
        },
    ],
    "growth": [
        {
            "symbol": "QQQ",
            "asset_name": "Invesco QQQ Trust",
            "asset_type": "etf",
            "recommendation_score": 90.0,
            "risk_score": 68.0,
            "expected_return": 10.2,
            "reason": "Strong growth-oriented exposure to major tech companies.",
        },
        {
            "symbol": "VUG",
            "asset_name": "Vanguard Growth ETF",
            "asset_type": "etf",
            "recommendation_score": 86.0,
            "risk_score": 64.0,
            "expected_return": 9.6,
            "reason": "Focused large-cap growth exposure for long-term appreciation.",
        },
        {
            "symbol": "IWM",
            "asset_name": "iShares Russell 2000 ETF",
            "asset_type": "etf",
            "recommendation_score": 78.0,
            "risk_score": 72.0,
            "expected_return": 9.0,
            "reason": "Adds small-cap upside potential for aggressive investors.",
        },
        {
            "symbol": "ARKK",
            "asset_name": "ARK Innovation ETF",
            "asset_type": "etf",
            "recommendation_score": 70.0,
            "risk_score": 85.0,
            "expected_return": 11.5,
            "reason": "High-risk thematic innovation exposure for growth-focused portfolios.",
        },
    ],
}


def _av(params):
    api_key = getattr(settings, "ALPHA_VANTAGE_API_KEY", "")
    if not api_key:
        raise ValueError("ALPHA_VANTAGE_API_KEY is not configured.")
    params["apikey"] = api_key
    r = requests.get(AV_BASE, params=params, timeout=12)
    r.raise_for_status()
    return r.json()


def _safe_float(val, default=None):
    try:
        return round(float(val), 2)
    except (TypeError, ValueError):
        return default


def _check_rate_limit(data):
    if "Information" in data or "Note" in data:
        return data.get("Information") or data.get("Note")
    return None


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

    @action(detail=False, methods=["post"], url_path="generate")
    def generate(self, request):
        goal_id = request.data.get("goal_id")
        risk_level = request.data.get("risk_level", "balanced")

        if risk_level not in ("conservative", "balanced", "growth"):
            return Response({"error": "Invalid risk_level."}, status=400)

        try:
            goal = InvestmentGoal.objects.get(id=goal_id, user=request.user)
        except InvestmentGoal.DoesNotExist:
            return Response({"error": "Goal not found."}, status=404)

        try:
            result = generate_portfolio(risk_level)
        except RuntimeError as e:
            return Response({"error": str(e)}, status=503)

        return Response(
            {"goal_id": goal.id, "risk_level": risk_level, **result},
            status=200,
        )


class MLRecommendationsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        qs = MLRecommendation.objects.filter(user=request.user).order_by("-created_at")
        return Response(MLRecommendationSerializer(qs, many=True).data)

    @action(detail=False, methods=["post"], url_path="generate")
    def generate(self, request):
        risk_level = request.data.get("risk_level", "balanced")

        if risk_level not in ("conservative", "balanced", "growth"):
            return Response({"error": "Invalid risk_level."}, status=400)

        preset = RECOMMENDATION_PRESETS[risk_level]

        MLRecommendation.objects.filter(user=request.user).delete()
        created = []
        risk_map = {"conservative": "0.2500", "balanced": "0.5000", "growth": "0.7500"}

        for item in preset:
            rec = MLRecommendation.objects.create(
                user=request.user,
                symbol=item["symbol"],
                asset_name=item["asset_name"],
                asset_type=item["asset_type"],
                recommendation_score=Decimal(str(round(item["recommendation_score"] / 100, 4))),
                risk_score=Decimal(risk_map[risk_level]),
                reason=item["reason"],
            )
            created.append(rec)

        return Response(
            {
                "risk_level": risk_level,
                "method": "preset",
                "expected_return": round(
                    sum(item["expected_return"] for item in preset) / max(len(preset), 1), 2
                ),
                "recommendations": MLRecommendationSerializer(created, many=True).data,
                "holdings": preset,
            },
            status=200,
        )


class AssetSearchAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = (request.GET.get("q", "") or "").strip().upper()
        if not query:
            return Response([])

        cache_key = f"asset_search_{query}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        results = []

        if query in ASSET_CATALOG:
            name, asset_type = ASSET_CATALOG[query]
            results.append({
                "symbol": query,
                "name": name,
                "type": asset_type,
                "exchange": "US",
                "current_price": None,
            })

        for symbol, (name, asset_type) in ASSET_CATALOG.items():
            if symbol.startswith(query) and symbol != query:
                results.append({
                    "symbol": symbol,
                    "name": name,
                    "type": asset_type,
                    "exchange": "US",
                    "current_price": None,
                })

        cache.set(cache_key, results, CACHE_TTL)
        return Response(results, status=200)


class AssetDetailAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        symbol = (request.GET.get("symbol", "") or "").strip().upper()
        if not symbol:
            return Response({"error": "symbol required"}, status=400)

        cache_key = f"asset_detail_{symbol}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            weekly = _av({"function": "TIME_SERIES_WEEKLY", "symbol": symbol})

            err = _check_rate_limit(weekly)
            if err:
                return Response(
                    {"error": "Alpha Vantage rate limit reached. Try again later."},
                    status=429,
                )

            ts = weekly.get("Weekly Time Series", {})
            if not ts:
                return Response({"error": f"No data found for '{symbol}'"}, status=404)

            closes = [
                _safe_float(v.get("4. close"))
                for v in list(ts.values())[:52]
                if v.get("4. close")
            ]

            current_price = closes[0] if closes else None
            return_1y = None
            volatility = None

            if len(closes) >= 2 and closes[-1]:
                return_1y = round(((closes[0] - closes[-1]) / closes[-1]) * 100, 2)

            if len(closes) >= 3:
                weekly_returns = [
                    (closes[i] - closes[i + 1]) / closes[i + 1]
                    for i in range(len(closes) - 1)
                    if closes[i + 1]
                ]
                if len(weekly_returns) >= 2:
                    volatility = round(statistics.stdev(weekly_returns) * (52 ** 0.5) * 100, 2)

            catalog_name, catalog_type = ASSET_CATALOG.get(symbol, (symbol, "etf"))

            data = {
                "symbol": symbol,
                "name": catalog_name,
                "asset_type": catalog_type,
                "current_price": current_price,
                "currency": "USD",
                "expected_return": return_1y,
                "volatility": volatility,
                "return_1y": return_1y,
            }
            cache.set(cache_key, data, DETAIL_CACHE_TTL)
            return Response(data, status=200)

        except requests.exceptions.Timeout:
            return Response({"error": "Alpha Vantage timed out. Try again."}, status=504)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class AssetChartAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        symbol = (request.GET.get("symbol", "") or "").strip().upper()
        period = request.GET.get("period", "1y")

        if not symbol:
            return Response({"chart": []}, status=200)

        cache_key = f"asset_chart_{symbol}_{period}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            func, interval, outputsize = PERIOD_MAP.get(period, ("TIME_SERIES_WEEKLY", None, "full"))
            params = {
                "function": func,
                "symbol": symbol,
                "outputsize": outputsize,
            }
            if interval:
                params["interval"] = interval

            data = _av(params)

            err = _check_rate_limit(data)
            if err:
                return Response(
                    {"chart": [], "error": "Alpha Vantage rate limit reached."},
                    status=429,
                )

            ts_key = TS_KEY_MAP[func](interval)
            ts = data.get(ts_key, {})

            if not ts:
                return Response({"chart": []}, status=200)

            sorted_dates = sorted(ts.keys())
            sliced_dates = sorted_dates[-PERIOD_SLICE.get(period, 52):]

            chart = []
            for date in sliced_dates:
                close_price = _safe_float(ts[date].get("4. close"))
                if close_price is not None:
                    chart.append({
                        "date": date,
                        "price": close_price,
                    })

            payload = {"chart": chart}
            cache.set(cache_key, payload, CHART_CACHE_TTL)
            return Response(payload, status=200)

        except requests.exceptions.Timeout:
            return Response({"chart": [], "error": "Alpha Vantage timed out."}, status=504)
        except Exception as e:
            return Response({"chart": [], "error": str(e)}, status=500)


class AssetPerformanceAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {"error": "Asset performance comparison is disabled in the Alpha Vantage version."},
            status=501,
        )


class RecommendationsAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        risk_level = (request.GET.get("risk_level", "balanced") or "balanced").lower()
        if risk_level not in {"conservative", "balanced", "growth"}:
            return Response({"error": "Invalid risk_level."}, status=400)

        cache_key = f"recommendations_{risk_level}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached, status=200)

        data = RECOMMENDATION_PRESETS[risk_level]
        cache.set(cache_key, data, RECS_CACHE_TTL)
        return Response(data, status=200)