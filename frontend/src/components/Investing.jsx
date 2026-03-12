import { useEffect, useMemo, useState } from "react";
import Navbar from "./Navbar";

const API_BASE = "/api";

const PORTFOLIOS = [
  {
    id: "conservative",
    name: "Conservative ETF Mix",
    type: "system",
    expectedReturn: 4.0,
    risk: "Conservative",
    holdings: [
      { symbol: "CASH", name: "High Interest Savings ETF", allocation: 40, type: "cash", expectedReturn: 2.5 },
      { symbol: "BND", name: "Bond ETF", allocation: 40, type: "bond", expectedReturn: 3.0 },
      { symbol: "VTI", name: "US Total Market ETF", allocation: 20, type: "etf", expectedReturn: 7.0 },
    ],
  },
  {
    id: "balanced",
    name: "Balanced ETF Mix",
    type: "system",
    expectedReturn: 6.5,
    risk: "Balanced",
    holdings: [
      { symbol: "XEQT", name: "Global Equity ETF", allocation: 45, type: "etf", expectedReturn: 7.5 },
      { symbol: "VFV", name: "S&P 500 ETF", allocation: 30, type: "etf", expectedReturn: 8.0 },
      { symbol: "ZAG", name: "Canadian Bond ETF", allocation: 25, type: "bond", expectedReturn: 3.0 },
    ],
  },
  {
    id: "growth",
    name: "Growth Mix",
    type: "system",
    expectedReturn: 8.5,
    risk: "Growth",
    holdings: [
      { symbol: "QQQ", name: "NASDAQ 100 ETF", allocation: 35, type: "etf", expectedReturn: 9.0 },
      { symbol: "VTI", name: "US Total Market ETF", allocation: 35, type: "etf", expectedReturn: 7.0 },
      { symbol: "SHOP.TO", name: "Shopify", allocation: 15, type: "stock", expectedReturn: 10.0 },
      { symbol: "TSLA", name: "Tesla", allocation: 15, type: "stock", expectedReturn: 10.0 },
    ],
  },
  {
    id: "custom",
    name: "My Custom Portfolio",
    type: "custom",
    expectedReturn: 7.2,
    risk: "Custom",
    holdings: [
      { symbol: "XEQT", name: "Global Equity ETF", allocation: 50, type: "etf", expectedReturn: 7.5 },
      { symbol: "VFV", name: "S&P 500 ETF", allocation: 25, type: "etf", expectedReturn: 8.0 },
      { symbol: "CASH", name: "High Interest Savings ETF", allocation: 25, type: "cash", expectedReturn: 2.5 },
    ],
  },
];

function getAuthHeaders() {
  const token = sessionStorage.getItem("userAccessToken") || sessionStorage.getItem("userToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function monthsUntil(dateString) {
  if (!dateString) return 12;
  const now = new Date();
  const target = new Date(dateString);
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());
  return Math.max(1, months);
}

function futureSavings(initialAmount, monthlyContribution, months) {
  return initialAmount + monthlyContribution * months;
}

function futureInvesting(initialAmount, monthlyContribution, annualReturn, months) {
  const monthlyRate = annualReturn / 100 / 12;
  if (!monthlyRate) return futureSavings(initialAmount, monthlyContribution, months);

  const lump = initialAmount * Math.pow(1 + monthlyRate, months);
  const recurring =
    monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

  return lump + recurring;
}

