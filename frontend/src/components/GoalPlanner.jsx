import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, BarChart, Bar,
} from "recharts";
import Navbar from "./Navbar";
import InstructionsModal from "./InstructionsModal";
import { fetchProfile } from "../utils/session";
import {
  buildFinancialSnapshot, coverageAmount, coveragePercent,
} from "../utils/financialSnapshot";

const API_BASE = "/api";

const GOAL_PLANNER_STEPS = [
  {
    title: "Set your monthly contribution",
    description: "This is prefilled from your spending analysis — it's the estimated amount you can save each month. You can adjust it manually if needed.",
  },
  {
    title: "Enter your initial amount",
    description: "How much money do you already have saved to put toward this goal? Even $0 is fine — the projection will still work.",
  },
  {
    title: "Name your goal",
    description: "Give it a meaningful name like 'Emergency Fund', 'New Laptop', or 'Tuition'. You can also pick a goal type from the dropdown.",
  },
  {
    title: "Choose your risk preference",
    description: "Conservative = bonds & stable assets (lower risk, lower return). Balanced = mix of stocks and bonds. Growth = mostly stocks (higher potential return, higher volatility).",
  },
  {
    title: "Set a target amount and date",
    description: "How much do you want to save, and by when? The further your target date, the more time compounding has to work in your favour.",
  },
  {
    title: "Build your portfolio",
    description: "Click 'Build Portfolio' to go to the Portfolio Builder. There you pick real ETFs and stocks, set allocations, and return here with a completed portfolio.",
  },
  {
    title: "View your projection",
    description: "The charts show savings-only growth vs your portfolio growth over time. The goal target line shows whether you're on track.",
  },
  {
    title: "Save your plan",
    description: "Once you have a portfolio selected, click 'Save Goal & Portfolio' to save everything. This stores your goal and portfolio to your account.",
  },
];

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
  return Number(initialAmount || 0) + Number(monthlyContribution || 0) * months;
}

function futureInvesting(initialAmount, monthlyContribution, annualReturn, months) {
  const monthlyRate = Number(annualReturn || 0) / 100 / 12;
  if (!monthlyRate) return futureSavings(initialAmount, monthlyContribution, months);
  const lump = Number(initialAmount || 0) * Math.pow(1 + monthlyRate, months);
  const recurring =
    Number(monthlyContribution || 0) *
    ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  return lump + recurring;
}

function readPortfolioDraft() {
  try {
    const raw = sessionStorage.getItem("portfolioDraft");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.holdings)) return null;
    const holdings = parsed.holdings.map((h) => ({
      symbol: h.symbol,
      name: h.name,
      type: h.type,
      allocation: Number(h.allocation || 0),
      expectedReturn: Number(h.expectedReturn || 0),
    }));
    const expectedReturn = holdings.reduce(
      (sum, h) => sum + (Number(h.allocation || 0) / 100) * Number(h.expectedReturn || 0), 0
    );
    return {
      id: parsed.id || "custom_draft",
      name: parsed.name || "My Portfolio",
      type: parsed.type || "custom",
      risk: parsed.risk || "Custom",
      holdings,
      expectedReturn: Number(expectedReturn.toFixed(2)),
    };
  } catch { return null; }
}

function defaultTargetDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 18);
  return d.toISOString().split("T")[0];
}

// Emoji per asset for the holdings list
const ASSET_EMOJI = {
  BND: "🏛️", TLT: "📜", SHY: "🛡️", VTI: "🇺🇸", AGG: "⚖️",
  VXUS: "🌍", QQQ: "💻", VEA: "🌐", VUG: "🚀", IWM: "🏭",
  ARKK: "🔬", AAPL: "🍎", TSLA: "⚡", MSFT: "🪟", AMZN: "📦",
  NVDA: "🎮", GOOG: "🔍", GOOGL: "🔍", META: "👾", SPY: "🏦",
  GLD: "🥇",
};

function getEmoji(symbol) {
  const clean = symbol?.replace(/\.US$/i, "").toUpperCase();
  return ASSET_EMOJI[clean] || "📊";
}

