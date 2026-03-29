import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, BarChart, Bar,
} from "recharts";
import Navbar from "./Navbar";
import InstructionsModal from "./InstructionsModal";

const API_BASE = "/api";

const PERIOD_OPTIONS = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y"  },
  { label: "2Y", value: "2y"  },
  { label: "5Y", value: "5y"  },
];

const ASSET_META = {
  BND:  { emoji: "🏛️", color: "#4f86c6" },
  TLT:  { emoji: "📜", color: "#6c5ce7" },
  SHY:  { emoji: "🛡️", color: "#00b894" },
  VTI:  { emoji: "🇺🇸", color: "#e17055" },
  AGG:  { emoji: "⚖️", color: "#0984e3" },
  VXUS: { emoji: "🌍", color: "#fd79a8" },
  QQQ:  { emoji: "💻", color: "#6366f1" },
  VEA:  { emoji: "🌐", color: "#fdcb6e" },
  VUG:  { emoji: "🚀", color: "#e84393" },
  IWM:  { emoji: "🏭", color: "#55efc4" },
  ARKK: { emoji: "🔬", color: "#d63031" },
  AAPL: { emoji: "🍎", color: "#555555" },
  TSLA: { emoji: "⚡", color: "#e31937" },
  MSFT: { emoji: "🪟", color: "#00a4ef" },
  AMZN: { emoji: "📦", color: "#ff9900" },
  NVDA: { emoji: "🎮", color: "#76b900" },
  GOOG: { emoji: "🔍", color: "#4285f4" },
  GOOGL:{ emoji: "🔍", color: "#4285f4" },
  META: { emoji: "👾", color: "#0081fb" },
  SPY:  { emoji: "🏦", color: "#2d3436" },
  GLD:  { emoji: "🥇", color: "#f9ca24" },
  BRKB: { emoji: "💼", color: "#6c5ce7" },
};

const PORTFOLIO_BUILDER_STEPS = [
  {
    title: "Understand your goal context",
    description: "The top card shows your goal name, risk preference, target amount and date — pulled automatically from the Goal Planner. This guides which assets are right for you.",
  },
  {
    title: "Browse recommendations",
    description: "Scroll to Recommendations — these are real ETFs ranked by a risk-adjusted performance score (0–100) tailored to your risk level. Higher score = better fit for your profile.",
  },
  {
    title: "Search for specific assets",
    description: "Type an exact ticker symbol (e.g. AAPL, VTI, QQQ) and click Search. You can search for any US-listed stock or ETF.",
  },
  {
    title: "View asset details & chart",
    description: "Click 'View' on any search result to see its current price, expected annual return, volatility, and a price chart. Use the 1D–5Y buttons to explore different time periods.",
  },
  {
    title: "Add assets to your portfolio",
    description: "Click 'Add to Portfolio' on any asset or recommendation. A diversified portfolio typically holds 3–8 assets across different sectors.",
  },
  {
    title: "Set allocations",
    description: "Enter a % for each asset — how much of your portfolio goes into each one. All allocations must add up to exactly 100%. Click 'Auto Balance' to split evenly.",
  },
  {
    title: "Use This Portfolio",
    description: "Once allocations total 100%, click 'Use This Portfolio' to save it and return to the Goal Planner where you'll see your projected growth chart.",
  },
];

function getAssetEmoji(symbol) {
  const clean = symbol?.replace(/\.US$/i, "").toUpperCase();
  return ASSET_META[clean]?.emoji || "📊";
}

function getAssetColor(symbol) {
  const clean = symbol?.replace(/\.US$/i, "").toUpperCase();
  return ASSET_META[clean]?.color || "#6366f1";
}

