import { useState, useEffect, useCallback, useMemo } from "react";
import { usePlaidLink } from "react-plaid-link";
import axios from "axios";

// ─── API client — attaches auth token from sessionStorage ────────────────────
const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("userToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const plaidApi = {
  getLinkToken:    ()                  => api.post("/plaid/link-token/").then(r => r.data.link_token),
  exchangeToken:   (pt, inst)          => api.post("/plaid/exchange-token/", { public_token: pt, institution: inst }).then(r => r.data),
  getItems:        ()                  => api.get("/plaid/items/").then(r => r.data.items),
  getTransactions: (id, days, count)   => api.get(`/plaid/items/${id}/transactions/`, { params: { days, count } }).then(r => r.data),
  deleteItem:      (id)                => api.delete(`/plaid/items/${id}/`),
};

// ─── Category config ─────────────────────────────────────────────────────────
const CAT_COLORS = {
  "Food and Drink": "#E8B53E",
  "Travel":         "#0047A0",
  "Shops":          "#6366f1",
  "Recreation":     "#ec4899",
  "Service":        "#64748b",
  "Healthcare":     "#10b981",
  "Bank Charges":   "#002A5C",
  "Transfer":       "#0891b2",
  "Payment":        "#f97316",
};
const getCatColor = (cats) => CAT_COLORS[cats?.[0]] ?? "#6B7A90";

const CAT_ICONS = {
  "Food and Drink": "🍔", "Travel": "✈️", "Shops": "🛍️",
  "Recreation": "🎮", "Service": "⚙️", "Healthcare": "💊",
  "Bank Charges": "🏦", "Transfer": "↔️", "Payment": "💸",
};
const getCatIcon = (cats) => CAT_ICONS[cats?.[0]] ?? "💰";

const fmt     = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(n));
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// ─── Icons ────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const LinkIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const ChevronDown = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const ArrowUp = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
);
const ArrowDown = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
  </svg>
);

