import React, { useEffect, useMemo, useState } from "react";
import Navbar from "./Navbar";

const DATE_OPTIONS = ["This Month", "Last Month", "3 Months", "Past Year"];

export default function Transactions() {
  const API_BASE = "/api";

  const [transactions, setTransactions] = useState([]);
  const [monthlySavingAmount, setMonthlySavingAmount] = useState(null);
  const [totalExpensesAmount, setTotalExpensesAmount] = useState(null);
  const [monthlySavingDesc, setMonthlySavingDesc] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [category, setCategory] = useState("All");
  const [type, setType] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  const [dateRange, setDateRange] = useState("This Month");

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [accountLabelById, setAccountLabelById] = useState({});
  const [connectedItems, setConnectedItems] = useState([]);

  const getAccessToken = () => sessionStorage.getItem("userAccessToken") || sessionStorage.getItem("userToken");

  const refreshAccessToken = async () => {
    const refresh = sessionStorage.getItem("userRefreshToken");
    if (!refresh) return null;

    const res = await fetch(`${API_BASE}/token/refresh/`, {
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

  const fetchWithAuth = async (url, options = {}) => {
    const token = getAccessToken();
    if (!token) return { ok: false, status: 401, text: async () => "Missing auth token." };

    const doFetch = async (accessToken) =>
      fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${accessToken}`,
        },
      });

    let res = await doFetch(token);
    if (res.status !== 401) return res;

    const newToken = await refreshAccessToken();
    if (!newToken) return res;

    return doFetch(newToken);
  };

  const getRangeLength = (range) => {
    if (range === "3 Months") return 3;
    if (range === "Past Year") return 12;
    return 1;
  };

  const getRangeMonths = (range) => {
    const now = new Date();
    const baseOffset = range === "Last Month" ? 1 : 0;
    const length = getRangeLength(range);
    const months = [];

    for (let i = 0; i < length; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - baseOffset - i, 1);
      months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }

    return months;
  };

  const formatDate = (date) => new Date(date).toLocaleDateString();

  const formatMoney = (num) => {
    const n = Number(num || 0);
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const amountNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const shortId = (id) => {
    const s = String(id || "");
    if (!s) return "Account";
    if (s.length <= 12) return `Account ${s}`;
    return `Account ${s.slice(0, 4)}...${s.slice(-4)}`;
  };

  const formatAccountLabel = (id) => accountLabelById?.[id] || shortId(id);

  const shortAccountName = (name) => {
    const text = String(name || "");
    if (text.length <= 15) return text;
    return `${text.slice(0, 12)}...`;
  };

  const bucketCategory = (raw) => {
    const c = String(raw || "").toLowerCase();
    if (!c) return "Other";
    if (c.includes("food") || c.includes("restaurant") || c.includes("grocer")) return "Food";
    if (c.includes("transport") || c.includes("transit") || c.includes("travel") || c.includes("uber")) return "Transport";
    if (c.includes("shop") || c.includes("store") || c.includes("retail") || c.includes("amazon")) return "Shopping";
    if (c.includes("income") || c.includes("payroll") || c.includes("deposit") || c.includes("payment")) return "Income";
    if (c.includes("service") || c.includes("bill") || c.includes("utility")) return "Bills";
    return "Other";
  };

  const fetchConnectedItems = async () => {
    const res = await fetchWithAuth(`${API_BASE}/plaid/items/`);
    if (!res.ok) return [];
    const payload = await res.json();
    return payload?.items || [];
  };

  const fetchBankAccounts = async () => {
    const res = await fetchWithAuth(`${API_BASE}/plaid/bank-accounts/`);
    if (!res.ok) return [];

    const payload = await res.json();
    const rows = Array.isArray(payload?.accounts) ? payload.accounts : [];

    const unique = [];
    const seen = new Set();
    const map = {};

    for (const row of rows) {
      const id = row?.account_id;
      if (!id || seen.has(id)) continue;

      seen.add(id);
      const name = row.official_name || row.name || "Account";
      const mask = row.mask ? `...${row.mask}` : "";
      const subtype = row.subtype || row.account_type || "";
      const inst = row.item__institution_name || "Bank";
      const label = `${inst} - ${name}${mask ? ` ${mask}` : ""}${subtype ? ` (${subtype})` : ""}`;

      unique.push({ id, name: label });
      map[id] = label;
    }

    const capped = unique.slice(0, 5);
    setAccounts(capped);
    setAccountLabelById(map);
    return capped;
  };

  const syncConnectedItems = async () => {
    const items = await fetchConnectedItems();
    setConnectedItems(items);

    if (!items.length) {
      await fetchBankAccounts();
      return;
    }

    setSyncing(true);
    setStatus("Syncing latest transactions from your bank...");

    try {
      await Promise.all(
        items.map((it) =>
          Promise.all([
            fetchWithAuth(`${API_BASE}/plaid/items/${it.item_id}/accounts/`),
            fetchWithAuth(`${API_BASE}/plaid/items/${it.item_id}/transactions/?days=180&count=500`),
          ])
        )
      );

      await fetchBankAccounts();
      setStatus(`Sync complete. ${items.length} connected bank account${items.length > 1 ? "s" : ""}.`);
    } catch {
      setStatus("Some accounts could not be synced right now. Try again in a moment.");
    } finally {
      setSyncing(false);
    }
  };

  const fetchTransactions = async () => {
    if (!getAccessToken()) {
      setTransactions([]);
      setError("You are not logged in. Please sign in again.");
      return;
    }

    const months = getRangeMonths(dateRange);
    const accountQuery = accountId ? `&account_id=${encodeURIComponent(accountId)}` : "";

    const responses = await Promise.all(
      months.map(({ month, year }) =>
        fetchWithAuth(`${API_BASE}/spending/monthly_transactions/?month=${month}&year=${year}${accountQuery}`)
      )
    );

    if (responses.some((res) => !res.ok)) {
      const text = await responses.find((res) => !res.ok).text();
      setTransactions([]);
      setError(`Failed to load transactions. ${text}`);
      return;
    }

    const payloads = await Promise.all(responses.map((res) => res.json()));
    const merged = payloads.flatMap((rows) => (Array.isArray(rows) ? rows : []));
    setTransactions(merged);
  };

  const fetchMonthlySavingAmount = async () => {
    const months = getRangeMonths(dateRange);
    const accountQuery = accountId ? `&account_id=${encodeURIComponent(accountId)}` : "";

    const responses = await Promise.all(
      months.map(({ month, year }) =>
        fetchWithAuth(`${API_BASE}/spending/monthly_saving_amount/?month=${month}&year=${year}${accountQuery}`)
      )
    );

    if (responses.some((res) => !res.ok)) return setMonthlySavingAmount(null);

    const payloads = await Promise.all(responses.map((res) => res.json()));
    const total = payloads.reduce((sum, p) => sum + Number(p?.total_saving || 0), 0);
    setMonthlySavingAmount(total);
  };

  const fetchTotalExpensesAmount = async () => {
    const months = getRangeMonths(dateRange);
    const accountQuery = accountId ? `&account_id=${encodeURIComponent(accountId)}` : "";

    const responses = await Promise.all(
      months.map(({ month, year }) =>
        fetchWithAuth(`${API_BASE}/spending/total_expenses_amount/?month=${month}&year=${year}${accountQuery}`)
      )
    );

    if (responses.some((res) => !res.ok)) return setTotalExpensesAmount(null);

    const payloads = await Promise.all(responses.map((res) => res.json()));
    const total = payloads.reduce((sum, p) => sum + Number(p?.total_expenses || 0), 0);
    setTotalExpensesAmount(total);
  };

  const fetchMonthlySavingDesc = async () => {
    const months = getRangeMonths(dateRange);
    const accountQuery = accountId ? `&account_id=${encodeURIComponent(accountId)}` : "";

    const responses = await Promise.all(
      months.map(({ month, year }) =>
        fetchWithAuth(`${API_BASE}/spending/monthly_saving/?month=${month}&year=${year}${accountQuery}`)
      )
    );

    if (responses.some((res) => !res.ok)) return setMonthlySavingDesc([]);

    const payloads = await Promise.all(responses.map((res) => res.json()));
    const merged = {};
    for (const tips of payloads) {
      if (!Array.isArray(tips)) continue;
      for (const tip of tips) {
        const name = tip?.name || "Unknown";
        if (!merged[name]) merged[name] = { name, total: 0, per_saving: 0 };
        merged[name].total += Number(tip?.total || 0);
        merged[name].per_saving += Number(tip?.per_saving || 0);
      }
    }

    setMonthlySavingDesc(Object.values(merged));
  };

  const fetchAllData = async () => {
    setError("");
    setLoading(true);

    await Promise.all([
      fetchTransactions(),
      fetchMonthlySavingAmount(),
      fetchTotalExpensesAmount(),
      fetchMonthlySavingDesc(),
      fetchBankAccounts(),
      fetchConnectedItems().then(setConnectedItems),
    ]);

    setLoading(false);
  };

  useEffect(() => {
    syncConnectedItems()
      .then(fetchAllData)
      .catch(() => {
        setError("Unable to sync connected accounts.");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, accountId]);

  useEffect(() => {
    if (!accountId) return;
    if (!accounts.some((a) => a.id === accountId)) setAccountId("");
  }, [accounts, accountId]);

  const categoryOptions = useMemo(() => {
    const options = new Set(["All"]);
    for (const tx of transactions) options.add(bucketCategory(tx.category));
    return Array.from(options);
  }, [transactions]);

  useEffect(() => {
    if (!categoryOptions.includes(category)) setCategory("All");
  }, [categoryOptions, category]);

  const visibleTransactions = useMemo(() => {
    let list = Array.isArray(transactions) ? transactions : [];

    if (category !== "All") list = list.filter((t) => bucketCategory(t.category) === category);

    if (type !== "All") {
      list = list.filter((t) => {
        const amt = amountNumber(t.amount);
        const isIncome = amt >= 0;
        return type === "Income" ? isIncome : !isIncome;
      });
    }

    const withDate = (t) => new Date(t.date);
    if (sortBy === "Newest") list = [...list].sort((a, b) => withDate(b) - withDate(a));
    if (sortBy === "Oldest") list = [...list].sort((a, b) => withDate(a) - withDate(b));
    if (sortBy === "Highest") list = [...list].sort((a, b) => Math.abs(amountNumber(b.amount)) - Math.abs(amountNumber(a.amount)));
    if (sortBy === "Lowest") list = [...list].sort((a, b) => Math.abs(amountNumber(a.amount)) - Math.abs(amountNumber(b.amount)));

    return list;
  }, [transactions, category, type, sortBy]);

  const selectedLabel = accountId ? formatAccountLabel(accountId) : "All Accounts";

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+3:wght@300;400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; }

    :root {
      --uoft-blue: #002A5C;
      --uoft-mid: #0047A0;
      --uoft-accent: #E8B53E;
      --off-white: #F4F7FB;
      --text-muted: #6B7A90;
      --border: #D0DBE8;
      --error: #C0392B;
      --white: #FFFFFF;
      --shadow: 0 4px 16px rgba(0,42,92,0.08);
      --success: #18A574;
      --danger: #C0392B;
    }

    body { font-family: 'Source Sans 3', sans-serif; }

    .tx-page {
      min-height: 100vh;
      background: var(--off-white);
      font-family: 'Source Sans 3', sans-serif;
    }

    .tx-body {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 2rem;
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 1.5rem;
    }

    .tx-main { min-width: 0; }

    .tx-header { margin-bottom: 1.25rem; }
    .tx-title {
      font-family: 'Source Sans 3', sans-serif;
      font-size: 1.9rem;
      font-weight: 700;
      color: var(--uoft-blue);
      margin: 0 0 0.25rem 0;
    }
    .tx-subtitle { margin: 0; color: var(--text-muted); font-size: 0.95rem; }

    .tx-filter-bar {
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: 14px;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }

    .tx-divider { width: 1px; height: 24px; background: var(--border); flex-shrink: 0; }

    .tx-input {
      height: 38px;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      padding: 0 0.75rem;
      font-family: 'Source Sans 3', sans-serif;
      font-size: 0.88rem;
      color: var(--uoft-blue);
      outline: none;
      background: white;
      width: 110px;
    }

    .tx-input:focus {
      border-color: var(--uoft-mid);
      box-shadow: 0 0 0 3px rgba(0,71,160,0.1);
    }

    .tx-select {
      border: none;
      outline: none;
      font-family: 'Source Sans 3', sans-serif;
      font-size: 0.88rem;
      color: var(--uoft-blue);
      background: transparent;
      cursor: pointer;
      padding: 0.25rem 0.1rem;
      font-weight: 600;
    }

    .tx-chip {
      background: #F4F7FB;
      border-radius: 999px;
      padding: 0.35rem 0.8rem;
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--uoft-blue);
      border: 1.5px solid var(--border);
      white-space: nowrap;
    }

    .tx-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
      margin-bottom: 1.25rem;
    }

    .tx-metric {
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: 14px;
      padding: 1.1rem 1.25rem;
      box-shadow: var(--shadow);
    }
    .tx-metric-label {
      font-size: 0.72rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.25rem;
    }
    .tx-metric-value {
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--uoft-mid);
    }

    .tx-card {
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: 14px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .tx-card-h {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #F0F2F5;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .tx-card-h h2 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--uoft-blue);
      letter-spacing: 0.02em;
    }

    .tx-table-wrap { overflow: auto; }
    .tx-table { width: 100%; border-collapse: collapse; }
    .tx-table th {
      text-align: left;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.9rem 1.25rem;
      background: #F8FAFF;
      border-bottom: 1px solid #F0F2F5;
      position: sticky;
      top: 0;
    }
    .tx-table td {
      padding: 0.95rem 1.25rem;
      border-bottom: 1px solid #F0F2F5;
      color: var(--uoft-blue);
      font-weight: 600;
    }
    .tx-table tr:hover td { background: #F7FAFF; }

    .tx-amount { text-align: right; font-variant-numeric: tabular-nums; font-weight: 900; }
    .tx-amount.in { color: var(--success); }
    .tx-amount.out { color: var(--danger); }

    .tx-empty { padding: 1.25rem; color: var(--text-muted); }
    .tx-error { margin: 0 0 1rem 0; padding: 0.8rem 1rem; border-radius: 14px; border: 1.5px solid rgba(192,57,43,0.35); background: #FDECEC; color: var(--error); font-weight: 700; }

    .tx-sidebar { position: sticky; top: 80px; align-self: start; }
    .tx-tip { padding: 0.85rem 0; border-bottom: 1px solid #F0F2F5; }
    .tx-tip:last-child { border-bottom: none; }
    .tx-tip strong { color: var(--uoft-blue); }
    .tx-tip-sub { color: var(--text-muted); font-weight: 600; margin-top: 0.25rem; font-size: 0.86rem; }

    @media (max-width: 980px) {
      .tx-body { grid-template-columns: 1fr; }
      .tx-sidebar { position: static; }
    }

    @media (max-width: 720px) {
      .tx-body { padding: 1.25rem 1rem; }
      .tx-grid { grid-template-columns: 1fr; }
      .tx-input { width: 100%; }
    }
  `;

  return (
    <div className="tx-page">
      <Navbar />

      <main className="tx-body">
        <style>{CSS}</style>

        <div className="tx-main">
          <header className="tx-header">
            <h1 className="tx-title">Transactions</h1>
            <p className="tx-subtitle">Track every payment, transfer, and deposit in one place.</p>
          </header>

          {error && <div className="tx-error">{error}</div>}

          <section className="tx-filter-bar">
            <span className="tx-chip">{visibleTransactions.length} shown</span>
            <span className="tx-divider" />

            <input
              className="tx-input"
              type="number"
              placeholder="Month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              min="1"
              max="12"
            />

            <input
              className="tx-input"
              type="number"
              placeholder="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min="2000"
              max="2100"
            />

            <span className="tx-divider" />

            <select className="tx-select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <select className="tx-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select className="tx-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="All">All Types</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>

            <select className="tx-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="Newest">Newest first</option>
              <option value="Oldest">Oldest first</option>
              <option value="Highest">Highest amount</option>
              <option value="Lowest">Lowest amount</option>
            </select>
          </section>

          <section className="tx-grid">
            <div className="tx-metric">
              <div className="tx-metric-label">Total Monthly Expenses</div>
              <div className="tx-metric-value">${formatMoney(totalExpensesAmount)}</div>
            </div>
            <div className="tx-metric">
              <div className="tx-metric-label">Potential Saving</div>
              <div className="tx-metric-value">${formatMoney(monthlySavingAmount)}</div>
            </div>
          </section>

          <section className="tx-card">
            <div className="tx-card-h">
              <h2>Transactions</h2>
              <span className="tx-chip">Sorted: {sortBy}</span>
            </div>
            <div className="tx-table-wrap">
              {loading ? (
                <div className="tx-empty">Loading transactions...</div>
              ) : visibleTransactions.length === 0 ? (
                <div className="tx-empty">No transactions found.</div>
              ) : (
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Merchant</th>
                      <th>Category</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTransactions.map((t) => {
                      const amt = amountNumber(t.amount);
                      const isIn = amt >= 0;
                      return (
                        <tr key={`${t.transaction_id || ""}-${t.date}-${t.account_id}-${t.amount}`}>
                          <td>{formatDate(t.date)}</td>
                          <td>{t.merchant_name || t.name || "—"}</td>
                          <td>{bucketCategory(t.category)}</td>
                          <td className={`tx-amount ${isIn ? "in" : "out"}`}>
                            {isIn ? "+" : "-"}${formatMoney(Math.abs(amt))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>

        <aside className="tx-sidebar">
          <section className="tx-card">
            <div className="tx-card-h">
              <h2>Monthly Tips</h2>
              <span className="tx-chip">{month}/{year}</span>
            </div>
            <div style={{ padding: "0 1.25rem" }}>
              {monthlySavingDesc?.length ? (
                monthlySavingDesc.map((t) => (
                  <div className="tx-tip" key={t.name}>
                    <div>
                      <strong>{t.name}</strong> — you spent ${formatMoney(t.total)}
                    </div>
                    <div className="tx-tip-sub">
                    You could save about ${formatMoney(t.per_saving)} by taking this offer — <strong>"{t.desc}"</strong> — if you haven’t already.
                  </div>
                  </div>
                ))
              ) : (
                <div className="tx-empty">No tips available for this month yet.</div>
              )}
            </div>
          </section>
        </aside>

      </main>
    </div>
  );
}
