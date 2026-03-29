import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlaidLink } from "react-plaid-link";
import { API_BASE_URL, authHeaders, fetchWithAuth } from "../utils/session";
import Navbar from "./Navbar";
import UpcomingDeadlines from "./UpcomingDeadlines";

const MONTH_OPTIONS = ["This Month", "Last Month", "3 Months", "Past Year"];

/** Time-based greeting using the user's local timezone. X = first name. */
function getGreeting(firstName) {
  const name = (firstName || "").trim() || "there";
  const hour = new Date().getHours();
  const morning = ["Good morning", "Rise and shine", "Morning"];
  const afternoon = ["Good afternoon", "Hey there", "Welcome back"];
  const evening = ["Good evening", "Welcome back", "Evening"];
  const night = ["Good night", "Late night vibes", "Burning the midnight oil"];
  let list;
  if (hour >= 5 && hour < 12) list = morning;
  else if (hour >= 12 && hour < 17) list = afternoon;
  else if (hour >= 17 && hour < 21) list = evening;
  else list = night;
  const prefix = list[hour % list.length];
  if (prefix === "Hey there" || prefix === "Welcome back" || prefix === "Rise and shine") return `${prefix}, ${name}!`;
  if (prefix === "Morning" || prefix === "Evening") return `${prefix}, ${name}!`;
  if (prefix === "Late night vibes") return `${prefix}, ${name}!`;
  if (prefix === "Burning the midnight oil") return `${prefix}, ${name}!`;
  return `${prefix}, ${name}`;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const getPeriodLength = (label) => {
  if (label === "3 Months") return 3;
  if (label === "Past Year") return 12;
  return 1;
};

const monthYearForLabel = (label, windowShift = 0) => {
  const today = new Date();
  const baseOffset = label === "Last Month" ? 1 : 0;
  const totalMonths = getPeriodLength(label);
  const entries = [];
  for (let i = 0; i < totalMonths; i += 1) {
    const d = new Date(today.getFullYear(), today.getMonth() - baseOffset - windowShift - i, 1);
    entries.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }
  return entries;
};

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function connectIconForTransaction(category) {
  const c = String(category || "").toLowerCase();
  if (c.includes("food") || c.includes("restaurant")) return "FD";
  if (c.includes("transport") || c.includes("travel") || c.includes("transit")) return "TR";
  if (c.includes("shop") || c.includes("retail")) return "SH";
  if (c.includes("income") || c.includes("deposit")) return "IN";
  return "TX";
}

function relativeDateLabel(dateText) {
  if (!dateText) return "Unknown date";
  const d = new Date(`${dateText}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const input = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today - input) / (24 * 60 * 60 * 1000));

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function HeroSpendingCard({ monthLabel, total, budget, deltaPct }) {
  const pctUsed = Math.min(100, Math.round((total / (budget || 1)) * 100));
  const absDelta = Math.abs(deltaPct || 0);
  const trendClass = deltaPct > 0 ? "bad" : deltaPct < 0 ? "good" : "neutral";
  const trendText =
    deltaPct > 0
      ? `Up ${absDelta}% vs last period`
      : deltaPct < 0
        ? `Down ${absDelta}% vs last period`
        : "No change vs last period";

  return (
    <div className="card hero" style={{ ["--pct"]: `${pctUsed}%` }}>
      <div className="hero-top">
        <div>
          <p className="hero-label">Monthly Spending - {monthLabel}</p>
          <p className="hero-amount">${fmtMoney(total)}</p>
        </div>
        <div className={`hero-change ${trendClass}`}>{trendText}</div>
      </div>

      <div className="hero-meta">
        <span>Budget: ${budget.toLocaleString()}/mo</span>
        <span>{pctUsed}% used</span>
      </div>

      <div className="progress">
        <span />
      </div>
    </div>
  );
}

function shortAccountLabel(label) {
  const text = String(label || "");
  if (text.length <= 15) return text;
  return `${text.slice(0, 12)}...`;
}

const ScholarshipIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 14l9-5-9-5-9 5 9 5z"/>
    <path d="M12 14l6.16-3.422a12 12 0 0 1.665 6.479A11.96 11.96 0 0 0 12 20.055a11.96 11.96 0 0 0-7.825-2.998 12 12 0 0 1 .665-6.479L12 14z"/>
  </svg>
);
const StudentCodesIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const InvestmentsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const InsightIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6"/>
    <path d="M10 22h4"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
  </svg>
);

function QuickTile({ icon, title, subtitle, toneClass, onClick }) {
  return (
    <div className="tile" onClick={onClick} role="button" tabIndex={0}>
      <div className={`tileIconWrap ${toneClass}`}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div className="tileTitle">{title}</div>
        <p className="tileSub">{subtitle}</p>
      </div>
    </div>
  );
}

function TransactionList({ items }) {
  if (!items.length) return <div className="empty">No transactions yet.</div>;

  return (
    <div className="list">
      {items.map((t) => (
        <div className="row" key={t.id}>
          <div className="row-left">
            <div className="row-icon">{t.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div className="row-title">{t.name}</div>
              <div className="row-sub">{t.when}</div>
            </div>
          </div>
          <div className={`amt ${t.tone}`}>{t.amount}</div>
        </div>
      ))}
    </div>
  );
}

function InsightCard({ title, message }) {
  return (
    <div className="card">
      <div className="insight">
        <div className="insightIcon"><InsightIcon /></div>
        <div>
          <strong>{title}</strong>
          <p>{message}</p>
        </div>
      </div>
    </div>
  );
}

function MonthDropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pill" onClick={() => setOpen((v) => !v)} role="button" tabIndex={0} aria-label="Select month">
      <span>Date</span>
      <span>{value}</span>
      <span className="chev">v</span>

      {open && (
        <div className="menu" onClick={(e) => e.stopPropagation()}>
          {options.map((opt) => (
            <div key={opt} className={`menuItem ${opt === value ? "active" : ""}`} onClick={() => { onChange(opt); setOpen(false); }}>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectBankButton({ onLinked, onError }) {
  const [linkToken, setLinkToken] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/plaid/link-token/`, { method: "POST", headers: { ...authHeaders() } })
      .then(async (r) => {
        if (!r.ok) throw new Error("Unable to initialize Plaid Link");
        return r.json();
      })
      .then((data) => setLinkToken(data.link_token))
      .catch((e) => onError(e.message));
  }, [onError]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      setBusy(true);
      try {
        const resp = await fetch(`${API_BASE_URL}/plaid/exchange-token/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            public_token: publicToken,
            institution: metadata?.institution || {},
          }),
        });

        const payload = await resp.json();
        if (!resp.ok) throw new Error(payload?.error || "Failed to connect bank account");

        const itemId = payload.item_id;
        await Promise.all([
          fetch(`${API_BASE_URL}/plaid/items/${itemId}/accounts/`, { headers: { ...authHeaders() } }),
          fetch(`${API_BASE_URL}/plaid/items/${itemId}/transactions/?days=180&count=500`, { headers: { ...authHeaders() } }),
        ]);

        onLinked(payload);
      } catch (e) {
        onError(e.message);
      } finally {
        setBusy(false);
      }
    },
    onExit: (err) => {
      if (err) onError(err.display_message || err.error_message || "Plaid connection cancelled");
    },
  });

  return (
    <button className="bank-cta" onClick={() => open()} disabled={!ready || busy}>
      {busy ? "Connecting..." : "Connect Bank Account"}
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [month, setMonth] = useState("This Month");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [onlyImportant, setOnlyImportant] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [bankCount, setBankCount] = useState(0);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalSavings, setTotalSavings] = useState(0);
  const [deltaPct, setDeltaPct] = useState(0);
  const [monthlyDetail, setMonthlyDetail] = useState({
    transactions: 0,
    expenseTx: 0,
    incomeTx: 0,
    avgExpense: 0,
    avgIncome: 0,
    net: 0,
    totalIncome: 0,
    totalExpense: 0,
    periodMonths: 1,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const budget = 2200;
  const selectedBankName =
    selectedAccountId && bankAccounts.find((b) => b.id === selectedAccountId)?.name;
  const selectedBankNameShort = selectedBankName ? shortAccountLabel(selectedBankName) : "";

  const fetchBankAccounts = async () => {
    const accResp = await fetch(`${API_BASE_URL}/plaid/bank-accounts/`, { headers: { ...authHeaders() } });
    if (!accResp.ok) return [];
    const payload = await accResp.json();
    const rows = Array.isArray(payload?.accounts) ? payload.accounts : [];
    const unique = [];
    const seen = new Set();
    for (const row of rows) {
      const id = row?.account_id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const label =
        row?.official_name ||
        row?.name ||
        `${row?.item__institution_name || "Bank"} ${row?.mask ? `...${row.mask}` : ""}`;
      unique.push({ id, name: label });
    }
    const capped = unique.slice(0, 5);
    setBankAccounts(capped);
    return capped;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const itemResp = await fetch(`${API_BASE_URL}/plaid/items/`, { headers: { ...authHeaders() } });
        if (itemResp.ok) {
          const payload = await itemResp.json();
          const items = payload?.items || [];
          setBankCount(items.length);

          if (items.length) {
            await Promise.all(
              items.map((it) =>
                Promise.all([
                  fetch(`${API_BASE_URL}/plaid/items/${it.item_id}/accounts/`, { headers: { ...authHeaders() } }),
                  fetch(`${API_BASE_URL}/plaid/items/${it.item_id}/transactions/?days=180&count=500`, { headers: { ...authHeaders() } }),
                ])
              )
            );
          }

          await fetchBankAccounts();
        }
      } catch {
        setStatusError(true);
        setStatusMessage("Could not sync your connected bank data right now.");
      }
    };

    load();
  }, [reloadKey]);

  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL}/me/`).then((res) => {
      if (res.ok) res.json().then((data) => setFirstName(data?.first_name || ""));
    });
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;
    if (!bankAccounts.some((acc) => acc.id === selectedAccountId)) {
      setSelectedAccountId("");
    }
  }, [bankAccounts, selectedAccountId]);

  useEffect(() => {
    const loadMonthData = async () => {
      const periodMonths = monthYearForLabel(month);
      const previousPeriodMonths = monthYearForLabel(month, getPeriodLength(month));
      const accountQuery = selectedAccountId ? `&account_id=${encodeURIComponent(selectedAccountId)}` : "";

      const selectedPeriodFetches = await Promise.all(
        periodMonths.map(async ({ month: m, year: y }) => {
          const [txResp, expenseResp, savingResp] = await Promise.all([
            fetch(`${API_BASE_URL}/spending/monthly_transactions/?month=${m}&year=${y}${accountQuery}`, { headers: { ...authHeaders() } }),
            fetch(`${API_BASE_URL}/spending/total_expenses_amount/?month=${m}&year=${y}${accountQuery}`, { headers: { ...authHeaders() } }),
            fetch(`${API_BASE_URL}/spending/monthly_saving_amount/?month=${m}&year=${y}${accountQuery}`, { headers: { ...authHeaders() } }),
          ]);

          return { txResp, expenseResp, savingResp };
        })
      );

      const previousExpenseFetches = await Promise.all(
        previousPeriodMonths.map(async ({ month: m, year: y }) =>
          fetch(`${API_BASE_URL}/spending/total_expenses_amount/?month=${m}&year=${y}${accountQuery}`, { headers: { ...authHeaders() } })
        )
      );

      if (
        selectedPeriodFetches.some((r) => !r.txResp.ok || !r.expenseResp.ok || !r.savingResp.ok) ||
        previousExpenseFetches.some((r) => !r.ok)
      ) {
        setStatusError(true);
        setStatusMessage("Could not load all dashboard data. Please refresh.");
        return;
      }

      const txPayloads = await Promise.all(selectedPeriodFetches.map((r) => r.txResp.json()));
      const expensePayloads = await Promise.all(selectedPeriodFetches.map((r) => r.expenseResp.json()));
      const savingPayloads = await Promise.all(selectedPeriodFetches.map((r) => r.savingResp.json()));
      const prevExpensePayloads = await Promise.all(previousExpenseFetches.map((r) => r.json()));

      const txData = txPayloads.flatMap((rows) => (Array.isArray(rows) ? rows : []));
      const expenseTotal = expensePayloads.reduce((sum, p) => sum + Number(p?.total_expenses || 0), 0);
      const savingTotal = savingPayloads.reduce((sum, p) => sum + Number(p?.total_saving || 0), 0);
      const prevExpenseTotal = prevExpensePayloads.reduce((sum, p) => sum + Number(p?.total_expenses || 0), 0);

      const ordered = [...(Array.isArray(txData) ? txData : [])].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      const mapped = ordered.map((t) => {
        const amountNum = Number(t.amount || 0);
        return {
          id: `${t.account_id}-${t.date}-${t.name}-${t.amount}`,
          icon: connectIconForTransaction(t.category),
          name: t.merchant_name || t.name || "Transaction",
          when: relativeDateLabel(t.date),
          amount: `${amountNum < 0 ? "-" : "+"}$${fmtMoney(Math.abs(amountNum))}`,
          tone: amountNum < 0 ? "negative" : "positive",
          important: Math.abs(amountNum) >= 50,
        };
      });

      const currentTotal = expenseTotal;
      const previousTotal = prevExpenseTotal;
      const monthlyDelta = previousTotal > 0 ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100) : 0;
      const expenseRows = ordered.filter((tx) => Number(tx.amount) < 0);
      const incomeRows = ordered.filter((tx) => Number(tx.amount) >= 0);
      const totalIncome = incomeRows.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const totalExpense = Math.abs(expenseRows.reduce((sum, tx) => sum + Number(tx.amount || 0), 0));

      setRecentTransactions(mapped);
      setTotalExpenses(currentTotal);
      setTotalSavings(savingTotal);
      setDeltaPct(monthlyDelta);
      setMonthlyDetail({
        transactions: ordered.length,
        expenseTx: expenseRows.length,
        incomeTx: incomeRows.length,
        avgExpense: expenseRows.length ? totalExpense / expenseRows.length : 0,
        avgIncome: incomeRows.length ? totalIncome / incomeRows.length : 0,
        net: totalIncome - totalExpense,
        totalIncome,
        totalExpense,
        periodMonths: getPeriodLength(month),
      });
    };

    loadMonthData();
  }, [month, reloadKey, selectedAccountId]);

  const spendingSummary = useMemo(() => {
    const periodMonths = Math.max(1, monthlyDetail.periodMonths || 1);
    const avgMonthlyExpense = (monthlyDetail.totalExpense || totalExpenses || 0) / periodMonths;
    const avgMonthlyIncome = (monthlyDetail.totalIncome || 0) / periodMonths;

    let recommendedBudget = avgMonthlyIncome > 0 ? avgMonthlyIncome * 0.6 : avgMonthlyExpense * 1.15;
    if (!Number.isFinite(recommendedBudget) || recommendedBudget <= 0) recommendedBudget = budget;
    recommendedBudget = Math.max(500, Math.round(recommendedBudget / 50) * 50);

    return { total: totalExpenses, budget: recommendedBudget, deltaPct };
  }, [monthlyDetail, totalExpenses, deltaPct, budget]);

  const visibleTransactions = useMemo(() => {
    const base = onlyImportant ? recentTransactions.filter((t) => t.important) : recentTransactions;
    return showAll ? base : base.slice(0, 4);
  }, [onlyImportant, recentTransactions, showAll]);

  return (
    <div className="db-page">
      <Navbar />

      <div className="db-body">
        {statusMessage && (
          <div className={`bank-status ${statusError ? "error" : ""}`}>{statusMessage}</div>
        )}

        <div className="db-header">
          <div>
            <h1>{getGreeting(firstName)}</h1>
            <p>
              {bankCount > 0
                ? `Live overview from ${bankCount} connected bank account${bankCount > 1 ? "s" : ""}${selectedBankNameShort ? ` - ${selectedBankNameShort}` : ""}.`
                : "Connect a bank account to start seeing real transactions."}
            </p>
          </div>

          <div className="db-header-right">
            <ConnectBankButton
              onLinked={(payload) => {
                setStatusError(false);
                setStatusMessage(payload?.message || "Bank account connected successfully.");
                setBankCount((n) => n + 1);
                setReloadKey((k) => k + 1);
              }}
              onError={(msg) => {
                setStatusError(true);
                setStatusMessage(msg || "Could not connect bank account.");
              }}
            />

            <MonthDropdown value={month} onChange={setMonth} options={MONTH_OPTIONS} />

            <div className="pill pillToggle" onClick={() => setOnlyImportant((v) => !v)} role="button" tabIndex={0}>
              <span className={`dot ${onlyImportant ? "on" : ""}`} />
              <span>Only important</span>
            </div>
          </div>
        </div>

        <div className="db-grid">
          <div className="db-main">
            {bankAccounts.length > 0 && (
              <div className="bank-tabs">
                <button
                  type="button"
                  className={`bank-tab ${selectedAccountId === "" ? "active" : ""}`}
                  onClick={() => setSelectedAccountId("")}
                >
                  All
                </button>
                {bankAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    className={`bank-tab ${selectedAccountId === acc.id ? "active" : ""}`}
                    onClick={() => setSelectedAccountId(acc.id)}
                    title={acc.name}
                  >
                    {shortAccountLabel(acc.name)}
                  </button>
                ))}
              </div>
            )}

            <HeroSpendingCard
              monthLabel={month}
              total={spendingSummary.total}
              budget={spendingSummary.budget}
              deltaPct={spendingSummary.deltaPct}
            />

            <div className="card" style={{ marginTop: "0.8rem", marginBottom: "1rem", padding: "0.95rem 1rem" }}>
              <div className="card-title">
                <h2>Monthly Spending Details</h2>
              </div>
              <div className="mini-grid">
                <div className="mini-card">
                  <p className="mini-title">Transactions</p>
                  <p className="mini-value">{monthlyDetail.transactions}</p>
                </div>
                <div className="mini-card">
                  <p className="mini-title">Avg Expense</p>
                  <p className="mini-value neg">${fmtMoney(monthlyDetail.avgExpense)}</p>
                </div>
                <div className="mini-card">
                  <p className="mini-title">Avg Income</p>
                  <p className="mini-value pos">${fmtMoney(monthlyDetail.avgIncome)}</p>
                </div>
                <div className="mini-card">
                  <p className="mini-title">Net Cash Flow</p>
                  <p className={`mini-value ${monthlyDetail.net >= 0 ? "pos" : "neg"}`}>
                    {monthlyDetail.net >= 0 ? "+" : "-"}${fmtMoney(Math.abs(monthlyDetail.net))}
                  </p>
                </div>
              </div>
            </div>

            <div className="actions">
              <QuickTile
                icon={<ScholarshipIcon />}
                title="Scholarships"
                subtitle="Explore matched awards"
                toneClass="tScholar"
                onClick={() => navigate("/scholarships")}
              />
              <QuickTile
                icon={<StudentCodesIcon />}
                title="Student Codes"
                subtitle="Apply a discount code"
                toneClass="tCodes"
                onClick={() => navigate("/student-codes")}
              /><QuickTile
                icon={<InvestmentsIcon />}
                title="Your Investments"
                subtitle="Your Monthly Investments"
                toneClass="tInvestment"
                onClick={() => navigate("/investing")}
              />

            </div>

            <div className="insightCardSpacing">
              <InsightCard
                title="Smart Insight"
                message={`You could save about $${fmtMoney(totalSavings)} this month by reducing repeated spending patterns.`}
              />
            </div>

            <div className="card">
              <div className="card-title">
                <h2>Recent Transactions</h2>
                <div className="link" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Show less" : "See all"}
                </div>
              </div>

              <TransactionList items={visibleTransactions} />
            </div>
          </div>

	          <div className="db-side">
	            <UpcomingDeadlines />
	          </div>
	        </div>
	      </div>
	    </div>
	  );
}