export default function GoalPlanner() {
  const navigate = useNavigate();

  const [showInstructions, setShowInstructions] = useState(false);
  const [monthlyContribution, setMonthlyContribution] = useState(0);
  const [initialAmount, setInitialAmount] = useState(500);
  const [goalName, setGoalName] = useState("New Laptop Fund");
  const [goalType, setGoalType] = useState("laptop");
  const [targetAmount, setTargetAmount] = useState(2000);
  const [targetDate, setTargetDate] = useState(defaultTargetDate());
  const [riskLevel, setRiskLevel] = useState("balanced");

  const [loadingSavings, setLoadingSavings] = useState(true);
  const [savingsError, setSavingsError] = useState("");
  const [financialProfile, setFinancialProfile] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [portfolioDraft, setPortfolioDraft] = useState(readPortfolioDraft());

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

  useEffect(() => {
    fetchProfile()
      .then((profile) => setFinancialProfile(profile))
      .catch(() => setFinancialProfile({}));
  }, []);

  useEffect(() => {
    setPortfolioDraft(readPortfolioDraft());
    const onFocus = () => setPortfolioDraft(readPortfolioDraft());
    const onStorage = (e) => {
      if (e.key === "portfolioDraft") setPortfolioDraft(readPortfolioDraft());
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const selectedPortfolio = portfolioDraft;
  const monthsLeft = useMemo(() => monthsUntil(targetDate), [targetDate]);

  const savingsOnlyValue = useMemo(
    () => futureSavings(initialAmount, monthlyContribution, monthsLeft),
    [initialAmount, monthlyContribution, monthsLeft]
  );

  const investingValue = useMemo(
    () => futureInvesting(initialAmount, monthlyContribution, Number(selectedPortfolio?.expectedReturn || 0), monthsLeft),
    [initialAmount, monthlyContribution, selectedPortfolio, monthsLeft]
  );

  const investingEdge = investingValue - savingsOnlyValue;

  const financialSnapshot = useMemo(
    () => buildFinancialSnapshot(financialProfile),
    [financialProfile]
  );

  const netAnnualAfterAid = useMemo(() => {
    const v = financialProfile?.net_annual_cost_after_aid;
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }, [financialProfile]);

  const investmentCoverage = useMemo(
    () => coverageAmount(financialSnapshot.deficit, Math.max(investingEdge, 0)),
    [financialSnapshot.deficit, investingEdge]
  );

  const investmentCoveragePercent = useMemo(
    () => coveragePercent(financialSnapshot.deficit, investmentCoverage),
    [financialSnapshot.deficit, investmentCoverage]
  );

  const heroProgress = Math.min(100, Math.round((investingValue / Math.max(targetAmount, 1)) * 100));

  const insight = useMemo(() => {
    if (!selectedPortfolio)
      return "Build a portfolio to compare an investing path against savings only.";
    if (investingValue >= targetAmount)
      return "At this pace, your selected portfolio could help you reach your goal by the target date.";
    if (savingsOnlyValue >= targetAmount)
      return "Your current savings alone may already be enough to reach this goal. Investing mainly adds cushion.";
    return "At this pace, you may still fall short unless you increase monthly savings or extend the timeline.";
  }, [selectedPortfolio, investingValue, savingsOnlyValue, targetAmount]);

  const projectionChartData = useMemo(() => {
    const points = [];
    const step = Math.max(1, Math.ceil(monthsLeft / 24));
    const portfolioReturn = Number(selectedPortfolio?.expectedReturn || 0);
    for (let month = 0; month <= monthsLeft; month += step) {
      points.push({
        month,
        savingsOnly: Number(futureSavings(initialAmount, monthlyContribution, month).toFixed(2)),
        investing: Number(futureInvesting(initialAmount, monthlyContribution, portfolioReturn, month).toFixed(2)),
        target: Number(targetAmount),
      });
    }
    if (points[points.length - 1]?.month !== monthsLeft) {
      points.push({
        month: monthsLeft,
        savingsOnly: Number(futureSavings(initialAmount, monthlyContribution, monthsLeft).toFixed(2)),
        investing: Number(futureInvesting(initialAmount, monthlyContribution, portfolioReturn, monthsLeft).toFixed(2)),
        target: Number(targetAmount),
      });
    }
    return points;
  }, [monthsLeft, initialAmount, monthlyContribution, selectedPortfolio?.expectedReturn, targetAmount]);

  const comparisonBars = useMemo(() => [
    { label: "Savings Only", value: Number(savingsOnlyValue.toFixed(2)) },
    { label: "Portfolio",    value: Number(investingValue.toFixed(2)) },
    { label: "Goal",         value: Number(targetAmount || 0) },
  ], [savingsOnlyValue, investingValue, targetAmount]);

  async function handleSavePlan() {
    try {
      setSaving(true);
      setSaveMessage("");
      setSaveError("");

      if (!goalName.trim()) throw new Error("Please enter a goal name.");
      if (!targetDate) throw new Error("Please set a target date.");
      if (Number(targetAmount) <= 0) throw new Error("Target amount must be greater than 0.");
      if (!selectedPortfolio || !selectedPortfolio.holdings?.length)
        throw new Error("Please build a portfolio before saving.");

      const allocationTotal = selectedPortfolio.holdings.reduce(
        (sum, h) => sum + Number(h.allocation || 0), 0
      );
      if (Math.abs(allocationTotal - 100) > 0.01)
        throw new Error(`Portfolio allocations must total 100% (currently ${allocationTotal.toFixed(1)}%).`);

      const goalRes = await fetch(`${API_BASE}/investments/goals/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          goal_name: goalName.trim(),
          goal_type: goalType,
          target_amount: Number(targetAmount),
          monthly_contribution: Number(monthlyContribution),
          initial_amount: Number(initialAmount),
          target_date: targetDate,
          risk_level: riskLevel,
        }),
      });

      if (!goalRes.ok) {
        const err = await goalRes.json().catch(() => ({}));
        throw new Error(err.detail || JSON.stringify(err) || "Failed to save goal.");
      }

      const createdGoal = await goalRes.json();

      const portfolioRes = await fetch(`${API_BASE}/investments/portfolios/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          goal: createdGoal.id,
          portfolio_name: selectedPortfolio.name || "My Portfolio",
          portfolio_type: selectedPortfolio.type || "custom",
          expected_annual_return: Number(selectedPortfolio.expectedReturn || 0),
          holdings: selectedPortfolio.holdings.map((h) => ({
            symbol: h.symbol,
            asset_name: h.name,
            asset_type: h.type,
            allocation_percent: Number(h.allocation || 0),
            expected_annual_return: Number(h.expectedReturn || 0),
          })),
        }),
      });

      if (!portfolioRes.ok) {
        const err = await portfolioRes.json().catch(() => ({}));
        throw new Error(err.detail || JSON.stringify(err) || "Failed to save portfolio.");
      }

      setSaveMessage("Goal and portfolio saved successfully! ✅");
      sessionStorage.removeItem("portfolioDraft");
      sessionStorage.removeItem("goalDraft");
      setPortfolioDraft(null);
    } catch (err) {
      setSaveError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function goToBuilder() {
    const goalDraft = {
      goalName, goalType, targetAmount, targetDate,
      monthlyContribution, initialAmount, riskLevel,
    };
    sessionStorage.setItem("goalDraft", JSON.stringify(goalDraft));
    navigate("/investing/builder");
  }

  return (
    <div className="inv-page">
      <Navbar />

      {showInstructions && (
        <InstructionsModal
          title="How to Use the Goal Planner"
          steps={GOAL_PLANNER_STEPS}
          onClose={() => setShowInstructions(false)}
        />
      )}

      <div className="inv-body">
        <div className="inv-header">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1>Goal Planner</h1>
              <p>Set your goal, use your monthly savings baseline, and compare savings only versus your selected portfolio.</p>
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
            <div className="inv-card inv-hero" style={{ '--pct': `${heroProgress}%` }}>
              <h2>${money(investingValue)}</h2>
              <p>Projected value by your target date.</p>
              <div className="inv-heroMeta">
                <span>{selectedPortfolio?.name || "No portfolio selected"}</span>
                <span>{monthsLeft} month{monthsLeft === 1 ? "" : "s"} to goal</span>
                <span>+{Number(selectedPortfolio?.expectedReturn || 0)}% expected</span>
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
              <div className="inv-stat">
                <div className={`inv-statValue ${investmentCoverage > 0 ? "positive" : ""}`}>
                  ${money(investmentCoverage)}
                </div>
                <div className="inv-statLabel">Projected Gap Coverage</div>
              </div>
            </div>

            {/* 1. Savings Snapshot */}
            <div className="inv-card">
              <h2 className="inv-sectionTitle">1. Savings Snapshot</h2>
              <p className="inv-sectionSub">
                We use the savings estimate from your spending feature as the starting point.
                {netAnnualAfterAid != null && (
                  <>
                    {" "}
                    Your profile estimates a net annual school cost after aid of{" "}
                    <strong>${money(netAnnualAfterAid)}</strong> (about{" "}
                    <strong>${money(netAnnualAfterAid / 12)}</strong>/mo)—use monthly contribution toward tuition
                    goals alongside everyday savings.
                  </>
                )}
              </p>
              <div className="inv-formGrid">
                <div className="inv-field">
                  <label className="inv-label">Monthly Contribution</label>
                  <input
                    className="inv-input" type="number" min="0" step="0.01"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(Math.max(0, Number(e.target.value) || 0))}
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
                    className="inv-input" type="number" min="0" step="0.01"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(Math.max(0, Number(e.target.value) || 0))}
                  />
                  <div className="inv-hint">Any amount you already have saved.</div>
                </div>
              </div>
            </div>

            {/* 2. Goal Setup */}
            <div className="inv-card">
              <h2 className="inv-sectionTitle">2. Goal Setup</h2>
              <p className="inv-sectionSub">
                Set the target and timeline you want your portfolio to support.
              </p>
              <div className="inv-formGrid">
                <div className="inv-field full">
                  <label className="inv-label">Goal Name</label>
                  <input
                    className="inv-input" type="text"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                  />
                </div>
                <div className="inv-field">
                  <label className="inv-label">Goal Type</label>
                  <select className="inv-select" value={goalType} onChange={(e) => setGoalType(e.target.value)}>
                    <option value="laptop">Laptop</option>
                    <option value="tuition">Tuition</option>
                    <option value="travel">Travel</option>
                    <option value="emergency_fund">Emergency Fund</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="inv-field">
                  <label className="inv-label">Risk Preference</label>
                  <select className="inv-select" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
                    <option value="conservative">Conservative</option>
                    <option value="balanced">Balanced</option>
                    <option value="growth">Growth</option>
                  </select>
                </div>
                <div className="inv-field">
                  <label className="inv-label">Target Amount</label>
                  <input
                    className="inv-input" type="number" min="0" step="0.01"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div className="inv-field">
                  <label className="inv-label">Target Date</label>
                  <input
                    className="inv-input" type="date"
                    value={targetDate}
                    min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 3. Selected Portfolio */}
            <div className="inv-card">
              <h2 className="inv-sectionTitle">3. Selected Portfolio</h2>
              <p className="inv-sectionSub">
                Build or edit your portfolio on the portfolio builder page, then come back here to project the outcome.
              </p>
              {selectedPortfolio ? (
                <>
                  <div className="inv-compareBox" style={{ marginBottom: "1rem" }}>
                    <div className="inv-compareLabel">Portfolio</div>
                    <div className="inv-compareValue">{selectedPortfolio.name}</div>
                  </div>
                  <div className="inv-compareBox" style={{ marginBottom: "1rem" }}>
                    <div className="inv-compareLabel">Expected Return</div>
                    <div className="inv-compareValue" style={{ color: "#00b894" }}>
                      +{Number(selectedPortfolio.expectedReturn || 0)}%
                    </div>
                  </div>
                  <div className="inv-list" style={{ marginBottom: "1rem" }}>
                    {selectedPortfolio.holdings.map((holding) => (
                      <div className="inv-row" key={`${selectedPortfolio.id}-${holding.symbol}`}>
                        <div className="inv-rowLeft">
                          <div style={{
                            width: "34px", height: "34px", borderRadius: "9px", flexShrink: 0,
                            background: "#6366f122",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem",
                          }}>
                            {getEmoji(holding.symbol)}
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
                </>
              ) : (
                <div className="inv-hint" style={{ marginBottom: "1rem" }}>
                  No portfolio selected yet. Build one to compare an investing path against savings only.
                </div>
              )}
              <button className="inv-button" type="button" onClick={goToBuilder} style={{ width: "100%" }}>
                {selectedPortfolio ? "Build / Edit Portfolio" : "Build Portfolio"}
              </button>
            </div>

            {/* Comparison */}
            <div className="inv-card">
              <h2 className="inv-sectionTitle">Comparison</h2>
              <div className="inv-compareGrid">
                <div className="inv-compareBox">
                  <div className="inv-compareLabel">Savings Only by Target Date</div>
                  <div className="inv-compareValue">${money(savingsOnlyValue)}</div>
                </div>
                <div className="inv-compareBox">
                  <div className="inv-compareLabel">Portfolio Projection</div>
                  <div className="inv-compareValue positive">${money(investingValue)}</div>
                </div>
              </div>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={comparisonBars}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${money(value)}`} />
                    <Legend />
                    <Bar dataKey="value" name="Amount" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Projection Over Time */}
            <div className="inv-card">
              <h2 className="inv-sectionTitle">Projection Over Time</h2>
              <p className="inv-sectionSub">
                Compare savings-only growth with your selected portfolio up to your target date.
              </p>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={projectionChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" label={{ value: "Months", position: "insideBottom", offset: -2 }} />
                    <YAxis tickFormatter={(v) => `$${money(v)}`} />
                    <Tooltip formatter={(value) => `$${money(value)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="savingsOnly" name="Savings Only" stroke="#64748b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="investing"   name="Portfolio"    stroke="#6366f1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="target"      name="Target"       stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Guidance */}
            <div className="inv-card">
              <h2 className="inv-sectionTitle">Guidance</h2>
              <div className="inv-hint">
                {financialSnapshot.deficit > 0
                  ? `Your current monthly deficit is $${money(financialSnapshot.deficit)}. Based on the extra growth over saving only, this setup could cover about $${money(investmentCoverage)} (${investmentCoveragePercent}%) of that gap by your target date. `
                  : `Your current profile shows no monthly deficit. Any projected growth acts as extra cushion rather than gap coverage. `}
                {insight} This simulator uses hypothetical returns and is not investment advice.
              </div>
            </div>
          </div>

          <div>
            {/* Goal Snapshot */}
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
                <div className="inv-compareValue">{selectedPortfolio?.name || "—"}</div>
              </div>
              <div className="inv-compareBox" style={{ marginTop: "0.85rem" }}>
                <div className="inv-compareLabel">Current Monthly Deficit</div>
                <div className="inv-compareValue">${money(financialSnapshot.deficit)}</div>
              </div>
              <div className="inv-compareBox" style={{ marginTop: "0.85rem" }}>
                <div className="inv-compareLabel">Projected Gap Coverage</div>
                <div className="inv-compareValue">{investmentCoveragePercent}%</div>
              </div>
            </div>

            {/* Next Step */}
            <div className="inv-card">
              <h2 className="inv-sectionTitle">Next Step</h2>
              <div className="inv-hint" style={{ marginBottom: "1rem" }}>
                Search real assets, view charts, and build your portfolio on the builder page.
              </div>
              <button className="inv-button" type="button" onClick={goToBuilder} style={{ width: "100%" }}>
                Open Portfolio Builder
              </button>
            </div>

            {/* Save Plan */}
            <div className="inv-card">
              <h2 className="inv-sectionTitle">Save Plan</h2>
              {saveMessage && <div className="inv-hint success">{saveMessage}</div>}
              {saveError && <div className="inv-hint error">{saveError}</div>}
              <button
                className="inv-button" type="button"
                onClick={handleSavePlan}
                disabled={saving || !selectedPortfolio}
                style={{ width: "100%" }}
              >
                {saving ? "Saving..." : "Save Goal & Portfolio"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
