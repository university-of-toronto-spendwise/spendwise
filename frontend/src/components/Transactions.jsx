import React, { useState, useEffect, useMemo } from "react";
import Navbar from "./Navbar";

export default function Transactions() {

  const API_BASE = "http://0.0.0.0:8000/api";
  const ACCESS_TOKEN_KEY = "userAccessToken";
  const REFRESH_TOKEN_KEY = "userRefreshToken";

  const [transactions, setTransactions] = useState([]);
  const [monthlySavingAmount, setMonthlySavingAmount] = useState(null);
  const [totalExpensesAmount, setTotalExpensesAmount] = useState(null);
  const [monthlySavingDesc, setMonthlySavingDesc] = useState([]);
  const [error, setError] = useState("");

  const [category, setCategory] = useState("All");
  const [type, setType] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  const categories = ["All","Food","Transport","Shopping","Other"];

  const today = new Date();

  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const [loading, setLoading] = useState(false);

  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [accountLabelById, setAccountLabelById] = useState({});

  // -----------------------------
  // Fetch Transactions
  // -----------------------------
  const fetchTransactions = async () => {

    try {

      setError("");

      if (!getAccessToken()) {
        setTransactions([]);
        setAccounts([]);
        setError("You’re not logged in. Please sign in again.");
        return;
      }

      let url = `${API_BASE}/spending/monthly_transactions/?month=${month}&year=${year}`;

      if (accountId) {
        url += `&account_id=${accountId}`;
      }

      const response = await fetchWithAuth(url);

      if (!response.ok) {
        const text = await response.text();
        setTransactions([]);
        setAccounts([]);
        setError(`Failed to load transactions (${response.status}). ${text}`);
        return;
      }

      const result = await response.json();
      if (!Array.isArray(result)) {
        setTransactions([]);
        setAccounts([]);
        setError("Unexpected response format from server.");
        return;
      }

      setTransactions(result);

      // Build account list from transaction account_id
      const uniqueAccounts = [...new Set(result.map(t => t.account_id))];

      const accountObjects = uniqueAccounts.map(id => ({
        id: id,
        name: formatAccountLabel(id)
      }));

      setAccounts(accountObjects);

    } catch (error) {
      console.error(error);
      setTransactions([]);
      setAccounts([]);
      setError("Network error while loading transactions.");
    }
  };

  // -----------------------------
  // Monthly Saving Amount
  // -----------------------------
  const fetchMonthlySavingAmount = async () => {
    try {

      if (!getAccessToken()) {
        setMonthlySavingAmount(null);
        return;
      }

      const response = await fetchWithAuth(
        `${API_BASE}/spending/monthly_saving_amount/?month=${month}&year=${year}`
      );

      if (!response.ok) {
        setMonthlySavingAmount(null);
        return;
      }

      const result = await response.json();

      setMonthlySavingAmount(result.total_saving);

    } catch (error) {
      console.error(error);
      setMonthlySavingAmount(null);
    }
  };

  // -----------------------------
  // Total Expenses
  // -----------------------------
  const fetchTotalExpensesAmount = async () => {
    try {

      if (!getAccessToken()) {
        setTotalExpensesAmount(null);
        return;
      }

      const response = await fetchWithAuth(
        `${API_BASE}/spending/total_expenses_amount/?month=${month}&year=${year}`
      );

      if (!response.ok) {
        setTotalExpensesAmount(null);
        return;
      }

      const result = await response.json();

      setTotalExpensesAmount(result.total_expenses);

    } catch (error) {
      console.error(error);
      setTotalExpensesAmount(null);
    }
  };

  // -----------------------------
  // Monthly Saving Tips
  // -----------------------------
  const fetchMonthlySavingDesc = async () => {

    try {

      if (!getAccessToken()) {
        setMonthlySavingDesc([]);
        return;
      }

      const response = await fetchWithAuth(
        `${API_BASE}/spending/monthly_saving/?month=${month}&year=${year}`
      );

      if (!response.ok) {
        setMonthlySavingDesc([]);
        return;
      }

      const result = await response.json();

      setMonthlySavingDesc(result);

    } catch (error) {
      console.error(error);
      setMonthlySavingDesc([]);
    }
  };

  // -----------------------------
  // Fetch All
  // -----------------------------
  const fetchAllData = async () => {

    if (!month || !year) {
      alert("Please enter month and year");
      return;
    }

    setLoading(true);

    await Promise.all([
      fetchTransactions(),
      fetchMonthlySavingAmount(),
      fetchTotalExpensesAmount(),
      fetchMonthlySavingDesc()
    ]);

    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [month, year, accountId]);

  useEffect(() => {
    loadAccountLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------
  // Helpers
  // -----------------------------
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatMoney = (num) => {
    if (!num) return "0";
    return Number(num).toLocaleString();
  };

  const getAccessToken = () => (
    sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
    sessionStorage.getItem("userToken") // backwards compat
  );

  const refreshAccessToken = async () => {
    const refresh = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refresh) return null;

    const res = await fetch(`${API_BASE}/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const newAccess = data.access;
    if (!newAccess) return null;

    sessionStorage.setItem("userToken", newAccess);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, newAccess);
    return newAccess;
  };

  const fetchWithAuth = async (url, options = {}) => {
    const token = getAccessToken();
    if (!token) return { ok: false, status: 401, bodyText: "Missing auth token." };

    const doFetch = async (accessToken) => {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return res;
    };

    let res = await doFetch(token);
    if (res.status !== 401) return res;

    // Try refresh once on 401
    const newToken = await refreshAccessToken();
    if (!newToken) return res;

    res = await doFetch(newToken);
    return res;
  };

  const shortId = (id) => {
    const s = String(id || "");
    if (!s) return "Account";
    if (s.length <= 12) return `Account ${s}`;
    return `Account ${s.slice(0, 4)}…${s.slice(-4)}`;
  };

  const formatAccountLabel = (account_id) => {
    const label = accountLabelById?.[account_id];
    return label || shortId(account_id);
  };

  const amountNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const bucketCategory = (raw) => {
    const c = String(raw || "").toLowerCase();
    if (!c) return "Other";
    if (c.includes("food") || c.includes("restaurant") || c.includes("grocer")) return "Food";
    if (c.includes("transport") || c.includes("transit") || c.includes("travel")) return "Transport";
    if (c.includes("shop") || c.includes("store") || c.includes("retail") || c.includes("amazon"))
      return "Shopping";
    return "Other";
  };

  const visibleTransactions = useMemo(() => {
    let list = Array.isArray(transactions) ? transactions : [];

    if (category !== "All") {
      list = list.filter((t) => bucketCategory(t.category) === category);
    }

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
    if (sortBy === "Highest")
      list = [...list].sort((a, b) => Math.abs(amountNumber(b.amount)) - Math.abs(amountNumber(a.amount)));
    if (sortBy === "Lowest")
      list = [...list].sort((a, b) => Math.abs(amountNumber(a.amount)) - Math.abs(amountNumber(b.amount)));

    return list;
  }, [transactions, category, type, sortBy]);

  const loadAccountLabels = async () => {
    try {
      if (!getAccessToken()) return;

      const itemsRes = await fetchWithAuth(`${API_BASE}/plaid/items/`);
      if (!itemsRes.ok) return;

      const itemsPayload = await itemsRes.json();
      const items = itemsPayload?.items || [];
      if (!Array.isArray(items) || items.length === 0) return;

      const accountMaps = await Promise.all(
        items.map(async (it) => {
          const itemId = it?.item_id;
          if (!itemId) return {};

          const accRes = await fetchWithAuth(`${API_BASE}/plaid/items/${itemId}/accounts/`);
          if (!accRes.ok) return {};
          const accPayload = await accRes.json();
          const accounts = accPayload?.accounts || [];
          if (!Array.isArray(accounts)) return {};

          const map = {};
          for (const acc of accounts) {
            const id = acc?.account_id;
            if (!id) continue;
            const name = acc?.official_name || acc?.name || "Account";
            const mask = acc?.mask ? `••••${acc.mask}` : "";
            const type = acc?.subtype || acc?.type || "";
            map[id] = [name, mask || type ? `${mask}${mask && type ? " · " : ""}${type}` : ""]
              .filter(Boolean)
              .join(" ");
          }
          return map;
        })
      );

      const merged = {};
      for (const m of accountMaps) Object.assign(merged, m);
      if (Object.keys(merged).length) setAccountLabelById(merged);
    } catch (e) {
      // silent; fall back to shortened ids
    }
  };

  const CSS = `
    .tx-page{background:#f6f8fb;min-height:100vh}
    .tx-body{max-width:1100px;margin:0 auto;padding:28px 18px 60px}
    .tx-header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:18px}
    .tx-title{margin:0;font-size:34px;letter-spacing:-0.02em;color:#0f172a}
    .tx-subtitle{margin:6px 0 0;color:#475569}
    .tx-chip{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;border:1px solid #e2e8f0;background:white;color:#0f172a;font-size:12px}
    .tx-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;margin:16px 0}
    .tx-card{background:white;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 10px 26px rgba(15,23,42,.06)}
    .tx-card-h{padding:14px 16px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between}
    .tx-card-h h3{margin:0;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#334155}
    .tx-card-b{padding:16px}
    .tx-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .tx-stat{padding:14px;border-radius:14px;background:linear-gradient(180deg,#ffffff,#f8fafc);border:1px solid #eef2f7}
    .tx-stat p{margin:0;color:#64748b;font-size:12px}
    .tx-stat h2{margin:6px 0 0;font-size:22px;color:#0f172a}
    .tx-tips{display:flex;flex-direction:column;gap:10px}
    .tx-tip{padding:12px 12px;border:1px dashed #dbeafe;background:#eff6ff;border-radius:12px}
    .tx-tip strong{color:#0f172a}
    .tx-controls{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-top:14px}
    .tx-input,.tx-select{width:100%;padding:10px 12px;border-radius:12px;border:1px solid #e2e8f0;background:white;color:#0f172a}
    .tx-table-wrap{overflow:auto}
    .tx-table{width:100%;border-collapse:separate;border-spacing:0}
    .tx-table th{position:sticky;top:0;background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:.08em;padding:12px;text-align:left}
    .tx-table td{padding:12px;border-bottom:1px solid #f1f5f9;color:#0f172a}
    .tx-table tr:hover td{background:#fbfdff}
    .tx-amount{font-variant-numeric:tabular-nums;font-weight:700;text-align:right}
    .tx-amount.in{color:#0f766e}
    .tx-amount.out{color:#b91c1c}
    .tx-empty{padding:18px;color:#475569}
    .tx-error{margin:12px 0 0;padding:12px 14px;border-radius:12px;border:1px solid #fecaca;background:#fef2f2;color:#7f1d1d}
    @media (max-width:980px){.tx-grid{grid-template-columns:1fr}.tx-controls{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="tx-page">

      <Navbar />

      <main className="tx-body">

        <header className="tx-header">
          <div>
            <h1 className="tx-title">Transactions</h1>
            <p className="tx-subtitle">Track every payment, transfer, and deposit in one place.</p>
          </div>
          <div className="tx-chip">
            <span>Month</span>
            <strong>{month}/{year}</strong>
          </div>
        </header>

        <style>{CSS}</style>

        {error && <div className="tx-error">{error}</div>}

        <section className="tx-grid">
          <div className="tx-card">
            <div className="tx-card-h">
              <h3>Overview</h3>
              <span className="tx-chip">{visibleTransactions.length} shown</span>
            </div>
            <div className="tx-card-b">
              <div className="tx-stats">
                <div className="tx-stat">
                  <p>Total Monthly Expenses</p>
                  <h2>${formatMoney(totalExpensesAmount)}</h2>
                </div>
                <div className="tx-stat">
                  <p>Potential Saving</p>
                  <h2>${formatMoney(monthlySavingAmount)}</h2>
                </div>
              </div>

              <div className="tx-controls" style={{ marginTop: 14 }}>
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
              </div>
            </div>
          </div>

          <div className="tx-card">
            <div className="tx-card-h">
              <h3>Monthly Tips</h3>
              <span className="tx-chip">Based on merchants</span>
            </div>
            <div className="tx-card-b">
              <div className="tx-tips">
                {monthlySavingDesc?.length ? (
                  monthlySavingDesc.map((t) => (
                    <div className="tx-tip" key={t.name}>
                      <div>
                        <strong>{t.name}</strong> — spent ${formatMoney(t.total)}
                      </div>
                      <div>You could save about ${formatMoney(t.per_saving)} by reducing this expense.</div>
                    </div>
                  ))
                ) : (
                  <div className="tx-empty">No tips available for this month yet.</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="tx-card">
          <div className="tx-card-h">
            <h3>Transactions</h3>
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

      </main>

    </div>
  );
}
