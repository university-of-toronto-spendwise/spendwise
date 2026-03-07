import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { API_BASE_URL, fetchProfile } from "../utils/session";

const MONTH_OPTIONS = ["This Month", "Last Month", "2 Months Ago"];

const TRANSACTIONS = [
  {
    id: 1,
    icon: "☕",
    name: "Tim Hortons",
    when: "Today, 2:34 PM",
    amount: "-$6.45",
    tone: "negative",
    important: false,
  },
  {
    id: 2,
    icon: "📘",
    name: "UofT Bookstore",
    when: "Yesterday, 11:20 AM",
    amount: "-$89.99",
    tone: "negative",
    important: true,
  },
  {
    id: 3,
    icon: "💸",
    name: "OSAP Deposit",
    when: "Feb 15, 2026",
    amount: "+$3,200",
    tone: "positive",
    important: true,
  },
  {
    id: 4,
    icon: "🛒",
    name: "Amazon.ca",
    when: "Feb 14, 2026",
    amount: "-$34.50",
    tone: "negative",
    important: false,
  },
  {
    id: 5,
    icon: "🎵",
    name: "Spotify",
    when: "Feb 12, 2026",
    amount: "-$5.99",
    tone: "negative",
    important: false,
  },
  {
    id: 6,
    icon: "🚇",
    name: "TTC Presto",
    when: "Feb 10, 2026",
    amount: "-$25.00",
    tone: "negative",
    important: false,
  },
  {
    id: 7,
    icon: "🍔",
    name: "Uber Eats",
    when: "Feb 09, 2026",
    amount: "-$18.40",
    tone: "negative",
    important: true,
  },
  {
    id: 8,
    icon: "🧾",
    name: "Phone Plan",
    when: "Feb 07, 2026",
    amount: "-$55.00",
    tone: "negative",
    important: true,
  },
];

const DEADLINES = [
  {
    id: 1,
    day: "28",
    title: "OSAP Application",
    meta: "Due Feb 28 — 6 days left",
    badgeClass: "d-red",
  },
  {
    id: 2,
    day: "01",
    title: "Rogers Phone Bill",
    meta: "Due Mar 1 — $55.00",
    badgeClass: "d-yellow",
  },
  {
    id: 3,
    day: "15",
    title: "Lester B. Pearson Scholarship",
    meta: "Due Mar 15 — $10,000 award",
    badgeClass: "d-blue",
  },
  {
    id: 4,
    day: "18",
    title: "UofT Scholarship",
    meta: "Due Mar 18 — $5,000 award",
    badgeClass: "d-blue",
  },
];

const FALLBACK_SCHOLARSHIPS = [
  {
    id: "fallback-1",
    title: "Lester B. Pearson International Scholarship",
    amount: 10000,
    deadline: "2026-03-15",
    url: "/scholarships",
    offered_by: "University of Toronto",
  },
  {
    id: "fallback-2",
    title: "U of T Scholars Program",
    amount: 7500,
    deadline: "2026-03-20",
    url: "/scholarships",
    offered_by: "University of Toronto",
  },
  {
    id: "fallback-3",
    title: "In-Course Financial Need Bursary",
    amount: 5000,
    deadline: "2026-03-28",
    url: "/scholarships",
    offered_by: "Enrolment Services",
  },
  {
    id: "fallback-4",
    title: "Scotiabank Entrance Award",
    amount: 3000,
    deadline: "2026-04-02",
    url: "/scholarships",
    offered_by: "External Sponsor",
  },
];

