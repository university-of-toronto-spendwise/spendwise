import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlaidLink } from "react-plaid-link";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, authHeaders, fetchProfile } from "../utils/session";
import Navbar from "./Navbar";
import UpcomingDeadlines from "./UpcomingDeadlines";

const MONTH_OPTIONS = ["This Month", "Last Month", "3 Months", "Past Year"];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+3:wght@300;400;500;600&display=swap');

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

  body { font-family: inherit; }

  .db-page { min-height: 100vh; background: var(--off-white); font-family: inherit; }
  .db-body { max-width: 1200px; margin: 0 auto; padding: 2rem; }

  .db-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .db-header h1 { font-size: 1.9rem; font-weight: 800; color: var(--uoft-blue); margin: 0 0 0.25rem 0; }
  .db-header p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }

  .db-header-right { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-left:auto; justify-content:flex-end; }

  .pill {
    background: var(--white);
    border: 2px solid var(--border);
    border-radius: 999px;
    padding: 0.55rem 0.9rem;
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    color: var(--uoft-blue);
    font-weight: 700;
    cursor: pointer;
    user-select: none;
    position: relative;
  }

  .pill:focus-within, .pill:hover { border-color: var(--border-2); }
  .pill .chev { margin-left: 0.15rem; opacity: 0.75; font-size: 0.7em; }
  .db-period-pill { min-width: 200px; }
  .db-period-label { color: var(--text-muted); font-weight: 600; font-size: 0.88rem; }
  .db-period-value { font-weight: 800; color: var(--uoft-blue); }

  .menu {
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    width: 220px;
    background: var(--white);
    border: 2px solid var(--border);
    border-radius: 14px;
    box-shadow: var(--shadow);
    padding: 0.35rem;
    z-index: 50;
  }

  .menuItem { padding: 0.6rem 0.7rem; border-radius: 10px; font-weight: 700; color: var(--uoft-blue); cursor: pointer; }
  .menuItem:hover { background: #EAF0FF; }
  .menuItem.active { background: var(--uoft-blue); color: white; }

  .menuItem:hover { background: #EAF0FF; }
  .menuItem.active { background: #3B6BE3; color: white; }

  .pillToggle { gap: 0.65rem; padding: 0.55rem 1rem; }
  .dot { width: 14px; height: 14px; border-radius: 999px; border: 2px solid var(--border); background: #fff; }
  .dot.on { background: #B9C7E6; border-color: #B9C7E6; }

  .bank-cta {
    background: var(--uoft-blue);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 800;
    padding: 0.65rem 1rem;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 42, 92, 0.25);
  }
  .bank-cta:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

  .bank-status {
    margin-bottom: 1rem;
    border-radius: 12px;
    border: 2px solid #cbe6dc;
    background: #effaf5;
    color: #155d41;
    padding: 0.75rem 0.95rem;
    font-weight: 600;
  }

  .bank-status.error { border-color: #f2c7c3; background: #fff4f3; color: #8a2e25; }
  .bank-tabs {
    display: flex;
    gap: 0.55rem;
    flex-wrap: wrap;
    margin: 0 0 0.9rem;
  }
  .bank-tab { max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    border: 2px solid var(--border);
    background: #fff;
    color: var(--uoft-blue);
    font-weight: 700;
    border-radius: 999px;
    padding: 0.45rem 0.9rem;
    cursor: pointer;
  }
  .bank-tab:hover { border-color: var(--uoft-mid); color: var(--uoft-mid); }
  .bank-tab.active {
    background: var(--uoft-blue);
    border-color: var(--uoft-blue);
    color: #fff;
    box-shadow: 0 2px 8px rgba(0, 42, 92, 0.2);
  }
  .mini-grid {
    display:grid;
    grid-template-columns:repeat(4,minmax(0,1fr));
    gap:0.7rem;
  }
  .mini-card {
    background:#f7faff;
    border:2px solid rgba(208,219,232,0.75);
    border-radius:14px;
    padding:0.7rem 0.8rem;
  }
  .mini-title { color:var(--text-muted); font-size:0.8rem; font-weight:700; margin:0 0 0.2rem; }
  .mini-value { color:var(--uoft-blue); font-size:1.05rem; font-weight:900; margin:0; }
  .mini-value.neg { color: var(--danger); }
  .mini-value.pos { color: var(--success); }

  .db-grid { display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; align-items: start; }
  .db-main, .db-side { min-width: 0; }

  .card { background: var(--white); border: 2px solid var(--border); border-radius: 18px; padding: 1.25rem 1.5rem; }
  .card-title { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 0.85rem; }
  .card-title h2 { margin: 0; font-size: 1.02rem; font-weight: 900; color: var(--uoft-blue); }
  .link { color: var(--uoft-mid); font-weight: 800; font-size: 0.92rem; cursor: pointer; user-select: none; }

  .hero { background: linear-gradient(135deg, var(--uoft-blue), var(--uoft-mid)); color: white; border: none; box-shadow: var(--shadow); }
  .hero-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.9rem; }
  .hero-label { font-size: 0.85rem; opacity: 0.92; margin: 0 0 0.25rem 0; }
  .hero-amount { font-size: 1.9rem; font-weight: 900; margin: 0; letter-spacing: -0.02em; }
  .hero-change {
    background: rgba(255,255,255,0.14);
    border: 1px solid rgba(255,255,255,0.25);
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    font-weight: 900;
    font-size: 0.85rem;
    white-space: nowrap;
  }
  .hero-change.good { background: rgba(24,165,116,0.2); border-color: rgba(24,165,116,0.45); }
  .hero-change.bad { background: rgba(192,57,43,0.2); border-color: rgba(192,57,43,0.45); }
  .hero-change.neutral { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.35); }
  .hero-meta { display: flex; justify-content: space-between; opacity: 0.92; font-size: 0.88rem; margin-top: 0.6rem; }
  .progress { height: 8px; background: rgba(255,255,255,0.18); border-radius: 999px; overflow: hidden; margin-top: 0.7rem; }
  .progress > span { display: block; height: 100%; width: var(--pct, 60%); background: rgba(255,255,255,0.88); border-radius: 999px; }

  .actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.25rem; margin-top: 1.25rem; margin-bottom: 1.25rem; }
  .tile {
    background: var(--white);
    border: 2px solid var(--border);
    border-radius: 18px;
    padding: 1.15rem 1.2rem;
    cursor: pointer;
    transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
    display: flex;
    align-items: center;
    gap: 0.95rem;
    min-width: 0;
  }
  .tile:hover { border-color: var(--border-2); box-shadow: 0 6px 18px rgba(0,42,92,0.08); transform: translateY(-1px); }
  .tileIconWrap {
    width: 54px;
    height: 54px;
    border-radius: 16px;
    border: 2px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: #fff;
  }
  .tScholar { background: #FFF6E0; border-color: rgba(232,181,62,0.5); }
  .tBills { background: #EAF0FF; border-color: rgba(0,71,160,0.18); }
  .tCodes { background: #ECFDF5; border-color: rgba(24,165,116,0.18); }
  .tileTitle { font-weight: 900; color: var(--uoft-blue); font-size: 1.05rem; margin: 0 0 0.1rem 0; }
  .tileSub { margin: 0; color: var(--text-muted); font-size: 0.95rem; }

  .insightCardSpacing { margin-bottom: 1.25rem; }
  .insight { display: flex; gap: 0.85rem; align-items: flex-start; }
  .insightIcon {
    width: 54px;
    height: 54px;
    border-radius: 16px;
    background: #FFF6E0;
    border: 2px solid rgba(232,181,62,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 1.15rem;
  }
  .insight strong { display: block; color: var(--uoft-blue); font-weight: 900; font-size: 1.05rem; margin-bottom: 0.2rem; }
  .insight p { margin: 0; color: var(--text-muted); font-size: 1rem; line-height: 1.45; }

  .list { display: flex; flex-direction: column; gap: 0.95rem; }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.9rem;
    padding: 1rem;
    border-radius: 16px;
    background: #F7FAFF;
    border: 2px solid rgba(208,219,232,0.75);
  }
  .row-left { display: flex; gap: 0.9rem; align-items: center; min-width: 0; }
  .row-icon {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: #fff;
    border: 2px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 1.2rem;
  }
  .row-title { font-weight: 900; color: var(--uoft-blue); font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row-sub { color: var(--text-muted); font-size: 0.95rem; margin-top: 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .amt { font-weight: 900; font-size: 1.05rem; white-space: nowrap; }
  .amt.negative { color: var(--danger); }
  .amt.positive { color: var(--success); }
  .empty { color: var(--text-muted); font-size: 0.95rem; text-align: center; padding: 1.25rem 0; }

  .deadlineBadge {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    flex-shrink: 0;
    border: 2px solid var(--border);
    background: #fff;
  }
  .d-red { background: #FDECEC; color: var(--danger); border-color: rgba(192,57,43,0.25); }
  .d-yellow { background: #FFF6E0; color: #8A5A00; border-color: rgba(232,181,62,0.45); }
  .d-blue { background: #EAF0FF; color: var(--uoft-mid); border-color: rgba(0,71,160,0.25); }

  @media (max-width: 980px) {
    .db-grid { grid-template-columns: 1fr; }
    .db-side { order: 2; }
    .mini-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
  }

  @media (max-width: 720px) {
    .db-body { padding: 1.25rem 1rem; }
    .actions { grid-template-columns: 1fr; }
    .pill { width: 100%; justify-content: space-between; }
    .db-header { align-items: flex-start; }
    .menu { width: 100%; }
  }
`;

const API = "/api";
const token = () => sessionStorage.getItem("userAccessToken") || sessionStorage.getItem("userToken");
const authHeaders = () => {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
};
const refreshAccessToken = async () => {
  const refresh = sessionStorage.getItem("userRefreshToken");
  if (!refresh) return null;
  const res = await fetch(`${API}/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.access) return null;
  sessionStorage.setItem("userToken", data.access);
  sessionStorage.setItem("userAccessToken", data.access);
  return data.access;
};
const fetchWithAuth = async (url) => {
  let t = token();
  if (!t) return { ok: false, status: 401 };
  let res = await fetch(url, { headers: { ...authHeaders() } });
  if (res.status === 401) {
    const newT = await refreshAccessToken();
    if (newT) res = await fetch(url, { headers: { Authorization: `Bearer ${newT}` } });
  }
  return res;
};

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
        <div className="insightIcon">AI</div>
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
    fetch("/api/plaid/link-token/", { method: "POST", headers: { ...authHeaders() } })
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
        const resp = await fetch("/api/plaid/exchange-token/", {
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
          fetch(`/api/plaid/items/${itemId}/accounts/`, { headers: { ...authHeaders() } }),
          fetch(`/api/plaid/items/${itemId}/transactions/?days=180&count=500`, { headers: { ...authHeaders() } }),
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
    const accResp = await fetch("/api/plaid/bank-accounts/", { headers: { ...authHeaders() } });
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
        const itemResp = await fetch("/api/plaid/items/", { headers: { ...authHeaders() } });
        if (itemResp.ok) {
          const payload = await itemResp.json();
          const items = payload?.items || [];
          setBankCount(items.length);

          if (items.length) {
            await Promise.all(
              items.map((it) =>
                Promise.all([
                  fetch(`/api/plaid/items/${it.item_id}/accounts/`, { headers: { ...authHeaders() } }),
                  fetch(`/api/plaid/items/${it.item_id}/transactions/?days=180&count=500`, { headers: { ...authHeaders() } }),
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
    fetchWithAuth(`${API}/me/`).then((res) => {
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
            fetch(`/api/spending/monthly_transactions/?month=${m}&year=${y}${accountQuery}`, { headers: { ...authHeaders() } }),
            fetch(`/api/spending/total_expenses_amount/?month=${m}&year=${y}${accountQuery}`, { headers: { ...authHeaders() } }),
            fetch(`/api/spending/monthly_saving_amount/?month=${m}&year=${y}${accountQuery}`, { headers: { ...authHeaders() } }),
          ]);

          return { txResp, expenseResp, savingResp };
        })
      );

      const previousExpenseFetches = await Promise.all(
        previousPeriodMonths.map(async ({ month: m, year: y }) =>
          fetch(`/api/spending/total_expenses_amount/?month=${m}&year=${y}${accountQuery}`, { headers: { ...authHeaders() } })
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
      <style>{styles}</style>
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
                icon="SC"
                title="Scholarships"
                subtitle="Explore matched awards"
                toneClass="tScholar"
                onClick={() => navigate("/scholarships")}
              />
              <QuickTile
                icon="BL"
                title="Bills"
                subtitle="View upcoming bills"
                toneClass="tBills"
                onClick={() => navigate("/bills")}
              />
              <QuickTile
                icon="CD"
                title="Student Codes"
                subtitle="Apply a discount code"
                toneClass="tCodes"
                onClick={() => navigate("/student-codes")}
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
            <div className="card">
              <div className="card-title">
                <h2>Upcoming Deadlines</h2>
              </div>
              {DEADLINES.length === 0 ? (
                <div className="empty">No upcoming deadlines found.</div>
              ) : (
                <div className="list">
                  {DEADLINES.map((d) => (
                    <div className="row" key={d.id}>
                      <div className="row-left">
                        <div className={`deadlineBadge ${d.badgeClass}`}>{d.day}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="row-title">{d.title}</div>
                          <div className="row-sub">{d.meta}</div>
                        </div>
                      </div>
                      <div style={{ color: "var(--text-muted)", fontWeight: 900 }}>›</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}