function getAuthHeaders() {
  const token =
    sessionStorage.getItem("userAccessToken") ||
    sessionStorage.getItem("userToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function readGoalDraft() {
  try {
    const raw = sessionStorage.getItem("goalDraft");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function readPortfolioDraft() {
  try {
    const raw = sessionStorage.getItem("portfolioDraft");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.holdings) ? parsed : null;
  } catch { return null; }
}

function getAssetType(asset = {}) {
  const raw = String(asset.type || asset.asset_type || "").toLowerCase();
  if (raw.includes("etf") || raw.includes("fund")) return "etf";
  if (raw.includes("bond")) return "bond";
  if (raw.includes("cash")) return "cash";
  return "stock";
}

function buildPortfolioObject(holdings, riskLevel = "Custom", name = "My Portfolio") {
  const cleanHoldings = holdings.map((h) => ({
    symbol: h.symbol, name: h.name, type: h.type,
    allocation: Number(h.allocation || 0),
    expectedReturn: Number(h.expectedReturn || 0),
  }));
  const expectedReturn = cleanHoldings.reduce(
    (sum, h) => sum + (h.allocation / 100) * h.expectedReturn, 0
  );
  return {
    id: "custom_draft", name, type: "custom",
    risk: riskLevel || "Custom",
    expectedReturn: Number(expectedReturn.toFixed(2)),
    holdings: cleanHoldings,
  };
}

function normalizeScores(recs) {
  if (!recs.length) return recs;
  const scores = recs.map((r) => Number(r.recommendation_score));
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;
  return recs.map((r) => ({
    ...r,
    display_score: Math.round(((Number(r.recommendation_score) - min) / range) * 100),
  }));
}

export default function PortfolioBuilder() {
  const navigate = useNavigate();

  const [goalDraft, setGoalDraft] = useState(readGoalDraft());
  const [portfolioName, setPortfolioName] = useState("My Portfolio");
  const [showInstructions, setShowInstructions] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetChart, setAssetChart] = useState([]);
  const [chartPeriod, setChartPeriod] = useState("1y");
  const [chartLoading, setChartLoading] = useState(false);

  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const [holdings, setHoldings] = useState([]);

  useEffect(() => {
    setGoalDraft(readGoalDraft());
    const draft = readPortfolioDraft();
    if (draft?.holdings?.length) {
      setHoldings(draft.holdings.map((h) => ({
        symbol: h.symbol, name: h.name, type: h.type,
        allocation: Number(h.allocation || 0),
        expectedReturn: Number(h.expectedReturn || 0),
      })));
      setPortfolioName(draft.name || "My Portfolio");
    }
  }, []);

  const portfolioDraft = useMemo(() =>
    buildPortfolioObject(holdings, goalDraft?.riskLevel || "Custom", portfolioName.trim() || "My Portfolio"),
    [holdings, goalDraft, portfolioName]
  );

  useEffect(() => {
    if (holdings.length) sessionStorage.setItem("portfolioDraft", JSON.stringify(portfolioDraft));
  }, [holdings, portfolioDraft]);

  useEffect(() => {
    async function loadRecommendations() {
      try {
        setLoadingRecommendations(true);
        const riskLevel = goalDraft?.riskLevel || "balanced";
        const res = await fetch(
          `${API_BASE}/investments/recommendations/?risk_level=${encodeURIComponent(riskLevel)}`,
          { headers: getAuthHeaders() }
        );
        if (!res.ok) { setRecommendations([]); return; }
        const data = await res.json();
        const raw = Array.isArray(data) ? data : data.results || [];
        setRecommendations(normalizeScores(raw));
      } catch {
        setRecommendations([]);
      } finally {
        setLoadingRecommendations(false);
      }
    }
    loadRecommendations();
  }, [goalDraft]);

  async function handleSearch(e) {
    e?.preventDefault?.();
    if (!searchQuery.trim()) { setSearchResults([]); setSearchError(""); return; }
    try {
      setSearching(true);
      setSearchError("");
      const res = await fetch(
        `${API_BASE}/investments/assets/search/?q=${encodeURIComponent(searchQuery.trim())}`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error("Could not search assets.");
      const data = await res.json();
      const results = Array.isArray(data) ? data : data.results || [];
      if (!results.length) setSearchError(`No results for "${searchQuery}". Try an exact ticker: AAPL, VTI, QQQ, BND.`);
      setSearchResults(results);
    } catch (err) {
      setSearchError(err.message || "Failed to search.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function loadChart(symbol, period) {
    try {
      setChartLoading(true);
      const res = await fetch(
        `${API_BASE}/investments/assets/chart/?symbol=${encodeURIComponent(symbol)}&period=${period}`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAssetChart(Array.isArray(data.chart) ? data.chart : []);
    } catch { setAssetChart([]); }
    finally { setChartLoading(false); }
  }

  async function handlePeriodChange(period) {
    setChartPeriod(period);
    if (selectedAsset) await loadChart(selectedAsset.symbol, period);
  }

  async function loadAsset(symbol) {
    if (!symbol) return;
    try {
      setAssetLoading(true);
      setAssetError("");
      setChartPeriod("1y");
      const [detailRes, chartRes] = await Promise.all([
        fetch(`${API_BASE}/investments/assets/detail/?symbol=${encodeURIComponent(symbol)}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/investments/assets/chart/?symbol=${encodeURIComponent(symbol)}&period=1y`, { headers: getAuthHeaders() }),
      ]);
      if (!detailRes.ok) throw new Error("Could not load asset details.");
      const detailData = await detailRes.json();
      const chartData = chartRes.ok ? await chartRes.json() : {};
      setSelectedAsset({
        symbol: detailData.symbol || symbol,
        name: detailData.name || detailData.asset_name || symbol,
        type: getAssetType(detailData),
        currentPrice: detailData.current_price,
        currency: detailData.currency || "USD",
        expectedReturn: Number(detailData.expected_return || 0),
        volatility: Number(detailData.volatility || 0),
        return1Y: Number(detailData.return_1y || 0),
      });
      setAssetChart(Array.isArray(chartData.chart) ? chartData.chart : []);
    } catch (err) {
      setAssetError(err.message || "Failed to load asset.");
      setSelectedAsset(null);
      setAssetChart([]);
    } finally { setAssetLoading(false); }
  }

  function addAssetToPortfolio(assetLike) {
    const symbol = assetLike.symbol;
    if (!symbol || holdings.some((h) => h.symbol.toUpperCase() === symbol.toUpperCase())) return;
    setHoldings((prev) => [...prev, {
      symbol,
      name: assetLike.name || assetLike.asset_name || symbol,
      type: getAssetType(assetLike),
      allocation: 0,
      expectedReturn: Number(assetLike.expectedReturn ?? assetLike.expected_return ?? assetLike.return1Y ?? 0),
    }]);
  }

  function updateHolding(index, field, value) {
    setHoldings((prev) => prev.map((h, i) => i !== index ? h : {
      ...h,
      [field]: field === "allocation"
        ? Math.max(0, Math.min(100, Number(value) || 0))
        : field === "expectedReturn" ? Number(value) || 0 : value,
    }));
  }

  function removeHolding(index) {
    setHoldings((prev) => prev.filter((_, i) => i !== index));
  }

  function normalizeAllocations() {
    if (!holdings.length) return;
    const base = Math.floor(100 / holdings.length);
    const remainder = 100 - base * holdings.length;
    setHoldings((prev) => prev.map((h, i) => ({ ...h, allocation: base + (i === 0 ? remainder : 0) })));
  }

  const allocationTotal = useMemo(() =>
    holdings.reduce((sum, h) => sum + Number(h.allocation || 0), 0), [holdings]
  );
  const allocationValid = allocationTotal === 100;

  function saveDraftAndReturn() {
    if (!holdings.length || !allocationValid) return;
    sessionStorage.setItem("portfolioDraft", JSON.stringify(portfolioDraft));
    navigate("/investing");
  }

  const assetColor = selectedAsset ? getAssetColor(selectedAsset.symbol) : "#6366f1";

  return (
    <div className="inv-page">
      <Navbar />

      {showInstructions && (
        <InstructionsModal
          title="How to Use the Portfolio Builder"
          steps={PORTFOLIO_BUILDER_STEPS}
          onClose={() => setShowInstructions(false)}
        />
      )}

      <div className="inv-body">
        <div className="inv-header">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1>Portfolio Builder</h1>
              <p>Search real assets, view charts, explore recommendations, and build a portfolio for your goal.</p>
            </div>
            <button
              className="inv-button"
              type="button"
              onClick={() => setShowInstructions(true)}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}
            >
              📘 How to use this
            </button>
          </div>
        </div>

        <div className="inv-grid">
          <div>
            {/* Goal Context */}
            <div className="inv-card">
              <h2 className="inv-sectionTitle">Goal Context</h2>
              {goalDraft ? (
                <div className="inv-formGrid">
                  <div className="inv-field">
                    <label className="inv-label">Goal</label>
                    <div className="inv-hint">{goalDraft.goalName || "Untitled Goal"}</div>
                  </div>
                  <div className="inv-field">
                    <label className="inv-label">Risk Preference</label>
                    <div className="inv-hint">{capitalize(goalDraft.riskLevel || "balanced")}</div>
                  </div>
                  <div className="inv-field">
                    <label className="inv-label">Target Amount</label>
                    <div className="inv-hint">${money(goalDraft.targetAmount)}</div>
                  </div>
                  <div className="inv-field">
                    <label className="inv-label">Target Date</label>
                    <div className="inv-hint">{goalDraft.targetDate}</div>
                  </div>
                </div>
              ) : (
                <div className="inv-hint error">No goal draft found. Go back to the Goal Planner first.</div>
              )}
            </div>

            {/* Search */}
            <div className="inv-card">
              <h2 className="inv-sectionTitle">Search Assets</h2>
              <p className="inv-sectionSub">Enter an exact ticker and click Search — e.g. AAPL, VTI, QQQ, BND.</p>
              <form onSubmit={handleSearch} className="inv-formGrid">
                <div className="inv-field" style={{ gridColumn: "1 / span 2" }}>
                  <label className="inv-label">Ticker Symbol</label>
                  <input
                    className="inv-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. AAPL, VTI, QQQ, BND..."
                  />
                </div>
                <div className="inv-field" style={{ display: "flex", alignItems: "end" }}>
                  <button className="inv-button" type="submit" disabled={searching}>
                    {searching ? "Searching..." : "Search"}
                  </button>
                </div>
              </form>

              {searchError && <div className="inv-hint error" style={{ marginTop: "0.5rem" }}>{searchError}</div>}

              {!!searchResults.length && (
                <div className="inv-list" style={{ marginTop: "1rem" }}>
                  {searchResults.map((result, i) => (
                    <div className="inv-row" key={`${result.symbol}-${i}`}>
                      <div className="inv-rowLeft">
                        <div style={{
                          width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
                          background: getAssetColor(result.symbol) + "22",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem",
                        }}>
                          {getAssetEmoji(result.symbol)}
                        </div>
                        <div>
                          <div className="inv-rowTitle">{result.symbol}</div>
                          <div className="inv-rowSub">{result.name || "Unknown asset"}</div>
                          {result.current_price && <div className="inv-rowSub">${money(result.current_price)}</div>}
                        </div>
                      </div>
                      <button className="inv-button" type="button" onClick={() => loadAsset(result.symbol)}>
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Asset */}
            <div className="inv-card">
              <h2 className="inv-sectionTitle">Selected Asset</h2>
              {assetLoading ? (
                <div className="inv-hint">Loading asset data...</div>
              ) : assetError ? (
                <div className="inv-hint error">{assetError}</div>
              ) : selectedAsset ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div style={{
                      width: "52px", height: "52px", borderRadius: "14px", flexShrink: 0,
                      background: assetColor + "22",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem",
                    }}>
                      {getAssetEmoji(selectedAsset.symbol)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1a1a2e" }}>
                        {selectedAsset.symbol}
                      </div>
                      <div style={{ color: "#555", fontSize: "0.88rem" }}>{selectedAsset.name}</div>
                    </div>
                  </div>

                  <div className="inv-compareGrid">
                    <div className="inv-compareBox">
                      <div className="inv-compareLabel">Current Price</div>
                      <div className="inv-compareValue">
                        {selectedAsset.currentPrice != null
                          ? `${selectedAsset.currency} ${money(selectedAsset.currentPrice)}`
                          : "—"}
                      </div>
                    </div>
                    <div className="inv-compareBox">
                      <div className="inv-compareLabel">Exp. Annual Return</div>
                      <div className="inv-compareValue" style={{ color: selectedAsset.expectedReturn >= 0 ? "#00b894" : "#d63031" }}>
                        {selectedAsset.expectedReturn
                          ? `${selectedAsset.expectedReturn > 0 ? "+" : ""}${selectedAsset.expectedReturn}%`
                          : "—"}
                      </div>
                    </div>
                    <div className="inv-compareBox">
                      <div className="inv-compareLabel">Volatility (Ann.)</div>
                      <div className="inv-compareValue">{selectedAsset.volatility ? `${selectedAsset.volatility}%` : "—"}</div>
                    </div>
                    <div className="inv-compareBox">
                      <div className="inv-compareLabel">1Y Return</div>
                      <div className="inv-compareValue" style={{ color: selectedAsset.return1Y >= 0 ? "#00b894" : "#d63031" }}>
                        {selectedAsset.return1Y
                          ? `${selectedAsset.return1Y > 0 ? "+" : ""}${selectedAsset.return1Y}%`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {assetChart.length > 0 && (
                    <>
                      <div style={{ display: "flex", gap: "0.4rem", marginTop: "1rem", flexWrap: "wrap" }}>
                        {PERIOD_OPTIONS.map(({ label, value }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => handlePeriodChange(value)}
                            disabled={chartLoading}
                            style={{
                              padding: "0.25rem 0.65rem", borderRadius: "6px",
                              border: `1px solid ${assetColor}`,
                              background: chartPeriod === value ? assetColor : "transparent",
                              color: chartPeriod === value ? "#fff" : assetColor,
                              cursor: chartLoading ? "not-allowed" : "pointer",
                              fontSize: "0.78rem", fontWeight: 600,
                              opacity: chartLoading ? 0.6 : 1,
                              transition: "all 0.15s ease",
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div style={{ width: "100%", height: 300, marginTop: "0.75rem" }}>
                        {chartLoading ? (
                          <div className="inv-hint">Loading chart...</div>
                        ) : (
                          <ResponsiveContainer>
                            <LineChart data={assetChart}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" minTickGap={40} />
                              <YAxis
                                domain={([dataMin, dataMax]) => {
                                  const padding = (dataMax - dataMin) * 0.05 || 1;
                                  return [
                                    parseFloat((dataMin - padding).toFixed(2)),
                                    parseFloat((dataMax + padding).toFixed(2)),
                                  ];
                                }}
                                tickFormatter={(v) => `$${money(v)}`}
                                width={80}
                              />
                              <Tooltip formatter={(v) => `$${money(v)}`} />
                              <Legend />
                              <Line type="monotone" dataKey="price" name={selectedAsset.symbol}
                                stroke={assetColor} strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </>
                  )}

                  <div style={{ marginTop: "1rem" }}>
                    <button
                      className="inv-button"
                      type="button"
                      onClick={() => addAssetToPortfolio(selectedAsset)}
                      disabled={holdings.some((h) => h.symbol.toUpperCase() === selectedAsset.symbol.toUpperCase())}
                    >
                      {holdings.some((h) => h.symbol.toUpperCase() === selectedAsset.symbol.toUpperCase())
                        ? "✓ Already Added" : "+ Add to Portfolio"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="inv-hint">Search for an asset and click View to see its chart and details.</div>
              )}
            </div>

            {/* Recommendations */}
            <div className="inv-card">
              <h2 className="inv-sectionTitle">Recommendations</h2>
              <p className="inv-sectionSub">
                Ranked by risk-adjusted score (0–100) for your{" "}
                <strong>{capitalize(goalDraft?.riskLevel || "balanced")}</strong> risk profile.
                Higher score = better fit.
              </p>
              {loadingRecommendations ? (
                <div className="inv-hint">Loading recommendations...</div>
              ) : recommendations.length ? (
                <div className="inv-list">
                  {recommendations.map((rec, i) => (
                    <div className="inv-row" key={`${rec.symbol}-${i}`}>
                      <div className="inv-rowLeft" style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
                          background: getAssetColor(rec.symbol) + "22",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem",
                        }}>
                          {getAssetEmoji(rec.symbol)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="inv-rowTitle">{rec.symbol}</div>
                          <div className="inv-rowSub">{rec.asset_name || rec.name || "Recommended asset"}</div>
                          <div className="inv-rowSub">{rec.reason}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                        <div style={{
                          padding: "0.2rem 0.55rem", borderRadius: "20px",
                          background: getAssetColor(rec.symbol) + "22",
                          color: getAssetColor(rec.symbol),
                          fontWeight: 700, fontSize: "0.78rem", whiteSpace: "nowrap",
                        }}>
                          {rec.display_score ?? "—"}/100
                        </div>
                        <button
                          className="inv-button"
                          type="button"
                          onClick={() => addAssetToPortfolio({
                            symbol: rec.symbol,
                            name: rec.asset_name || rec.name || rec.symbol,
                            type: rec.asset_type || rec.type,
                            expectedReturn: Number(rec.expected_return || 0),
                          })}
                          disabled={holdings.some((h) => h.symbol === rec.symbol)}
                        >
                          {holdings.some((h) => h.symbol === rec.symbol) ? "✓ Added" : "Add"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="inv-hint">No recommendations available yet.</div>
              )}
            </div>
          </div>

          <div>
            {/* Your Portfolio */}
            <div className="inv-card">
              <h2 className="inv-sectionTitle">Your Portfolio</h2>
              <div className="inv-field" style={{ marginBottom: "1rem" }}>
                <label className="inv-label">Portfolio Name</label>
                <input
                  className="inv-input"
                  type="text"
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                />
              </div>

              {!holdings.length ? (
                <div className="inv-hint">No assets added yet. Search for an asset or add a recommendation.</div>
              ) : (
                <>
                  <div className="inv-list">
                    {holdings.map((holding, index) => (
                      <div className="inv-row" key={`${holding.symbol}-${index}`}
                        style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                        <div className="inv-rowLeft" style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            width: "36px", height: "36px", borderRadius: "9px", flexShrink: 0,
                            background: getAssetColor(holding.symbol) + "22",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem",
                          }}>
                            {getAssetEmoji(holding.symbol)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="inv-rowTitle">{holding.symbol}</div>
                            <div className="inv-rowSub" style={{
                              overflow: "hidden", textOverflow: "ellipsis",
                              whiteSpace: "nowrap", maxWidth: "150px",
                            }}>
                              {holding.name}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexShrink: 0 }}>
                          <input
                            className="inv-input"
                            type="number"
                            min="0" max="100" step="1"
                            style={{ width: "58px", textAlign: "center", padding: "0.3rem" }}
                            value={holding.allocation === 0 ? "" : holding.allocation}
                            onChange={(e) => updateHolding(index, "allocation", e.target.value === "" ? 0 : e.target.value)}
                            onBlur={(e) => { if (!e.target.value) updateHolding(index, "allocation", 0); }}
                          />
                          <span style={{ fontSize: "0.85rem" }}>%</span>
                          <button
                            className="inv-button" type="button"
                            onClick={() => removeHolding(index)}
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "1rem" }}>
                    <button className="inv-button" type="button" onClick={normalizeAllocations}>
                      Auto Balance
                    </button>
                  </div>

                  <div className={`inv-hint ${allocationValid ? "success" : "error"}`} style={{ marginTop: "1rem" }}>
                    Allocation total: {allocationTotal}%{" "}
                    {allocationValid ? "— looks good ✓" : "— must equal 100%"}
                  </div>
                </>
              )}
            </div>

            {/* Portfolio Summary */}
            <div className="inv-card">
              <h2 className="inv-sectionTitle">Portfolio Summary</h2>
              <div className="inv-compareBox" style={{ marginBottom: "0.85rem" }}>
                <div className="inv-compareLabel">Holdings</div>
                <div className="inv-compareValue">{holdings.length}</div>
              </div>
              <div className="inv-compareBox" style={{ marginBottom: "0.85rem" }}>
                <div className="inv-compareLabel">Expected Return</div>
                <div className="inv-compareValue" style={{ color: "#00b894" }}>
                  +{portfolioDraft.expectedReturn}%
                </div>
              </div>
              <div className="inv-compareBox">
                <div className="inv-compareLabel">Allocation Total</div>
                <div className="inv-compareValue" style={{ color: allocationValid ? "#00b894" : "#d63031" }}>
                  {allocationTotal}%
                </div>
              </div>

              {!!holdings.length && (
                <div style={{ width: "100%", height: 300, marginTop: "1rem" }}>
                  <ResponsiveContainer>
                    <BarChart data={holdings.map((h) => ({ symbol: h.symbol, allocation: Number(h.allocation || 0) }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="symbol" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Legend />
                      <Bar dataKey="allocation" name="Allocation %" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Use This Portfolio */}
            <div className="inv-card">
              <h2 className="inv-sectionTitle">Use This Portfolio</h2>
              <div className="inv-hint" style={{ marginBottom: "1rem" }}>
                Save this draft and return to the Goal Planner to view projections and save the full plan.
              </div>
              <button
                className="inv-button" type="button"
                onClick={saveDraftAndReturn}
                disabled={!holdings.length || !allocationValid}
                style={{ width: "100%", marginBottom: "0.75rem" }}
              >
                Use This Portfolio
              </button>
              <button
                className="inv-button" type="button"
                onClick={() => navigate("/investing")}
                style={{ width: "100%", opacity: 0.85 }}
              >
                Back to Goal Planner
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
