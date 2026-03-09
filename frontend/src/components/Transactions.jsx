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
    @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap');

    .tx-page{background:#f4f7fb;min-height:100vh;font-family:'Source Sans 3',sans-serif}
    .tx-body{max-width:1180px;margin:0 auto;padding:30px 20px 70px}
    .tx-header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px;flex-wrap:wrap}
    .tx-title{margin:0;font-size:40px;letter-spacing:-0.02em;color:#002a5c;line-height:1.05;font-weight:800}
    .tx-subtitle{margin:8px 0 0;color:#6b7a90;font-size:18px}
    .tx-chip{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;border:2px solid #d0dbe8;background:#fff;color:#002a5c;font-size:13px;font-weight:700}
    .tx-sync-btn{border:none;border-radius:12px;padding:11px 16px;background:#002a5c;color:#fff;font-weight:800;cursor:pointer;box-shadow:3px 3px 0px #e8b53e}
    .tx-sync-btn:hover:not(:disabled){background:#0047a0}
    .tx-sync-btn:disabled{opacity:.6;cursor:not-allowed;box-shadow:none}

    .tx-account-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 16px}
    .tx-account-tab{max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:2px solid #d0dbe8;background:#fff;color:#002a5c;border-radius:999px;padding:7px 12px;font-weight:700;font-size:13px;cursor:pointer}
    .tx-account-tab.active{background:#002a5c;border-color:#002a5c;color:#fff;box-shadow:2px 2px 0px #e8b53e}

    .tx-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;margin:0 0 16px}
    .tx-card{background:#fff;border:2px solid #d0dbe8;border-radius:18px;box-shadow:0 4px 14px rgba(0,42,92,.06)}
    .tx-card-h{padding:14px 16px;border-bottom:2px solid #eef2f8;display:flex;align-items:center;justify-content:space-between}
    .tx-card-h h3{margin:0;font-size:14px;letter-spacing:.09em;text-transform:uppercase;color:#002a5c}
    .tx-card-b{padding:16px}

    .tx-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .tx-stat{padding:14px;border-radius:14px;background:linear-gradient(180deg,#fff,#f8fbff);border:2px solid #e1e9f4}
    .tx-stat p{margin:0;color:#6b7a90;font-size:12px;font-weight:600}
    .tx-stat h2{margin:7px 0 0;font-size:30px;color:#002a5c;line-height:1;font-weight:800}

    .tx-controls{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:16px}
    .tx-select{width:100%;padding:10px 12px;border-radius:12px;border:2px solid #d0dbe8;background:#fff;color:#002a5c;font-weight:600;outline:none;min-height:44px}
    .tx-select:focus{border-color:#0047a0}

    .tx-tips{display:flex;flex-direction:column;gap:10px}
    .tx-tip{padding:12px;border:2px dashed #c9dbf6;background:#edf4ff;border-radius:12px;color:#002a5c}
    .tx-tip strong{color:#002a5c}

    .tx-table-wrap{overflow:auto}
    .tx-table{width:100%;border-collapse:separate;border-spacing:0}
    .tx-table th{position:sticky;top:0;background:#f7faff;border-bottom:2px solid #dce7f4;color:#002a5c;font-size:12px;text-transform:uppercase;letter-spacing:.09em;padding:12px;text-align:left}
    .tx-table td{padding:13px 12px;border-bottom:1px solid #edf2f8;color:#1e2f45;font-size:15px}
    .tx-table tr:hover td{background:#f8fbff}

    .tx-cat{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;border:1px solid #d0dbe8;background:#fff;color:#0047a0;font-size:12px;font-weight:700}
    .tx-amount{font-variant-numeric:tabular-nums;font-weight:900;text-align:right}
    .tx-amount.in{color:#14805e}
    .tx-amount.out{color:#c0392b}

    .tx-empty{padding:18px;color:#6b7a90;font-size:15px}
    .tx-note{margin:0 0 12px;padding:11px 14px;border-radius:12px;background:#eef4fb;border:2px solid #d5e0ee;color:#334860;font-size:14px}
    .tx-error{margin:0 0 12px;padding:11px 14px;border-radius:12px;border:2px solid #f3c3bf;background:#fff4f3;color:#8c2c23}

    @media (max-width:980px){
      .tx-grid{grid-template-columns:1fr}
      .tx-controls{grid-template-columns:repeat(2,minmax(0,1fr))}
      .tx-title{font-size:34px}
    }
  `;

  return (
    <div className="tx-page">
      <Navbar />

      <main className="tx-body">
        <style>{CSS}</style>

        <header className="tx-header">
          <div>
            <h1 className="tx-title">Transactions</h1>
            <p className="tx-subtitle">Review spending by account, category, and date range.</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="tx-chip">{connectedItems.length} bank(s) connected</div>
            <button
              className="tx-sync-btn"
              onClick={async () => {
                await syncConnectedItems();
                await fetchAllData();
              }}
              disabled={syncing}
            >
              {syncing ? "Syncing..." : "Sync Latest"}
            </button>
          </div>
        </header>

        <div className="tx-account-tabs">
          <button
            type="button"
            className={`tx-account-tab ${accountId === "" ? "active" : ""}`}
            onClick={() => setAccountId("")}
          >
            All
          </button>
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`tx-account-tab ${accountId === a.id ? "active" : ""}`}
              onClick={() => setAccountId(a.id)}
              title={formatAccountLabel(a.id)}
            >
              {shortAccountName(formatAccountLabel(a.id))}
            </button>
          ))}
        </div>

        {status && <div className="tx-note">{status}</div>}
        {error && <div className="tx-error">{error}</div>}

        <section className="tx-grid">
          <div className="tx-card">
            <div className="tx-card-h">
              <h3>Overview</h3>
              <span className="tx-chip">{visibleTransactions.length} shown - {selectedLabel}</span>
            </div>
            <div className="tx-card-b">
              <div className="tx-stats">
                <div className="tx-stat">
                  <p>Total Expenses</p>
                  <h2>${formatMoney(totalExpensesAmount)}</h2>
                </div>
                <div className="tx-stat">
                  <p>Potential Saving</p>
                  <h2>${formatMoney(monthlySavingAmount)}</h2>
                </div>
              </div>

              <div className="tx-controls">
                <select className="tx-select" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                  {DATE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>

                <select className="tx-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
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
              <h3>Saving Tips</h3>
              <span className="tx-chip">Based on merchants</span>
            </div>
            <div className="tx-card-b">
              <div className="tx-tips">
                {monthlySavingDesc?.length ? (
                  monthlySavingDesc.map((t) => (
                    <div className="tx-tip" key={t.name}>
                      <div><strong>{t.name}</strong> - spent ${formatMoney(t.total)}</div>
                      <div>You could save about ${formatMoney(t.per_saving)} by reducing this expense.</div>
                    </div>
                  ))
                ) : (
                  <div className="tx-empty">No tips available for this date range yet.</div>
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
              <div className="tx-empty">No transactions found for this filter.</div>
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
                    const categoryLabel = bucketCategory(t.category);

                    return (
                      <tr key={`${t.transaction_id || ""}-${t.date}-${t.account_id}-${t.amount}`}>
                        <td>{formatDate(t.date)}</td>
                        <td>{t.merchant_name || t.name || "-"}</td>
                        <td><span className="tx-cat">{categoryLabel}</span></td>
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
