import io
import time
import requests
import numpy as np
import pandas as pd
from scipy.optimize import minimize


DYNAMIC_UNIVERSE = {
    "conservative": ["BND", "TLT", "SHY", "VTI", "AGG"],
    "balanced":     ["VTI", "VXUS", "BND", "QQQ", "VEA"],
    "growth":       ["QQQ", "VUG", "VTI", "IWM", "ARKK"],
}


ASSET_NAMES = {
    "BND":  ("Vanguard Total Bond Market ETF", "etf"),
    "TLT":  ("iShares 20+ Year Treasury Bond ETF", "etf"),
    "SHY":  ("iShares 1-3 Year Treasury Bond ETF", "etf"),
    "VTI":  ("Vanguard Total Stock Market ETF", "etf"),
    "AGG":  ("iShares Core US Aggregate Bond ETF", "etf"),
    "VXUS": ("Vanguard Total International Stock ETF", "etf"),
    "QQQ":  ("Invesco QQQ Trust (NASDAQ-100)", "etf"),
    "VEA":  ("Vanguard FTSE Developed Markets ETF", "etf"),
    "VUG":  ("Vanguard Growth ETF", "etf"),
    "IWM":  ("iShares Russell 2000 ETF", "etf"),
    "ARKK": ("ARK Innovation ETF", "etf"),
}


ASSET_COLORS = {
    "BND":  "#4f86c6",
    "TLT":  "#6c5ce7",
    "SHY":  "#00b894",
    "VTI":  "#e17055",
    "AGG":  "#0984e3",
    "VXUS": "#fd79a8",
    "QQQ":  "#6366f1",
    "VEA":  "#fdcb6e",
    "VUG":  "#e84393",
    "IWM":  "#55efc4",
    "ARKK": "#d63031",
}


STOOQ_HEADERS = {"User-Agent": "Mozilla/5.0"}


def stooq_fetch(symbol: str, retries: int = 2):
    # ✅ FIX: Removed .us suffix — it breaks ETF lookups on Stooq
    stooq_symbol = symbol.lower()

    for attempt in range(retries + 1):
        try:
            r = requests.get(
                "https://stooq.com/q/d/l/",
                params={"s": stooq_symbol, "i": "d"},
                timeout=10,
                headers=STOOQ_HEADERS,
            )
            return r
        except requests.exceptions.RequestException:
            if attempt < retries:
                time.sleep(1.5 * (attempt + 1))
    return None


def fetch_price_history(symbols, period="1y"):
    if isinstance(symbols, str):
        symbols = [symbols]
    if isinstance(symbols, tuple):
        symbols = list(symbols)

    all_data = {}
    period_map = {
        "1mo": 30, "3mo": 90, "6mo": 180,
        "1y": 365, "2y": 730, "5y": 1825,
    }
    days = period_map.get(period, 365)
    cutoff = pd.Timestamp.now() - pd.DateOffset(days=days)

    for symbol in symbols:
        # ✅ FIX: Removed .us suffix here too
        stooq_symbol = symbol.lower()

        try:
            r = requests.get(
                "https://stooq.com/q/d/l/",
                params={"s": stooq_symbol, "i": "d"},
                timeout=15,
                headers=STOOQ_HEADERS,
            )
            if (
                r.status_code != 200
                or "No data" in r.text
                or "<html" in r.text.lower()
                or len(r.text) < 50
            ):
                print(f"[fetch_price_history] No data for {symbol}")
                continue

            df = pd.read_csv(io.StringIO(r.text))
            df["Date"] = pd.to_datetime(df["Date"])
            df = df.set_index("Date").sort_index()
            df = df[df.index >= cutoff]

            if df.empty or "Close" not in df.columns:
                continue

            all_data[symbol] = df["Close"].astype(float)
            time.sleep(0.5)

        except Exception as e:
            print(f"[fetch_price_history] Failed {symbol}: {e}")
            continue

    if not all_data:
        return pd.DataFrame()

    result = pd.DataFrame(all_data)
    result = result.ffill().dropna()
    return result


def fetch_available_symbols(risk_level, period="1y"):
    candidates = DYNAMIC_UNIVERSE.get(risk_level, DYNAMIC_UNIVERSE["balanced"])
    prices = fetch_price_history(candidates, period=period)
    available = list(prices.columns)
    return available, prices[available] if available else pd.DataFrame()


def compute_stats(prices):
    daily = prices.pct_change().dropna()
    expected_returns = daily.mean() * 252
    cov_matrix = daily.cov() * 252
    return expected_returns, cov_matrix


def min_volatility_weights(expected_returns, cov_matrix):
    n = len(expected_returns)
    result = minimize(
        lambda w: np.sqrt(w @ cov_matrix.values @ w),
        x0=np.ones(n) / n,
        method="SLSQP",
        bounds=[(0.05, 0.60)] * n,
        constraints=[{"type": "eq", "fun": lambda w: np.sum(w) - 1}],
    )
    return result.x if result.success else np.ones(n) / n


def max_sharpe_weights(expected_returns, cov_matrix, risk_free=0.04):
    n = len(expected_returns)

    def neg_sharpe(w):
        ret = w @ expected_returns.values
        vol = np.sqrt(w @ cov_matrix.values @ w)
        return -(ret - risk_free) / (vol + 1e-9)

    result = minimize(
        neg_sharpe,
        x0=np.ones(n) / n,
        method="SLSQP",
        bounds=[(0.05, 0.60)] * n,
        constraints=[{"type": "eq", "fun": lambda w: np.sum(w) - 1}],
    )
    return result.x if result.success else np.ones(n) / n


def max_return_weights(expected_returns, cov_matrix, vol_cap=0.25):
    n = len(expected_returns)
    result = minimize(
        lambda w: -(w @ expected_returns.values),
        x0=np.ones(n) / n,
        method="SLSQP",
        bounds=[(0.05, 0.60)] * n,
        constraints=[
            {"type": "eq",   "fun": lambda w: np.sum(w) - 1},
            {"type": "ineq", "fun": lambda w: vol_cap - np.sqrt(w @ cov_matrix.values @ w)},
        ],
    )
    return result.x if result.success else np.ones(n) / n


OPTIMIZER_MAP = {
    "conservative": min_volatility_weights,
    "balanced":     max_sharpe_weights,
    "growth":       max_return_weights,
}


def generate_portfolio(risk_level):
    try:
        symbols, prices = fetch_available_symbols(risk_level)
        if len(symbols) < 2:
            raise ValueError("Not enough live data returned.")

        expected_returns, cov_matrix = compute_stats(prices)
        optimizer = OPTIMIZER_MAP.get(risk_level, max_sharpe_weights)
        raw_weights = optimizer(expected_returns, cov_matrix)

        allocations = np.round(raw_weights * 100).astype(int)
        allocations[np.argmax(raw_weights)] += 100 - allocations.sum()

        holdings = []
        for symbol, alloc, exp_ret in zip(symbols, allocations, expected_returns.values):
            name, asset_type = ASSET_NAMES.get(symbol, (symbol, "etf"))
            holdings.append({
                "symbol": symbol,
                "asset_name": name,
                "asset_type": asset_type,
                "allocation_percent": int(alloc),
                "expected_annual_return": round(float(exp_ret) * 100, 2),
            })

        blended = sum(
            h["allocation_percent"] / 100 * h["expected_annual_return"]
            for h in holdings
        )
        return {
            "holdings": holdings,
            "expected_return": round(blended, 2),
            "method": "optimized",
        }

    except Exception as e:
        raise RuntimeError(f"Could not generate portfolio from live data: {e}")