// ─── Plaid connect button ─────────────────────────────────────────────────────
function ConnectButton({ onSuccess, onError }) {
  const [linkToken, setLinkToken] = useState(null);
  const [busy, setBusy]           = useState(false);

  useEffect(() => {
    plaidApi.getLinkToken().then(setLinkToken).catch(() => onError("Could not reach backend"));
  }, []);

  const onPlaidSuccess = useCallback(async (publicToken, meta) => {
    setBusy(true);
    try {
      const result = await plaidApi.exchangeToken(publicToken, meta.institution);
      onSuccess(result, meta.institution?.name);
    } catch (e) {
      onError(e?.response?.data?.error || "Connection failed");
    } finally { setBusy(false); }
  }, [onSuccess, onError]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: (err) => err && onError(err.display_message || err.error_message),
  });

  return (
    <button className="tx-connect-btn" onClick={() => open()} disabled={!ready || busy}>
      {busy ? <span className="tx-spinner-sm" /> : <LinkIcon />}
      {busy ? "Connecting…" : "Connect a Card"}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Plaid() {
  const [items, setItems]             = useState([]);
  const [selectedId, setSelectedId]   = useState(null);
  const [txData, setTxData]           = useState(null);
  const [loadingTx, setLoadingTx]     = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [error, setError]             = useState("");
  const [days, setDays]               = useState(90);
  const [search, setSearch]           = useState("");
  const [filterCat, setFilterCat]     = useState("all");
  const [filterType, setFilterType]   = useState("all");
  const [sortBy, setSortBy]           = useState("date");

  // Load connected items on mount
  useEffect(() => {
    plaidApi.getItems()
      .then((its) => {
        setItems(its);
        if (its.length > 0) setSelectedId(its[0].item_id);
      })
      .catch(() => setError("Failed to load accounts"))
      .finally(() => setLoadingInit(false));
  }, []);

  // Fetch transactions when selection or days changes
  useEffect(() => {
    if (!selectedId) return;
    setLoadingTx(true); setTxData(null); setError("");
    plaidApi.getTransactions(selectedId, days, 200)
      .then(setTxData)
      .catch((e) => setError(e?.response?.data?.error || "Failed to load transactions"))
      .finally(() => setLoadingTx(false));
  }, [selectedId, days]);

  const handleConnectSuccess = (result, instName) => {
    const item = { item_id: result.item_id, institution_name: instName || result.institution_name };
    setItems((p) => [item, ...p]);
    setSelectedId(result.item_id);
  };

  const handleDisconnect = async (itemId) => {
    if (!window.confirm("Disconnect this account?")) return;
    await plaidApi.deleteItem(itemId);
    const rest = items.filter((i) => i.item_id !== itemId);
    setItems(rest);
    if (selectedId === itemId) { setSelectedId(rest[0]?.item_id ?? null); setTxData(null); }
  };

  // ── derived ───────────────────────────────────────────────────────────────
  const allTx = txData?.transactions ?? [];

  const categories = useMemo(() =>
    [...new Set(allTx.map(t => t.category?.[0]).filter(Boolean))].sort(),
    [allTx]
  );

  const filtered = useMemo(() => {
    let list = allTx;
    if (search)                  list = list.filter(t => (t.merchant_name || t.name).toLowerCase().includes(search.toLowerCase()));
    if (filterType === "debit")  list = list.filter(t => t.amount > 0);
    if (filterType === "credit") list = list.filter(t => t.amount < 0);
    if (filterCat !== "all")     list = list.filter(t => t.category?.[0] === filterCat);
    if (sortBy === "amount")     list = [...list].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    if (sortBy === "name")       list = [...list].sort((a, b) => (a.merchant_name || a.name).localeCompare(b.merchant_name || b.name));
    return list;
  }, [allTx, search, filterType, filterCat, sortBy]);

  const stats = useMemo(() => {
    const debits  = allTx.filter(t => t.amount > 0);
    const credits = allTx.filter(t => t.amount < 0);
    const spent   = debits.reduce((s, t) => s + t.amount, 0);
    const income  = credits.reduce((s, t) => s + Math.abs(t.amount), 0);
    const bycat   = {};
    debits.forEach(t => { const c = t.category?.[0] || "Other"; bycat[c] = (bycat[c] || 0) + t.amount; });
    const topCat  = Object.entries(bycat).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { spent, income, topCat, count: allTx.length, pending: allTx.filter(t => t.pending).length };
  }, [allTx]);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div className="tx-page">

        {/* ── Page header ── */}
        <div className="tx-page-header">
          <div>
            <h1 className="tx-page-title">Transactions</h1>
            <p className="tx-page-sub">Track and review your spending history</p>
          </div>
          <ConnectButton
            onSuccess={handleConnectSuccess}
            onError={(m) => setError(m)}
          />
        </div>

        {error && <div className="tx-error-banner">{error}</div>}

        {/* ── Account selector tabs ── */}
        {items.length > 0 && (
          <div className="tx-account-bar">
            {items.map((item) => (
              <div
                key={item.item_id}
                className={`tx-account-tab ${selectedId === item.item_id ? "active" : ""}`}
                onClick={() => setSelectedId(item.item_id)}
              >
                <span className="tx-account-icon">💳</span>
                <span className="tx-account-label">{item.institution_name || "Connected Card"}</span>
                <button
                  className="tx-account-remove"
                  onClick={(e) => { e.stopPropagation(); handleDisconnect(item.item_id); }}
                  title="Disconnect"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty / loading init state ── */}
        {loadingInit && (
          <div className="tx-center-state">
            <div className="tx-spinner-lg" />
            <p>Loading your accounts…</p>
          </div>
        )}

        {!loadingInit && items.length === 0 && (
          <div className="tx-empty-state">
            <div className="tx-empty-icon">
              <LinkIcon />
            </div>
            <h2 className="tx-empty-heading">No cards connected yet</h2>
            <p className="tx-empty-sub">
              Connect your credit card using the button above to start viewing your transaction history.
            </p>
            <div className="tx-empty-hint">
              Sandbox credentials: <code>user_transactions</code> / <code>pass_good</code>
            </div>
          </div>
        )}

        {/* ── Main content once we have a selection ── */}
        {selectedId && (
          <>
            {/* Stats row */}
            <div className="tx-stats-row">
              <div className="tx-stat-card">
                <div className="tx-stat-label">Total Spent</div>
                <div className="tx-stat-value spent">
                  {loadingTx ? <span className="tx-skeleton" style={{width:80}} /> : fmt(stats.spent)}
                </div>
                <div className="tx-stat-sub">Last {days} days</div>
              </div>
              <div className="tx-stat-card">
                <div className="tx-stat-label">Money In</div>
                <div className="tx-stat-value income">
                  {loadingTx ? <span className="tx-skeleton" style={{width:80}} /> : fmt(stats.income)}
                </div>
                <div className="tx-stat-sub">Credits &amp; refunds</div>
              </div>
              <div className="tx-stat-card">
                <div className="tx-stat-label">Transactions</div>
                <div className="tx-stat-value neutral">
                  {loadingTx ? <span className="tx-skeleton" style={{width:40}} /> : stats.count}
                </div>
                <div className="tx-stat-sub">{stats.pending > 0 ? `${stats.pending} pending` : "All cleared"}</div>
              </div>
              <div className="tx-stat-card accent">
                <div className="tx-stat-label">Top Category</div>
                <div className="tx-stat-value top-cat">
                  {loadingTx ? <span className="tx-skeleton" style={{width:100}} /> : (
                    <>
                      <span style={{marginRight:6}}>{getCatIcon(stats.topCat ? [stats.topCat] : [])}</span>
                      {stats.topCat}
                    </>
                  )}
                </div>
                <div className="tx-stat-sub">By spend volume</div>
              </div>
            </div>

            {/* Filters bar */}
            <div className="tx-filters">
              <div className="tx-search-wrap">
                <span className="tx-search-icon"><SearchIcon /></span>
                <input
                  className="tx-search"
                  placeholder="Search merchants…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="tx-select-wrap">
                <select className="tx-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={180}>Last 6 months</option>
                  <option value={365}>Last year</option>
                </select>
                <span className="tx-select-arrow"><ChevronDown /></span>
              </div>

              <div className="tx-select-wrap">
                <select className="tx-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">All types</option>
                  <option value="debit">Spending</option>
                  <option value="credit">Credits</option>
                </select>
                <span className="tx-select-arrow"><ChevronDown /></span>
              </div>

              <div className="tx-select-wrap">
                <select className="tx-select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
                  <option value="all">All categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="tx-select-arrow"><ChevronDown /></span>
              </div>

              <div className="tx-select-wrap">
                <select className="tx-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="date">Sort: Date</option>
                  <option value="amount">Sort: Amount</option>
                  <option value="name">Sort: Name</option>
                </select>
                <span className="tx-select-arrow"><ChevronDown /></span>
              </div>
            </div>

            {/* Transaction list */}
            <div className="tx-card">
              <div className="tx-card-header">
                <span className="tx-card-title">
                  {loadingTx ? "Loading…" : `${filtered.length} transaction${filtered.length !== 1 ? "s" : ""}`}
                </span>
                {txData && (
                  <span className="tx-date-range">
                    {txData.start_date} → {txData.end_date}
                  </span>
                )}
              </div>

              {/* Loading skeletons */}
              {loadingTx && (
                <div className="tx-list">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="tx-row-skeleton" style={{ animationDelay: `${i * 80}ms` }}>
                      <span className="tx-skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
                      <div style={{ flex: 1 }}>
                        <span className="tx-skeleton" style={{ width: "45%", height: 14, display: "block", marginBottom: 8 }} />
                        <span className="tx-skeleton" style={{ width: "25%", height: 11, display: "block" }} />
                      </div>
                      <span className="tx-skeleton" style={{ width: 70, height: 16 }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Transactions */}
              {!loadingTx && filtered.length === 0 && (
                <div className="tx-list-empty">
                  <span style={{ fontSize: 28 }}>🔍</span>
                  <p>No transactions match your filters.</p>
                </div>
              )}

              {!loadingTx && filtered.length > 0 && (
                <div className="tx-list">
                  {filtered.map((tx, i) => {
                    const isDebit  = tx.amount > 0;
                    const catColor = getCatColor(tx.category);
                    const catIcon  = getCatIcon(tx.category);

                    return (
                      <div
                        key={tx.transaction_id}
                        className={`tx-row ${tx.pending ? "pending" : ""}`}
                        style={{ animationDelay: `${Math.min(i * 25, 300)}ms` }}
                      >
                        <div
                          className="tx-row-icon"
                          style={{ background: `${catColor}15`, border: `1.5px solid ${catColor}30` }}
                        >
                          {tx.logo_url
                            ? <img src={tx.logo_url} alt="" className="tx-logo-img"
                                onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }} />
                            : null}
                          <span style={{ display: tx.logo_url ? "none" : "block" }}>{catIcon}</span>
                        </div>

                        <div className="tx-row-info">
                          <div className="tx-row-name">{tx.merchant_name || tx.name}</div>
                          <div className="tx-row-meta">
                            <span className="tx-row-cat" style={{ color: catColor, background: `${catColor}12` }}>
                              {tx.category?.[0] || "Uncategorized"}
                            </span>
                            <span className="tx-row-date">{fmtDate(tx.date)}</span>
                            <span className="tx-row-channel">{tx.payment_channel}</span>
                            {tx.pending && <span className="tx-row-pending">Pending</span>}
                          </div>
                        </div>

                        <div className={`tx-row-amount ${isDebit ? "debit" : "credit"}`}>
                          <span className="tx-amount-icon">{isDebit ? <ArrowUp /> : <ArrowDown />}</span>
                          {fmt(tx.amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Styles — SpendWise UofT design language ──────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');

.tx-page {
  font-family: 'Source Sans 3', sans-serif;
  background: #F4F7FB;
  min-height: 100vh;
  padding: 2rem 2.5rem;
  max-width: 1100px;
  margin: 0 auto;
}

.tx-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.75rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.tx-page-title {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  font-weight: 700;
  color: #002A5C;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.tx-page-sub {
  font-size: 0.9rem;
  color: #6B7A90;
  margin-top: 0.3rem;
  font-weight: 400;
}

.tx-connect-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1.4rem;
  height: 46px;
  background: #002A5C;
  color: white;
  border: none;
  border-radius: 10px;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 4px 4px 0px #E8B53E;
  transition: background 0.2s, transform 0.15s, box-shadow 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}
.tx-connect-btn:hover:not(:disabled) {
  background: #0047A0;
  transform: translateY(-1px);
  box-shadow: 4px 5px 0px #E8B53E;
}
.tx-connect-btn:active { transform: translateY(0); box-shadow: 2px 2px 0px #E8B53E; }
.tx-connect-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.tx-error-banner {
  background: #FEF0EE;
  border: 1.5px solid #E8827A;
  border-radius: 10px;
  padding: 0.85rem 1.1rem;
  color: #C0392B;
  font-size: 0.87rem;
  margin-bottom: 1.25rem;
}

.tx-account-bar {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.tx-account-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 30px;
  border: 1.5px solid #D0DBE8;
  background: white;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 500;
  color: #6B7A90;
  transition: all 0.18s;
}
.tx-account-tab:hover { border-color: #0047A0; color: #0047A0; }
.tx-account-tab.active {
  background: #002A5C;
  border-color: #002A5C;
  color: white;
  box-shadow: 3px 3px 0px #E8B53E;
}
.tx-account-icon { font-size: 14px; }
.tx-account-label { font-weight: 500; }
.tx-account-remove {
  background: none; border: none; cursor: pointer;
  color: inherit; opacity: 0.5; padding: 2px 3px;
  border-radius: 4px; display: flex; align-items: center;
  transition: opacity 0.15s; margin-left: 2px;
}
.tx-account-remove:hover { opacity: 1; }

.tx-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.tx-stat-card {
  background: white;
  border: 1.5px solid #D0DBE8;
  border-radius: 14px;
  padding: 1.25rem 1.4rem;
  transition: box-shadow 0.2s;
}
.tx-stat-card:hover { box-shadow: 0 4px 16px rgba(0,42,92,0.08); }
.tx-stat-card.accent {
  background: #002A5C;
  border-color: #002A5C;
  box-shadow: 4px 4px 0px #E8B53E;
}
.tx-stat-card.accent .tx-stat-label { color: rgba(255,255,255,0.6); }
.tx-stat-card.accent .tx-stat-sub   { color: rgba(255,255,255,0.5); }

.tx-stat-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #6B7A90;
  margin-bottom: 0.5rem;
}
.tx-stat-value {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
.tx-stat-value.spent   { color: #C0392B; }
.tx-stat-value.income  { color: #1a7a40; }
.tx-stat-value.neutral { color: #002A5C; }
.tx-stat-value.top-cat { color: white; font-size: 1.1rem; }
.tx-stat-sub {
  font-size: 0.78rem;
  color: #6B7A90;
  margin-top: 0.35rem;
  font-weight: 400;
}

.tx-filters {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
  align-items: center;
}
.tx-search-wrap {
  position: relative;
  flex: 1;
  min-width: 180px;
}
.tx-search-icon {
  position: absolute;
  left: 13px; top: 50%;
  transform: translateY(-50%);
  color: #6B7A90;
  pointer-events: none;
  display: flex; align-items: center;
}
.tx-search {
  width: 100%;
  height: 44px;
  border: 1.5px solid #D0DBE8;
  border-radius: 10px;
  background: white;
  padding: 0 1rem 0 2.5rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.88rem;
  color: #002A5C;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.tx-search::placeholder { color: #B0BAC8; }
.tx-search:focus {
  border-color: #0047A0;
  box-shadow: 0 0 0 4px rgba(0,71,160,0.08);
}
.tx-select-wrap { position: relative; flex-shrink: 0; }
.tx-select {
  height: 44px;
  border: 1.5px solid #D0DBE8;
  border-radius: 10px;
  background: white;
  padding: 0 2.2rem 0 0.9rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.88rem;
  font-weight: 500;
  color: #002A5C;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  transition: border-color 0.2s;
}
.tx-select:focus { border-color: #0047A0; }
.tx-select-arrow {
  position: absolute;
  right: 9px; top: 50%;
  transform: translateY(-50%);
  color: #6B7A90;
  pointer-events: none;
  display: flex; align-items: center;
}

.tx-card {
  background: white;
  border: 1.5px solid #D0DBE8;
  border-radius: 16px;
  overflow: hidden;
}
.tx-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.4rem;
  border-bottom: 1.5px solid #EEF2F8;
}
.tx-card-title {
  font-family: 'Playfair Display', serif;
  font-size: 1rem;
  font-weight: 600;
  color: #002A5C;
}
.tx-date-range { font-size: 0.78rem; color: #6B7A90; font-weight: 400; }

.tx-list { display: flex; flex-direction: column; }
.tx-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1.4rem;
  border-bottom: 1px solid #F0F4FA;
  transition: background 0.15s;
  animation: txFadeIn 0.3s ease both;
}
.tx-row:last-child { border-bottom: none; }
.tx-row:hover { background: #F8FAFD; }
.tx-row.pending { opacity: 0.65; }

@keyframes txFadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}

.tx-row-icon {
  width: 42px; height: 42px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
  overflow: hidden; position: relative;
}
.tx-logo-img { width: 28px; height: 28px; object-fit: contain; border-radius: 4px; }
.tx-row-info { flex: 1; min-width: 0; }
.tx-row-name {
  font-size: 0.92rem; font-weight: 600; color: #002A5C;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tx-row-meta {
  display: flex; align-items: center;
  gap: 0.5rem; flex-wrap: wrap; margin-top: 4px;
}
.tx-row-cat { font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
.tx-row-date, .tx-row-channel { font-size: 0.76rem; color: #6B7A90; }
.tx-row-pending {
  font-size: 0.7rem; font-weight: 600; color: #9a6f00;
  background: #FFF8E6; border: 1px solid #E8B53E;
  padding: 1px 7px; border-radius: 20px;
}
.tx-row-amount {
  font-family: 'Playfair Display', serif;
  font-size: 1rem; font-weight: 600;
  flex-shrink: 0; display: flex; align-items: center; gap: 4px;
}
.tx-row-amount.debit  { color: #C0392B; }
.tx-row-amount.credit { color: #1a7a40; }
.tx-amount-icon { display: flex; align-items: center; }

.tx-center-state {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 1rem; padding: 5rem 2rem;
  color: #6B7A90; font-size: 0.9rem;
}
.tx-empty-state {
  background: white; border: 1.5px solid #D0DBE8;
  border-radius: 16px; padding: 4rem 2rem;
  text-align: center; max-width: 460px; margin: 2rem auto;
}
.tx-empty-icon {
  width: 60px; height: 60px; background: #EEF4FF;
  border-radius: 16px; display: flex; align-items: center;
  justify-content: center; margin: 0 auto 1.25rem; color: #0047A0;
}
.tx-empty-icon svg { width: 26px; height: 26px; }
.tx-empty-heading {
  font-family: 'Playfair Display', serif;
  font-size: 1.3rem; font-weight: 700;
  color: #002A5C; margin-bottom: 0.6rem;
}
.tx-empty-sub { font-size: 0.9rem; color: #6B7A90; line-height: 1.6; max-width: 320px; margin: 0 auto; }
.tx-empty-hint {
  margin-top: 1.25rem; background: #F4F7FB;
  border: 1px solid #D0DBE8; border-radius: 8px;
  padding: 0.65rem 1rem; font-size: 0.8rem; color: #6B7A90; display: inline-block;
}
.tx-empty-hint code { background: #E8EEF6; padding: 1px 6px; border-radius: 4px; font-size: 0.78rem; color: #002A5C; }
.tx-list-empty {
  display: flex; flex-direction: column;
  align-items: center; gap: 0.75rem;
  padding: 3.5rem; color: #6B7A90; font-size: 0.9rem;
}

.tx-row-skeleton {
  display: flex; align-items: center; gap: 1rem;
  padding: 1rem 1.4rem; border-bottom: 1px solid #F0F4FA;
  animation: pulse 1.4s ease-in-out infinite;
}
.tx-row-skeleton:last-child { border-bottom: none; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
.tx-skeleton { display: inline-block; height: 13px; background: #EEF2F8; border-radius: 6px; }

.tx-spinner-sm {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.35); border-top-color: white;
  border-radius: 50%; animation: txSpin 0.7s linear infinite;
}
.tx-spinner-lg {
  width: 36px; height: 36px;
  border: 3px solid #D0DBE8; border-top-color: #002A5C;
  border-radius: 50%; animation: txSpin 0.8s linear infinite;
}
@keyframes txSpin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .tx-page { padding: 1.25rem; }
  .tx-stats-row { grid-template-columns: repeat(2, 1fr); }
  .tx-filters { flex-direction: column; }
  .tx-search-wrap { min-width: 100%; }
}
`;