const EXPIRING_CODES = [
  {
    id: "code-1",
    brand: "Adobe",
    discount: "65% off Creative Cloud",
    code: "STUDENT65",
    expiresOn: "2026-03-10",
    url: "https://www.adobe.com/ca/creativecloud/buy/students.html",
  },
  {
    id: "code-2",
    brand: "DoorDash",
    discount: "25% off 3 orders",
    code: "CAMPUS25",
    expiresOn: "2026-03-12",
    url: "https://www.doordash.com/",
  },
  {
    id: "code-3",
    brand: "Headspace",
    discount: "85% off annual plan",
    code: "STUDYCALM",
    expiresOn: "2026-03-14",
    url: "https://www.headspace.com/studentplan",
  },
  {
    id: "code-4",
    brand: "Lenovo",
    discount: "Extra 10% student deal",
    code: "SCHOOL10",
    expiresOn: "2026-03-16",
    url: "https://www.lenovo.com/ca/en/student-discounts/",
  },
];

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
    --success-bg: #EAF7EF;
    --danger: #C0392B;
    --danger-bg: #FEF0EE;
    --neutral-bg: #EEF3FA;

    --shadow: 0 4px 16px rgba(0,42,92,0.08);
  }

  body { font-family: 'Source Sans 3', sans-serif; }

  .db-page {
    min-height: 100vh;
    background: var(--off-white);
    font-family: 'Source Sans 3', sans-serif;
  }

  .db-body {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .db-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .db-header h1 {
    font-size: 1.9rem;
    font-weight: 800;
    color: var(--uoft-blue);
    margin: 0 0 0.25rem 0;
  }

  .db-header p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  .db-header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

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

  .pill:focus-within,
  .pill:hover {
    border-color: var(--border-2);
  }

  .pill .chev {
    margin-left: 0.15rem;
    opacity: 0.75;
  }

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

  .menuItem {
    padding: 0.6rem 0.7rem;
    border-radius: 10px;
    font-weight: 700;
    color: var(--uoft-blue);
    cursor: pointer;
  }

  .menuItem:hover { background: #EAF0FF; }

  .menuItem.active {
    background: #3B6BE3;
    color: white;
  }

  .pillToggle {
    gap: 0.65rem;
    padding: 0.55rem 1rem;
  }

  .dot {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    border: 2px solid var(--border);
    background: #fff;
  }

  .dot.on {
    background: #B9C7E6;
    border-color: #B9C7E6;
  }

  .db-grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 1.5rem;
    align-items: start;
  }

  .db-main, .db-side { min-width: 0; }

  .card {
    background: var(--white);
    border: 2px solid var(--border);
    border-radius: 18px;
    padding: 1.25rem 1.5rem;
  }

  .card + .card,
  .card + .insightCardSpacing,
  .insightCardSpacing + .card {
    margin-top: 1.25rem;
  }

  .card-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.85rem;
  }

  .card-title h2 {
    margin: 0;
    font-size: 1.02rem;
    font-weight: 900;
    color: var(--uoft-blue);
  }

  .link {
    color: var(--uoft-mid);
    font-weight: 800;
    font-size: 0.92rem;
    cursor: pointer;
    user-select: none;
  }

  .hero {
    background: linear-gradient(135deg, var(--uoft-blue), var(--uoft-mid));
    color: white;
    border: none;
    box-shadow: var(--shadow);
  }

  .hero-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 0.9rem;
  }

  .hero-label {
    font-size: 0.85rem;
    opacity: 0.92;
    margin: 0 0 0.25rem 0;
  }

  .hero-amount {
    font-size: 1.9rem;
    font-weight: 900;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .hero-change {
    background: rgba(255,255,255,0.14);
    border: 1px solid rgba(255,255,255,0.25);
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    font-weight: 900;
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .hero-meta {
    display: flex;
    justify-content: space-between;
    opacity: 0.92;
    font-size: 0.88rem;
    margin-top: 0.6rem;
  }

  .progress {
    height: 8px;
    background: rgba(255,255,255,0.18);
    border-radius: 999px;
    overflow: hidden;
    margin-top: 0.7rem;
  }

  .progress > span {
    display: block;
    height: 100%;
    width: var(--pct, 60%);
    background: rgba(255,255,255,0.88);
    border-radius: 999px;
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.25rem;
    margin-top: 1.25rem;
    margin-bottom: 1.25rem;
  }

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

  .tile:hover {
    border-color: var(--border-2);
    box-shadow: 0 6px 18px rgba(0,42,92,0.08);
    transform: translateY(-1px);
  }

  .tile:active { transform: translateY(0); }

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

  .tileTitle {
    font-weight: 900;
    color: var(--uoft-blue);
    font-size: 1.05rem;
    margin: 0 0 0.1rem 0;
  }

  .tileSub {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  .financial-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  .financial-stat {
    padding: 1rem;
    border-radius: 16px;
    background: #F7FAFF;
    border: 2px solid rgba(208,219,232,0.75);
  }

  .financial-label {
    display: block;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 0.45rem;
  }

  .financial-value {
    font-size: 1.45rem;
    font-weight: 900;
    color: var(--uoft-blue);
  }

  .financial-value.positive { color: var(--success); }
  .financial-value.negative { color: var(--danger); }

  .financial-footnote {
    margin: 1rem 0 0;
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .insightCardSpacing { margin-bottom: 1.25rem; }

  .insight {
    display: flex;
    gap: 0.85rem;
    align-items: flex-start;
  }

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

  .insight.warning .insightIcon {
    background: var(--danger-bg);
    border-color: rgba(192,57,43,0.2);
  }

  .insight.success .insightIcon {
    background: var(--success-bg);
    border-color: rgba(24,165,116,0.2);
  }

  .insight.neutral .insightIcon {
    background: var(--neutral-bg);
    border-color: rgba(0,71,160,0.15);
  }

  .insight strong {
    display: block;
    color: var(--uoft-blue);
    font-weight: 900;
    font-size: 1.05rem;
    margin-bottom: 0.2rem;
  }

  .insight p {
    margin: 0;
    color: var(--text-muted);
    font-size: 1rem;
    line-height: 1.45;
  }

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

  .row-left {
    display: flex;
    gap: 0.9rem;
    align-items: center;
    min-width: 0;
  }

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

  .row-title {
    font-weight: 900;
    color: var(--uoft-blue);
    font-size: 1.05rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-sub {
    color: var(--text-muted);
    font-size: 0.95rem;
    margin-top: 0.15rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .amt {
    font-weight: 900;
    font-size: 1.05rem;
    white-space: nowrap;
  }

  .amt.negative { color: var(--danger); }
  .amt.positive { color: var(--success); }

  .empty {
    color: var(--text-muted);
    font-size: 0.95rem;
    text-align: center;
    padding: 1.25rem 0;
  }

  .subtle {
    margin-top: 0.85rem;
    color: var(--text-muted);
    font-size: 0.87rem;
  }

  .scholarship-list,
  .codes-list {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .mini-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem;
    border-radius: 16px;
    background: #F7FAFF;
    border: 2px solid rgba(208,219,232,0.75);
  }

  .mini-row-main {
    min-width: 0;
  }

  .mini-row-main h3 {
    margin: 0;
    color: var(--uoft-blue);
    font-size: 1rem;
    line-height: 1.35;
  }

  .mini-row-main p {
    margin: 0.3rem 0 0;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .mini-row-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.45rem;
    flex-shrink: 0;
  }

  .mini-amount {
    font-size: 1rem;
    font-weight: 900;
    color: var(--uoft-mid);
  }

  .mini-deadline,
  .mini-expiry {
    color: var(--text-muted);
    font-size: 0.84rem;
    font-weight: 700;
  }

  .mini-link {
    color: var(--uoft-mid);
    font-size: 0.88rem;
    font-weight: 800;
    text-decoration: none;
  }

  .mini-link:hover { text-decoration: underline; }

  .code-pill {
    display: inline-flex;
    align-self: flex-start;
    margin-top: 0.55rem;
    padding: 0.28rem 0.55rem;
    border-radius: 999px;
    background: #ECFDF5;
    color: #12724F;
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

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
  }

  @media (max-width: 720px) {
    .db-body { padding: 1.25rem 1rem; }
    .actions,
    .financial-grid { grid-template-columns: 1fr; }
    .pill { width: 100%; justify-content: space-between; }
    .db-header { align-items: flex-start; }
    .menu { width: 100%; }
    .mini-row { flex-direction: column; }
    .mini-row-side { align-items: flex-start; }
  }
`;

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

function formatCurrencyWithCents(value) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "TBD";
  const parsed = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

function normalizeScholarship(item) {
  const amount = Number.isFinite(Number(item.amount))
    ? Number(item.amount)
    : Number.isFinite(Number(item.amount_max))
      ? Number(item.amount_max)
      : Number.isFinite(Number(item.amount_min))
        ? Number(item.amount_min)
        : 0;

  return {
    id: item.id,
    title: item.title,
    amount,
    deadline: item.deadline,
    url: item.application_url || item.url || "/scholarships",
    offered_by: item.offered_by || "SpendWise",
  };
}

function HeroSpendingCard({ monthLabel, total, budget, deltaPct }) {
  const pctUsed = Math.min(100, Math.round((total / budget) * 100));

  return (
    <div className="card hero" style={{ ["--pct"]: `${pctUsed}%` }}>
      <div className="hero-top">
        <div>
          <p className="hero-label">Monthly Spending • {monthLabel}</p>
          <p className="hero-amount">{formatCurrencyWithCents(total)}</p>
        </div>

        <div className="hero-change">
          {deltaPct >= 0 ? `↗ +${deltaPct}%` : `↘ ${deltaPct}%`}
        </div>
      </div>

      <div className="hero-meta">
        <span>Budget: {formatCurrency(budget)}/mo</span>
        <span>{pctUsed}% used</span>
      </div>

      <div className="progress">
        <span />
      </div>
    </div>
  );
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
      {items.map((transaction) => (
        <div className="row" key={transaction.id}>
          <div className="row-left">
            <div className="row-icon">{transaction.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div className="row-title">{transaction.name}</div>
              <div className="row-sub">{transaction.when}</div>
            </div>
          </div>
          <div className={`amt ${transaction.tone}`}>{transaction.amount}</div>
        </div>
      ))}
    </div>
  );
}

function FinancialOverviewCard({ income, expenses, balance, hasData }) {
  const balanceTone = balance > 0 ? "positive" : balance < 0 ? "negative" : "";

  return (
    <div className="card">
      <div className="card-title">
        <h2>Financial Overview</h2>
      </div>

      <div className="financial-grid">
        <div className="financial-stat">
          <span className="financial-label">Income</span>
          <div className="financial-value positive">{formatCurrency(income)}</div>
        </div>
        <div className="financial-stat">
          <span className="financial-label">Expenses</span>
          <div className="financial-value negative">{formatCurrency(expenses)}</div>
        </div>
        <div className="financial-stat">
          <span className="financial-label">Deficit / Surplus</span>
          <div className={`financial-value ${balanceTone}`}>{formatCurrency(balance)}</div>
        </div>
      </div>

      <p className="financial-footnote">
        {hasData
          ? "Calculated from the onboarding totals you entered for earnings, scholarship aid, parental support, and expenses."
          : "Complete onboarding financial totals to personalize this card with your own numbers."}
      </p>
    </div>
  );
}

function InsightCard({ title, message, variant = "neutral" }) {
  const icon = variant === "warning" ? "⚠️" : variant === "success" ? "✅" : "💡";

  return (
    <div className="card">
      <div className={`insight ${variant}`}>
        <div className="insightIcon">{icon}</div>
        <div>
          <strong>{title}</strong>
          <p>{message}</p>
        </div>
      </div>
    </div>
  );
}

function ScholarshipHighlights({ items, loading }) {
  return (
    <div className="card">
      <div className="card-title">
        <h2>Trending Scholarships</h2>
      </div>

      {loading ? (
        <div className="empty">Loading scholarship highlights...</div>
      ) : items.length ? (
        <div className="scholarship-list">
          {items.map((item) => (
            <div className="mini-row" key={item.id}>
              <div className="mini-row-main">
                <h3>{item.title}</h3>
                <p>{item.offered_by}</p>
              </div>
              <div className="mini-row-side">
                <div className="mini-amount">{formatCurrency(item.amount)}</div>
                <div className="mini-deadline">Deadline: {formatDate(item.deadline)}</div>
                <a
                  className="mini-link"
                  href={item.url || "/scholarships"}
                  target={item.url?.startsWith("http") ? "_blank" : undefined}
                  rel={item.url?.startsWith("http") ? "noreferrer" : undefined}
                >
                  View scholarship
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">No scholarship highlights are available right now.</div>
      )}
    </div>
  );
}

function ExpiringCodesCard({ items }) {
  return (
    <div className="card">
      <div className="card-title">
        <h2>Expiring Student Codes</h2>
      </div>

      <div className="codes-list">
        {items.map((item) => (
          <div className="mini-row" key={item.id}>
            <div className="mini-row-main">
              <h3>{item.brand}</h3>
              <p>{item.discount}</p>
              <span className="code-pill">Code: {item.code}</span>
            </div>
            <div className="mini-row-side">
              <div className="mini-expiry">Expires {formatDate(item.expiresOn)}</div>
              <a className="mini-link" href={item.url} target="_blank" rel="noreferrer">
                Use code
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthDropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);

  const handleSelect = (option) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <div
      className="pill"
      onClick={() => setOpen((current) => !current)}
      role="button"
      tabIndex={0}
      aria-label="Select month"
    >
      <span>📅</span>
      <span>{value}</span>
      <span className="chev">▾</span>

      {open && (
        <div className="menu" onClick={(event) => event.stopPropagation()}>
          {options.map((option) => (
            <div
              key={option}
              className={`menuItem ${option === value ? "active" : ""}`}
              onClick={() => handleSelect(option)}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [month, setMonth] = useState("This Month");
  const [onlyImportant, setOnlyImportant] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [profile, setProfile] = useState(null);
  const [trendingScholarships, setTrendingScholarships] = useState(FALLBACK_SCHOLARSHIPS);
  const [scholarshipsLoading, setScholarshipsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    fetchProfile()
      .then((data) => {
        if (!ignore) setProfile(data);
      })
      .catch(() => {
        if (!ignore) setProfile(null);
      });

    const fetchTrendingScholarships = async () => {
      const today = new Date().toISOString().slice(0, 10);

      try {
        const response = await fetch(
          `${API_BASE_URL}/scholarships/?deadline_after=${today}&sort=-amount&page_size=5`
        );

        if (!response.ok) {
          throw new Error("Unable to load scholarships");
        }

        const data = await response.json();
        const normalized = (data.results || []).map(normalizeScholarship).slice(0, 5);

        if (!ignore && normalized.length) {
          setTrendingScholarships(normalized);
        }
      } catch {
        if (!ignore) {
          setTrendingScholarships(FALLBACK_SCHOLARSHIPS);
        }
      } finally {
        if (!ignore) {
          setScholarshipsLoading(false);
        }
      }
    };

    fetchTrendingScholarships();

    return () => {
      ignore = true;
    };
  }, []);

  const spendingSummary = useMemo(() => {
    if (month === "Last Month") return { total: 1620.3, budget: 2200, deltaPct: -4 };
    if (month === "2 Months Ago") return { total: 2010.1, budget: 2200, deltaPct: 9 };
    return { total: 1847.5, budget: 2200, deltaPct: -12 };
  }, [month]);

  const visibleTransactions = useMemo(() => {
    const base = onlyImportant ? TRANSACTIONS.filter((transaction) => transaction.important) : TRANSACTIONS;
    return showAll ? base : base.slice(0, 4);
  }, [onlyImportant, showAll]);

  const financialOverview = useMemo(() => {
    const scholarshipAid = toNumber(profile?.scholarship_aid_amount);
    const earnings = toNumber(profile?.total_earnings);
    const parentalSupport = toNumber(profile?.parental_support);
    const expenses = toNumber(profile?.total_expenses);
    const income = earnings + parentalSupport + scholarshipAid;

    return {
      income,
      expenses,
      balance: income - expenses,
      hasData: Boolean(profile) && [scholarshipAid, earnings, parentalSupport, expenses].some((value) => value > 0),
    };
  }, [profile]);

  const financialInsight = useMemo(() => {
    if (!financialOverview.hasData) {
      return {
        title: "Finish your financial snapshot",
        message: "Add your expected earnings, scholarship aid, parental support, and expenses in onboarding to see whether you are running a deficit or surplus this semester.",
        variant: "neutral",
      };
    }

    if (financialOverview.balance < 0) {
      return {
        title: "Deficit insight",
        message: `You are short ${formatCurrency(Math.abs(financialOverview.balance))} this semester based on your onboarding totals. Consider scholarships, family support updates, or trimming recurring expenses.`,
        variant: "warning",
      };
    }

    if (financialOverview.balance > 0) {
      return {
        title: "Surplus insight",
        message: `You have a projected surplus of ${formatCurrency(financialOverview.balance)} this semester. You can direct part of it toward savings, tuition, or emergency costs.`,
        variant: "success",
      };
    }

    return {
      title: "Balanced outlook",
      message: "Your current onboarding totals are exactly balanced this semester. Keep watching new expenses so you do not slip into a deficit.",
      variant: "neutral",
    };
  }, [financialOverview]);

  const expiringCodes = useMemo(
    () => [...EXPIRING_CODES].sort((a, b) => new Date(a.expiresOn) - new Date(b.expiresOn)).slice(0, 4),
    []
  );

  const scholarshipSubtitle = useMemo(() => {
    const soonest = trendingScholarships
      .map((item) => getDaysUntil(item.deadline))
      .filter((days) => days !== null && days >= 0)
      .sort((a, b) => a - b)[0];

    if (soonest === undefined) return "Top awards to review this week.";
    return `Top awards to review. Closest deadline is in ${soonest} day${soonest === 1 ? "" : "s"}.`;
  }, [trendingScholarships]);

  return (
    <div className="db-page">
      <style>{styles}</style>
      <Navbar />

      <div className="db-body">
        <div className="db-header">
          <div>
            <h1>{profile?.first_name ? `${profile.first_name}'s Dashboard` : "Dashboard"}</h1>
            <p>Overview of spending, funding pressure, scholarship opportunities, and expiring savings.</p>
          </div>

          <div className="db-header-right">
            <MonthDropdown value={month} onChange={setMonth} options={MONTH_OPTIONS} />

            <div
              className="pill pillToggle"
              onClick={() => setOnlyImportant((current) => !current)}
              role="button"
              tabIndex={0}
            >
              <span className={`dot ${onlyImportant ? "on" : ""}`} />
              <span>Only important</span>
            </div>
          </div>
        </div>

        <div className="db-grid">
          <div className="db-main">
            <HeroSpendingCard
              monthLabel={month}
              total={spendingSummary.total}
              budget={spendingSummary.budget}
              deltaPct={spendingSummary.deltaPct}
            />

            <div className="actions">
              <QuickTile
                icon="🎓"
                title="Scholarships"
                subtitle="Explore matched awards"
                toneClass="tScholar"
                onClick={() => navigate("/scholarships")}
              />
              <QuickTile
                icon="💵"
                title="Bills"
                subtitle="View upcoming bills"
                toneClass="tBills"
                onClick={() => navigate("/transactions")}
              />
              <QuickTile
                icon="🏷️"
                title="Student Codes"
                subtitle="Review expiring discounts"
                toneClass="tCodes"
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
              />
            </div>

            <FinancialOverviewCard
              income={financialOverview.income}
              expenses={financialOverview.expenses}
              balance={financialOverview.balance}
              hasData={financialOverview.hasData}
            />

            <div className="insightCardSpacing">
              <InsightCard
                title={financialInsight.title}
                message={financialInsight.message}
                variant={financialInsight.variant}
              />
            </div>

            <ScholarshipHighlights items={trendingScholarships} loading={scholarshipsLoading} />
            <p className="subtle">{scholarshipSubtitle}</p>

            <div className="card">
              <div className="card-title">
                <h2>Recent Transactions</h2>
                <div className="link" onClick={() => setShowAll((current) => !current)}>
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
                  {DEADLINES.map((deadline) => (
                    <div className="row" key={deadline.id}>
                      <div className="row-left">
                        <div className={`deadlineBadge ${deadline.badgeClass}`}>{deadline.day}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="row-title">{deadline.title}</div>
                          <div className="row-sub">{deadline.meta}</div>
                        </div>
                      </div>
                      <div style={{ color: "var(--text-muted)", fontWeight: 900 }}>›</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ExpiringCodesCard items={expiringCodes} />
          </div>
        </div>
      </div>
    </div>
  );
}
