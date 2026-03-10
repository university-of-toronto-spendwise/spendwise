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

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  :root {
    --uoft-blue: #002A5C;
    --uoft-mid: #0047A0;
    --uoft-accent: #E8B53E;
    --off-white: #F4F7FB;
    --white: #FFFFFF;
    --border: #D0DBE8;
    --border-2: #C7D4E6;
    --text-muted: #6B7A90;
    --success: #18A574;
    --danger: #C0392B;
    --shadow: 0 4px 16px rgba(0,42,92,0.08);
  }

  body { font-family: 'Source Sans 3', sans-serif; }

  .page {
    min-height: 100vh;
    background: var(--off-white);
  }

  .body {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    margin-bottom: 1.25rem;
  }

  .header h1 {
    font-size: 1.9rem;
    font-weight: 600;
    color: var(--uoft-blue);
    margin: 0 0 0.25rem 0;
  }

  .header p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 1.5rem;
    align-items: start;
  }

  .card {
    background: var(--white);
    border: 2px solid var(--border);
    border-radius: 18px;
    padding: 1.25rem 1.5rem;
  }

  .card + .card {
    margin-top: 1.25rem;
  }

  .hero {
    background: linear-gradient(135deg, var(--uoft-blue), var(--uoft-mid));
    color: white;
    border: none;
    box-shadow: var(--shadow);
  }

  .hero h2 {
    margin: 0 0 0.35rem 0;
    font-size: 1.9rem;
    font-weight: 700;
  }

  .hero p {
    margin: 0.2rem 0;
    opacity: 0.92;
  }

  .heroMeta {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 0.9rem;
    flex-wrap: wrap;
    font-size: 0.9rem;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1.25rem;
  }

  .stat {
    background: var(--white);
    border: 2px solid var(--border);
    border-radius: 18px;
    padding: 1rem 1.1rem;
  }

  .statValue {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--uoft-blue);
  }

  .statValue.positive { color: var(--success); }
  .statValue.negative { color: var(--danger); }

  .statLabel {
    color: var(--text-muted);
    font-size: 0.92rem;
    margin-top: 0.2rem;
  }

  .sectionTitle {
    margin: 0 0 0.9rem 0;
    font-size: 1.02rem;
    font-weight: 700;
    color: var(--uoft-blue);
  }

  .sectionSub {
    color: var(--text-muted);
    font-size: 0.92rem;
    margin: -0.45rem 0 1rem 0;
  }

  .formGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .field.full {
    grid-column: 1 / -1;
  }

  .label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--uoft-blue);
  }

  .input, .select {
    width: 100%;
    border: 2px solid var(--border);
    border-radius: 14px;
    padding: 0.85rem 0.95rem;
    font-size: 0.96rem;
    color: var(--uoft-blue);
    background: #fff;
    outline: none;
  }

  .input:focus, .select:focus {
    border-color: var(--border-2);
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.84rem;
  }

  .hint.error { color: var(--danger); }
  .hint.success { color: var(--success); }

  .portfolioGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .portfolioCard {
    border: 2px solid var(--border);
    border-radius: 18px;
    padding: 1rem;
    background: #fff;
    cursor: pointer;
  }

  .portfolioCard.active {
    background: #F7FAFF;
    border-color: rgba(0,71,160,0.35);
  }

  .portfolioTop {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .portfolioName {
    font-size: 1rem;
    font-weight: 700;
    color: var(--uoft-blue);
  }

  .portfolioSub {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-top: 0.15rem;
  }

  .tag {
    background: #EAF0FF;
    color: var(--uoft-mid);
    border-radius: 999px;
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .miniRow {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-top: 0.35rem;
  }

  .miniRow strong {
    color: var(--uoft-blue);
  }

  .compareGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .compareBox {
    padding: 1rem;
    border-radius: 16px;
    background: #F7FAFF;
    border: 2px solid rgba(208,219,232,0.75);
  }

  .compareLabel {
    color: var(--text-muted);
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 0.2rem;
  }

  .compareValue {
    color: var(--uoft-blue);
    font-size: 1.3rem;
    font-weight: 700;
  }

  .compareValue.positive { color: var(--success); }

  .rowTitle {
    font-weight: 700;
    color: var(--uoft-blue);
  }

  .rowSub {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .rowAmt {
    font-weight: 700;
    color: var(--uoft-blue);
  }

  .button {
    background: linear-gradient(135deg, var(--uoft-blue), var(--uoft-mid));
    color: white;
    border: none;
    border-radius: 999px;
    padding: 0.75rem 1.1rem;
    font-weight: 600;
    cursor: pointer;
  }

  .button:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  @media (max-width: 980px) {
    .grid { grid-template-columns: 1fr; }
    .portfolioGrid { grid-template-columns: 1fr; }
  }

  @media (max-width: 720px) {
    .body { padding: 1.25rem 1rem; }
    .stats, .formGrid, .compareGrid { grid-template-columns: 1fr; }
  }
`;

function getAuthHeaders() {
  const token = localStorage.getItem("userToken");
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
      } catch (err) {
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
    <div className="page">
      <style>{styles}</style>
      <Navbar />

      <div className="body">
        <div className="header">
          <h1>Investment Guidance</h1>
          <p>Use your savings baseline to explore practice portfolios and compare outcomes against a financial goal.</p>
        </div>

        <div className="grid">
          <div>
            <div className="card hero" style={{ ["--pct"]: `${heroProgress}%` }}>
              <h2>${money(investingValue)}</h2>
              <p>Projected value with your selected practice portfolio.</p>
              <div className="heroMeta">
                <span>{selectedPortfolio.name}</span>
                <span>{monthsLeft} month{monthsLeft === 1 ? "" : "s"} to goal</span>
                <span>+{selectedPortfolio.expectedReturn}% expected</span>
              </div>
            </div>

            <div className="stats">
              <div className="stat">
                <div className="statValue">
                  {loadingSavings ? "..." : `$${money(monthlyContribution)}`}
                </div>
                <div className="statLabel">Estimated Monthly Savings</div>
              </div>

              <div className="stat">
                <div className="statValue">${money(targetAmount)}</div>
                <div className="statLabel">Goal Target</div>
              </div>

              <div className="stat">
                <div className={`statValue ${investingEdge >= 0 ? "positive" : "negative"}`}>
                  {investingEdge >= 0 ? "+" : "-"}${money(Math.abs(investingEdge))}
                </div>
                <div className="statLabel">Edge vs Saving Only</div>
              </div>
            </div>

            <div className="card">
              <h2 className="sectionTitle">1. Savings Snapshot</h2>
              <p className="sectionSub">We use the savings estimate from your spending feature as a starting point.</p>

              <div className="formGrid">
                <div className="field">
                  <label className="label">Monthly Contribution</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(Number(e.target.value) || 0)}
                  />
                  {loadingSavings ? (
                    <div className="hint">Loading savings estimate...</div>
                  ) : savingsError ? (
                    <div className="hint error">{savingsError}</div>
                  ) : (
                    <div className="hint">Prefilled from your spending analysis. You can adjust it.</div>
                  )}
                </div>

                <div className="field">
                  <label className="label">Initial Amount</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(Number(e.target.value) || 0)}
                  />
                  <div className="hint">Any amount you already have saved.</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="sectionTitle">2. Goal Setup</h2>
              <p className="sectionSub">Set a target so you can compare savings and investing outcomes.</p>

              <div className="formGrid">
                <div className="field full">
                  <label className="label">Goal Name</label>
                  <input
                    className="input"
                    type="text"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="label">Goal Type</label>
                  <select
                    className="select"
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

                <div className="field">
                  <label className="label">Risk Preference</label>
                  <select
                    className="select"
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

                <div className="field">
                  <label className="label">Target Amount</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="field">
                  <label className="label">Target Date</label>
                  <input
                    className="input"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="sectionTitle">3. Practice Portfolios</h2>
              <p className="sectionSub">Choose a sample portfolio to compare against saving only.</p>

              <div className="portfolioGrid">
                {visiblePortfolios.map((portfolio) => (
                  <div
                    key={portfolio.id}
                    className={`portfolioCard ${selectedPortfolio.id === portfolio.id ? "active" : ""}`}
                    onClick={() => setSelectedPortfolioId(portfolio.id)}
                  >
                    <div className="portfolioTop">
                      <div>
                        <div className="portfolioName">{portfolio.name}</div>
                        <div className="portfolioSub">
                          {portfolio.type === "custom" ? "Custom portfolio" : "System-generated sample"}
                        </div>
                      </div>
                      <div className="tag">{portfolio.risk}</div>
                    </div>

                    <div className="miniRow">
                      <span>Expected return</span>
                      <strong>+{portfolio.expectedReturn}%</strong>
                    </div>
                    <div className="miniRow">
                      <span>Holdings</span>
                      <strong>{portfolio.holdings.length}</strong>
                    </div>

                    <div style={{ marginTop: "0.7rem" }}>
                      {portfolio.holdings.map((h) => (
                        <div className="miniRow" key={`${portfolio.id}-${h.symbol}`}>
                          <span><strong>{h.symbol}</strong> · {h.name}</span>
                          <span>{h.allocation}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="sectionTitle">Comparison</h2>

              <div className="compareGrid">
                <div className="compareBox">
                  <div className="compareLabel">Savings Only by Target Date</div>
                  <div className="compareValue">${money(savingsOnlyValue)}</div>
                </div>

                <div className="compareBox">
                  <div className="compareLabel">Selected Portfolio Projection</div>
                  <div className="compareValue positive">${money(investingValue)}</div>
                </div>
              </div>

              <div className="chart">
                <div className="barWrap">
                  <div className="barArea">
                    <div className="bar savings" style={{ height: `${savingsBar}px` }}>
                      <div className="barValue">${Math.round(savingsOnlyValue).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="barLabel">Savings Only</div>
                </div>

                <div className="barWrap">
                  <div className="barArea">
                    <div className="bar investing" style={{ height: `${investingBar}px` }}>
                      <div className="barValue">${Math.round(investingValue).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="barLabel">Selected Portfolio</div>
                </div>

                <div className="barWrap">
                  <div className="barArea">
                    <div className="bar goal" style={{ height: `${goalBar}px` }}>
                      <div className="barValue">${Math.round(targetAmount).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="barLabel">Goal Target</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="sectionTitle">Guidance</h2>
              <div className="hint">{insight} This simulator uses hypothetical returns and is not investment advice.</div>
            </div>
          </div>

          <div>
            <div className="card">
              <h2 className="sectionTitle">Goal Snapshot</h2>

              <div className="compareBox" style={{ marginBottom: "0.85rem" }}>
                <div className="compareLabel">Current Goal</div>
                <div className="compareValue">{goalName || "Untitled Goal"}</div>
              </div>

              <div className="compareBox" style={{ marginBottom: "0.85rem" }}>
                <div className="compareLabel">Timeline</div>
                <div className="compareValue">{monthsLeft} month{monthsLeft === 1 ? "" : "s"}</div>
              </div>

              <div className="compareBox">
                <div className="compareLabel">Selected Portfolio</div>
                <div className="compareValue">{selectedPortfolio.name}</div>
              </div>
            </div>

            <div className="card">
              <h2 className="sectionTitle">Selected Holdings</h2>
              <div className="list">
                {selectedPortfolio.holdings.map((holding) => (
                  <div className="row" key={`${selectedPortfolio.id}-${holding.symbol}`}>
                    <div className="rowLeft">
                      <div className="rowIcon">
                        {holding.type === "stock"
                          ? "📈"
                          : holding.type === "bond"
                          ? "🏦"
                          : holding.type === "cash"
                          ? "💵"
                          : "📊"}
                      </div>
                      <div>
                        <div className="rowTitle">{holding.symbol}</div>
                        <div className="rowSub">{holding.name}</div>
                      </div>
                    </div>
                    <div className="rowAmt">{holding.allocation}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="sectionTitle">Save This Plan</h2>

              {saveMessage ? <div className="hint success">{saveMessage}</div> : null}
              {saveError ? <div className="hint error">{saveError}</div> : null}

              <div style={{ marginTop: "1rem" }}>
                <button className="button" onClick={handleGeneratePortfolio} disabled={saving}>
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