export default function Investing() {
  const [monthlyContribution, setMonthlyContribution] = useState(0);
  const [initialAmount, setInitialAmount] = useState(500);
  const [goalName, setGoalName] = useState("New Laptop Fund");
  const [goalType, setGoalType] = useState("laptop");
  const [targetAmount, setTargetAmount] = useState(2000);
  const [targetDate, setTargetDate] = useState("2026-12-01");
  const [riskLevel, setRiskLevel] = useState("balanced");
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("balanced");

  const [loadingSavings, setLoadingSavings] = useState(true);
  const [savingsError, setSavingsError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    async function loadSavings() {
      try {
        setLoadingSavings(true);
        setSavingsError("");

        const res = await fetch(`${API_BASE}/spending/monthly_saving_amount/`, {
          headers: getAuthHeaders(),
        });

        if (!res.ok) throw new Error("Could not load savings baseline.");

        const data = await res.json();
        setMonthlyContribution(Number(data.total_saving || 0));
      } catch {
        setSavingsError("Could not load your savings estimate.");
        setMonthlyContribution(0);
      } finally {
        setLoadingSavings(false);
      }
    }

    loadSavings();
  }, []);

  const visiblePortfolios = useMemo(() => {
    if (riskLevel === "conservative") {
      return PORTFOLIOS.filter((p) => ["conservative", "custom"].includes(p.id));
    }
    if (riskLevel === "growth") {
      return PORTFOLIOS.filter((p) => ["growth", "custom"].includes(p.id));
    }
    return PORTFOLIOS;
  }, [riskLevel]);

  const selectedPortfolio = useMemo(() => {
    return (
      visiblePortfolios.find((p) => p.id === selectedPortfolioId) ||
      visiblePortfolios[0] ||
      PORTFOLIOS[0]
    );
  }, [visiblePortfolios, selectedPortfolioId]);

  const monthsLeft = useMemo(() => monthsUntil(targetDate), [targetDate]);

  const savingsOnlyValue = useMemo(() => {
    return futureSavings(initialAmount, monthlyContribution, monthsLeft);
  }, [initialAmount, monthlyContribution, monthsLeft]);

  const investingValue = useMemo(() => {
    return futureInvesting(
      initialAmount,
      monthlyContribution,
      selectedPortfolio.expectedReturn,
      monthsLeft
    );
  }, [initialAmount, monthlyContribution, selectedPortfolio, monthsLeft]);

  const investingEdge = investingValue - savingsOnlyValue;

  const heroProgress = Math.min(
    100,
    Math.round((investingValue / Math.max(targetAmount, 1)) * 100)
  );

  const insight = useMemo(() => {
    if (investingValue >= targetAmount) {
      return `At this pace, your selected portfolio could help you reach your goal by the target date.`;
    }
    if (savingsOnlyValue >= targetAmount) {
      return `Your current savings alone may already be enough to reach this goal. Investing mainly adds cushion.`;
    }
    return `At this pace, you may still fall short unless you increase monthly savings or extend the timeline.`;
  }, [investingValue, savingsOnlyValue, targetAmount]);

  async function handleGeneratePortfolio() {
    try {
      setSaving(true);
      setSaveMessage("");
      setSaveError("");

      const goalPayload = {
        goal_name: goalName.trim() || "Untitled Goal",
        goal_type: goalType,
        target_amount: Number(targetAmount),
        monthly_contribution: Number(monthlyContribution),
        initial_amount: Number(initialAmount),
        target_date: targetDate,
        risk_level: riskLevel,
      };

      const goalRes = await fetch(`${API_BASE}/investments/goals/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(goalPayload),
      });

      if (!goalRes.ok) {
        const errorData = await goalRes.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to save goal.");
      }

      const createdGoal = await goalRes.json();

      const portfolioPayload = {
        goal: createdGoal.id,
        portfolio_name: selectedPortfolio.name,
        portfolio_type: selectedPortfolio.type,
        expected_annual_return: selectedPortfolio.expectedReturn,
        holdings: selectedPortfolio.holdings.map((h) => ({
          symbol: h.symbol,
          asset_name: h.name,
          asset_type: h.type,
          allocation_percent: h.allocation,
          expected_annual_return: h.expectedReturn,
        })),
      };

      const portfolioRes = await fetch(`${API_BASE}/investments/portfolios/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(portfolioPayload),
      });

      if (!portfolioRes.ok) {
        const errorData = await portfolioRes.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to save practice portfolio.");
      }

      setSaveMessage("Goal and practice portfolio saved successfully.");
    } catch (err) {
      setSaveError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const maxBar = Math.max(savingsOnlyValue, investingValue, targetAmount, 1);
  const savingsBar = Math.max(12, (savingsOnlyValue / maxBar) * 170);
  const investingBar = Math.max(12, (investingValue / maxBar) * 170);
  const goalBar = Math.max(12, (targetAmount / maxBar) * 170);

  return (
    <div className="inv-page">
      <Navbar />

      <div className="inv-body">
        <div className="inv-header">
          <h1>Investment Guidance</h1>
          <p>Use your savings baseline to explore practice portfolios and compare outcomes against a financial goal.</p>
        </div>

        <div className="inv-grid">
          <div>
            <div className="inv-card inv-hero" style={{ ["--pct"]: `${heroProgress}%` }}>
              <h2>${money(investingValue)}</h2>
              <p>Projected value with your selected practice portfolio.</p>
              <div className="inv-heroMeta">
                <span>{selectedPortfolio.name}</span>
                <span>{monthsLeft} month{monthsLeft === 1 ? "" : "s"} to goal</span>
                <span>+{selectedPortfolio.expectedReturn}% expected</span>
              </div>
            </div>

            <div className="inv-stats">
              <div className="inv-stat">
                <div className="inv-statValue">
                  {loadingSavings ? "..." : `$${money(monthlyContribution)}`}
                </div>
                <div className="inv-statLabel">Estimated Monthly Savings</div>
              </div>

              <div className="inv-stat">
                <div className="inv-statValue">${money(targetAmount)}</div>
                <div className="inv-statLabel">Goal Target</div>
              </div>

              <div className="inv-stat">
                <div className={`inv-statValue ${investingEdge >= 0 ? "positive" : "negative"}`}>
                  {investingEdge >= 0 ? "+" : "-"}${money(Math.abs(investingEdge))}
                </div>
                <div className="inv-statLabel">Edge vs Saving Only</div>
              </div>
            </div>

            <div className="inv-card">
              <h2 className="inv-sectionTitle">1. Savings Snapshot</h2>
              <p className="inv-sectionSub">We use the savings estimate from your spending feature as a starting point.</p>

              <div className="inv-formGrid">
                <div className="inv-field">
                  <label className="inv-label">Monthly Contribution</label>
                  <input
                    className="inv-input"
                    type="number"
                    min="0"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(Number(e.target.value) || 0)}
                  />
                  {loadingSavings ? (
                    <div className="inv-hint">Loading savings estimate...</div>
                  ) : savingsError ? (
                    <div className="inv-hint error">{savingsError}</div>
                  ) : (
                    <div className="inv-hint">Prefilled from your spending analysis. You can adjust it.</div>
                  )}
                </div>

                <div className="inv-field">
                  <label className="inv-label">Initial Amount</label>
                  <input
                    className="inv-input"
                    type="number"
                    min="0"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(Number(e.target.value) || 0)}
                  />
                  <div className="inv-hint">Any amount you already have saved.</div>
                </div>
              </div>
            </div>

            <div className="inv-card">
              <h2 className="inv-sectionTitle">2. Goal Setup</h2>
              <p className="inv-sectionSub">Set a target so you can compare savings and investing outcomes.</p>

              <div className="inv-formGrid">
                <div className="inv-field full">
                  <label className="inv-label">Goal Name</label>
                  <input
                    className="inv-input"
                    type="text"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                  />
                </div>

                <div className="inv-field">
                  <label className="inv-label">Goal Type</label>
                  <select
                    className="inv-select"
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value)}
                  >
                    <option value="laptop">Laptop</option>
                    <option value="tuition">Tuition</option>
                    <option value="travel">Travel</option>
                    <option value="emergency_fund">Emergency Fund</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="inv-field">
                  <label className="inv-label">Risk Preference</label>
                  <select
                    className="inv-select"
                    value={riskLevel}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRiskLevel(value);
                      if (value === "conservative") setSelectedPortfolioId("conservative");
                      if (value === "balanced") setSelectedPortfolioId("balanced");
                      if (value === "growth") setSelectedPortfolioId("growth");
                    }}
                  >
                    <option value="conservative">Conservative</option>
                    <option value="balanced">Balanced</option>
                    <option value="growth">Growth</option>
                  </select>
                </div>

                <div className="inv-field">
                  <label className="inv-label">Target Amount</label>
                  <input
                    className="inv-input"
                    type="number"
                    min="0"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="inv-field">
                  <label className="inv-label">Target Date</label>
                  <input
                    className="inv-input"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="inv-card">
              <h2 className="inv-sectionTitle">3. Practice Portfolios</h2>
              <p className="inv-sectionSub">Choose a sample portfolio to compare against saving only.</p>

              <div className="inv-portfolioGrid">
                {visiblePortfolios.map((portfolio) => (
                  <div
                    key={portfolio.id}
                    className={`inv-portfolioCard ${selectedPortfolio.id === portfolio.id ? "active" : ""}`}
                    onClick={() => setSelectedPortfolioId(portfolio.id)}
                  >
                    <div className="inv-portfolioTop">
                      <div>
                        <div className="inv-portfolioName">{portfolio.name}</div>
                        <div className="inv-portfolioSub">
                          {portfolio.type === "custom" ? "Custom portfolio" : "System-generated sample"}
                        </div>
                      </div>
                      <div className="inv-tag">{portfolio.risk}</div>
                    </div>

                    <div className="inv-miniRow">
                      <span>Expected return</span>
                      <strong>+{portfolio.expectedReturn}%</strong>
                    </div>
                    <div className="inv-miniRow">
                      <span>Holdings</span>
                      <strong>{portfolio.holdings.length}</strong>
                    </div>

                    <div style={{ marginTop: "0.7rem" }}>
                      {portfolio.holdings.map((h) => (
                        <div className="inv-miniRow" key={`${portfolio.id}-${h.symbol}`}>
                          <span><strong>{h.symbol}</strong> · {h.name}</span>
                          <span>{h.allocation}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="inv-card">
              <h2 className="inv-sectionTitle">Comparison</h2>

              <div className="inv-compareGrid">
                <div className="inv-compareBox">
                  <div className="inv-compareLabel">Savings Only by Target Date</div>
                  <div className="inv-compareValue">${money(savingsOnlyValue)}</div>
                </div>

                <div className="inv-compareBox">
                  <div className="inv-compareLabel">Selected Portfolio Projection</div>
                  <div className="inv-compareValue positive">${money(investingValue)}</div>
                </div>
              </div>

              <div className="inv-chart">
                <div className="inv-barWrap">
                  <div className="inv-barArea">
                    <div className="inv-bar savings" style={{ height: `${savingsBar}px` }}>
                      <div className="inv-barValue">${Math.round(savingsOnlyValue).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="inv-barLabel">Savings Only</div>
                </div>

                <div className="inv-barWrap">
                  <div className="inv-barArea">
                    <div className="inv-bar investing" style={{ height: `${investingBar}px` }}>
                      <div className="inv-barValue">${Math.round(investingValue).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="inv-barLabel">Selected Portfolio</div>
                </div>

                <div className="inv-barWrap">
                  <div className="inv-barArea">
                    <div className="inv-bar goal" style={{ height: `${goalBar}px` }}>
                      <div className="inv-barValue">${Math.round(targetAmount).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="inv-barLabel">Goal Target</div>
                </div>
              </div>
            </div>

            <div className="inv-card">
              <h2 className="inv-sectionTitle">Guidance</h2>
              <div className="inv-hint">{insight} This simulator uses hypothetical returns and is not investment advice.</div>
            </div>
          </div>

          <div>
            <div className="inv-card">
              <h2 className="inv-sectionTitle">Goal Snapshot</h2>

              <div className="inv-compareBox" style={{ marginBottom: "0.85rem" }}>
                <div className="inv-compareLabel">Current Goal</div>
                <div className="inv-compareValue">{goalName || "Untitled Goal"}</div>
              </div>

              <div className="inv-compareBox" style={{ marginBottom: "0.85rem" }}>
                <div className="inv-compareLabel">Timeline</div>
                <div className="inv-compareValue">{monthsLeft} month{monthsLeft === 1 ? "" : "s"}</div>
              </div>

              <div className="inv-compareBox">
                <div className="inv-compareLabel">Selected Portfolio</div>
                <div className="inv-compareValue">{selectedPortfolio.name}</div>
              </div>
            </div>

            <div className="inv-card">
              <h2 className="inv-sectionTitle">Selected Holdings</h2>
              <div className="inv-list">
                {selectedPortfolio.holdings.map((holding) => (
                  <div className="inv-row" key={`${selectedPortfolio.id}-${holding.symbol}`}>
                    <div className="inv-rowLeft">
                      <div className="inv-rowIcon">
                        {holding.type === "stock"
                          ? "📈"
                          : holding.type === "bond"
                          ? "🏦"
                          : holding.type === "cash"
                          ? "💵"
                          : "📊"}
                      </div>
                      <div>
                        <div className="inv-rowTitle">{holding.symbol}</div>
                        <div className="inv-rowSub">{holding.name}</div>
                      </div>
                    </div>
                    <div className="inv-rowAmt">{holding.allocation}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="inv-card">
              <h2 className="inv-sectionTitle">Save This Plan</h2>

              {saveMessage ? <div className="inv-hint success">{saveMessage}</div> : null}
              {saveError ? <div className="inv-hint error">{saveError}</div> : null}

              <div style={{ marginTop: "1rem" }}>
                <button className="inv-button" onClick={handleGeneratePortfolio} disabled={saving}>
                  {saving ? "Saving..." : "Generate Portfolio"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
