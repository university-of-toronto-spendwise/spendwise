from decimal import Decimal
import io
import time
import numpy as np
import requests
from rest_framework import viewsets, serializers, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache

from .models import InvestmentGoal, PracticePortfolio, MLRecommendation
from .serializers import (
    InvestmentGoalSerializer, PracticePortfolioSerializer, MLRecommendationSerializer,
)
from .portfolio_optimizer import generate_portfolio, fetch_price_history, ASSET_NAMES

CACHE_TTL = 60 * 60        # 1 hour
SEARCH_CACHE_TTL = 60 * 30 # 30 mins
RECS_CACHE_TTL = 60 * 60   # 1 hour

STOOQ_HEADERS = {"User-Agent": "Mozilla/5.0"}


def infer_asset_type(symbol: str, asset_type: str = "") -> str:
    at = (asset_type or "").lower()
    if "etf" in at or "fund" in at:
        return "etf"
    if "bond" in at:
        return "bond"
    if (symbol or "").upper() in {"CASH.TO", "SHY"}:
        return "cash"
    return "etf"


def compute_asset_stats(symbol: str, period: str = "1y"):
    cache_key = f"asset_stats_{symbol}_{period}"
    cached = cache.get(cache_key)
    if cached:
        return cached
    try:
        prices = fetch_price_history([symbol], period=period)
        if prices.empty or symbol not in prices.columns:
            return 0.0, 0.0, 0.0
        s = prices[symbol].dropna()
        if len(s) < 2:
            return 0.0, 0.0, 0.0
        dr = s.pct_change().dropna()
        result = (
            round(float(dr.mean() * 252 * 100), 2),
            round(float(dr.std() * np.sqrt(252) * 100), 2),
            round(float(((s.iloc[-1] / s.iloc[0]) - 1) * 100), 2),
        )
        cache.set(cache_key, result, CACHE_TTL)
        return result
    except Exception:
        return 0.0, 0.0, 0.0


def stooq_fetch(symbol: str):
    """Fetch latest price data from Stooq for a symbol."""
    stooq_symbol = symbol.lower()
    if "." not in stooq_symbol:
        stooq_symbol = f"{stooq_symbol}.us"
    r = requests.get(
        "https://stooq.com/q/d/l/",
        params={"s": stooq_symbol, "i": "d"},
        timeout=10,
        headers=STOOQ_HEADERS,
    )
    return r


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
        return Response({"goal_id": goal.id, "risk_level": risk_level, **result}, status=200)


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
        try:
            result = generate_portfolio(risk_level)
        except RuntimeError as e:
            return Response({"error": str(e)}, status=503)
        MLRecommendation.objects.filter(user=request.user).delete()
        risk_map = {"conservative": "0.2500", "balanced": "0.5000", "growth": "0.7500"}
        created = []
        for h in result["holdings"]:
            rec = MLRecommendation.objects.create(
                user=request.user,
                symbol=h["symbol"],
                asset_name=h["asset_name"],
                asset_type=h["asset_type"],
                recommendation_score=Decimal(str(round(h["allocation_percent"] / 100, 4))),
                risk_score=Decimal(risk_map[risk_level]),
                reason=f"Optimized for {risk_level} risk. Expected annual return: {h['expected_annual_return']}%.",
            )
            created.append(rec)
        return Response({
            "risk_level": risk_level,
            "method": result["method"],
            "expected_return": result["expected_return"],
            "recommendations": MLRecommendationSerializer(created, many=True).data,
            "holdings": result["holdings"],
        }, status=200)


class AssetSearchAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = (request.query_params.get("q", "") or "").strip()
        if not query:
            return Response([])

        cache_key = f"search_{query.lower()}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        symbol = query.strip().upper()

        try:
            r = stooq_fetch(symbol)

            if r.status_code != 200 or "No data" in r.text or len(r.text) < 50:
                cache.set(cache_key, [], SEARCH_CACHE_TTL)
                return Response([])

            # Get name from ASSET_NAMES if known, else use symbol
            name, asset_type = ASSET_NAMES.get(
                f"{symbol}.US",
                ASSET_NAMES.get(symbol, (symbol, "etf"))
            )

            # Get latest price from CSV
            import pandas as pd
            df = pd.read_csv(io.StringIO(r.text))
            latest_price = float(df["Close"].iloc[-1]) if not df.empty else None

            results = [{
                "symbol": symbol,
                "name": name,
                "type": asset_type,
                "exchange": "US",
                "current_price": latest_price,
            }]

            cache.set(cache_key, results, SEARCH_CACHE_TTL)
            return Response(results, status=200)

        except Exception as e:
            return Response({"error": f"Search failed: {str(e)}"}, status=500)


class AssetDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        symbol = (request.query_params.get("symbol", "") or "").strip().upper()
        if not symbol:
            return Response({"error": "Symbol is required."}, status=400)

        cache_key = f"detail_{symbol}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            import pandas as pd
            r = stooq_fetch(symbol)
            if r.status_code != 200 or "No data" in r.text or len(r.text) < 50:
                return Response({"error": "Asset not found."}, status=404)

            df = pd.read_csv(io.StringIO(r.text))
            latest_price = float(df["Close"].iloc[-1]) if not df.empty else None

            name, asset_type = ASSET_NAMES.get(
                f"{symbol}.US",
                ASSET_NAMES.get(symbol, (symbol, "etf"))
            )

            expected_return, volatility, return_1y = compute_asset_stats(symbol)

            data = {
                "symbol": symbol,
                "name": name,
                "asset_type": asset_type,
                "currency": "USD",
                "current_price": latest_price,
                "market_cap": None,
                "sector": None,
                "industry": None,
                "expected_return": expected_return,
                "volatility": volatility,
                "return_1y": return_1y,
            }
            cache.set(cache_key, data, CACHE_TTL)
            return Response(data, status=200)

        except Exception as e:
            return Response({"error": f"Failed to fetch asset: {str(e)}"}, status=500)


class AssetChartAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        symbol = (request.query_params.get("symbol", "") or "").strip().upper()
        period = request.query_params.get("period", "1y")
        if not symbol:
            return Response({"error": "Symbol is required."}, status=400)
        if period not in ("1mo", "3mo", "6mo", "1y", "2y", "5y"):
            period = "1y"

        cache_key = f"chart_{symbol}_{period}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            prices = fetch_price_history([symbol], period=period)
            if prices.empty or symbol not in prices.columns:
                return Response({"error": "No chart data available."}, status=404)
            s = prices[symbol].dropna()
            data = {
                "symbol": symbol,
                "period": period,
                "chart": [
                    {"date": idx.strftime("%Y-%m-%d"), "price": round(float(p), 2)}
                    for idx, p in s.items()
                ],
            }
            cache.set(cache_key, data, CACHE_TTL)
            return Response(data, status=200)

        except Exception as e:
            return Response({"error": f"Chart failed: {str(e)}"}, status=500)


class AssetPerformanceAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        symbols = [
            s.strip().upper()
            for s in request.query_params.get("symbols", "").split(",")
            if s.strip()
        ]
        period = request.query_params.get("period", "1y")
        if not symbols:
            return Response({"error": "No symbols provided."}, status=400)
        if len(symbols) > 10:
            return Response({"error": "Max 10 symbols at once."}, status=400)

        try:
            prices = fetch_price_history(symbols, period=period)
            if prices.empty:
                return Response({"error": "No data available."}, status=404)
            norm = prices / prices.iloc[0] * 100
            chart_rows = [
                {
                    "date": idx.strftime("%Y-%m-%d"),
                    **{sym: round(float(norm.at[idx, sym]), 2) for sym in norm.columns},
                }
                for idx in norm.index
            ]
            summary = []
            for sym in prices.columns:
                s = prices[sym].dropna()
                if len(s) < 2:
                    continue
                dr = s.pct_change().dropna()
                summary.append({
                    "symbol": sym,
                    "start_price": round(float(s.iloc[0]), 2),
                    "current_price": round(float(s.iloc[-1]), 2),
                    "total_return_percent": round(float(((s.iloc[-1] / s.iloc[0]) - 1) * 100), 2),
                    "annualized_volatility_percent": round(float(dr.std() * np.sqrt(252) * 100), 2),
                })
            return Response({"period": period, "chart": chart_rows, "summary": summary}, status=200)

        except Exception as e:
            return Response({"error": f"Failed: {str(e)}"}, status=500)


class RecommendationsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        risk_level = (request.query_params.get("risk_level", "balanced") or "balanced").lower()
        if risk_level not in {"conservative", "balanced", "growth"}:
            return Response({"error": "Invalid risk_level."}, status=400)

        cache_key = f"recs_{risk_level}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            result = generate_portfolio(risk_level)
        except RuntimeError:
            return Response([], status=200)

        scored = []
        for h in result["holdings"]:
            symbol = h["symbol"]
            try:
                prices = fetch_price_history([symbol], period="1y")
                if prices.empty or symbol not in prices.columns:
                    continue
                s = prices[symbol].dropna()
                if len(s) < 30:
                    continue
                dr = s.pct_change().dropna()
                annual_return = float(dr.mean() * 252 * 100)
                volatility = float(dr.std() * np.sqrt(252) * 100)
                total_1y = float(((s.iloc[-1] / s.iloc[0]) - 1) * 100)
                max_dd = abs(float(((s / s.cummax()) - 1).min()) * 100)

                if risk_level == "conservative":
                    score = (0.30 * annual_return) - (0.50 * volatility) - (0.20 * max_dd)
                elif risk_level == "balanced":
                    score = (0.50 * annual_return) - (0.30 * volatility) - (0.20 * max_dd)
                else:
                    score = (0.70 * annual_return) - (0.20 * volatility) - (0.10 * max_dd)

                scored.append({
                    "symbol": symbol,
                    "asset_name": h["asset_name"],
                    "asset_type": h["asset_type"],
                    "recommendation_score": round(score, 2),
                    "risk_score": round(volatility, 2),
                    "expected_return": round(annual_return, 2),
                    "reason": f"1Y return {total_1y:.2f}%, volatility {volatility:.2f}%, max drawdown {max_dd:.2f}%.",
                })
            except Exception:
                continue

        scored.sort(key=lambda x: x["recommendation_score"], reverse=True)
        cache.set(cache_key, scored, RECS_CACHE_TTL)
        return Response(scored[:10], status=200)
