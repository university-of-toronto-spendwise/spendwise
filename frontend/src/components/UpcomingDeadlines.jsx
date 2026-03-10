import { useState, useEffect } from "react";

const API = "/api";

const getAccessToken = () =>
  sessionStorage.getItem("userAccessToken") || sessionStorage.getItem("userToken");

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
  let token = getAccessToken();
  if (!token) return { ok: false, status: 401 };
  const doFetch = (accessToken) =>
    fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  let res = await doFetch(token);
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await doFetch(newToken);
  }
  return res;
};

const udStyles = `
  .ud-card { background: var(--white, #fff); border: 2px solid var(--border, #D0DBE8); border-radius: 18px; padding: 1.25rem 1.5rem; }
  .ud-card-title { font-size: 1.02rem; font-weight: 900; color: var(--uoft-blue, #002A5C); margin: 0 0 0.85rem 0; }
  .ud-list { display: flex; flex-direction: column; gap: 0.95rem; }
  .ud-row { display: flex; align-items: center; justify-content: space-between; gap: 0.9rem; padding: 1rem; border-radius: 16px; background: #F7FAFF; border: 2px solid rgba(208,219,232,0.75); }
  .ud-row-left { display: flex; gap: 0.9rem; align-items: center; min-width: 0; }
  .ud-badge { width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-weight: 900; flex-shrink: 0; border: 2px solid var(--border); background: #EAF0FF; color: var(--uoft-mid, #0047A0); font-size: 1rem; }
  .ud-row-title { font-weight: 900; color: var(--uoft-blue); font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ud-row-sub { color: var(--text-muted, #6B7A90); font-size: 0.95rem; margin-top: 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ud-empty { color: var(--text-muted); font-size: 0.95rem; text-align: center; padding: 1.25rem 0; }
`;

function formatDeadline(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

/**
 * Reusable Upcoming Deadlines component.
 * Shows saved scholarships ordered by due date (soonest first).
 * - If `items` is provided, uses that list (e.g. from parent state).
 * - Otherwise fetches saved scholarships from the API.
 * Used on both Dashboard and Scholarships pages.
 */
export default function UpcomingDeadlines({ items: itemsProp, maxItems = 8 }) {
  const [items, setItems] = useState(itemsProp ?? []);
  const [loading, setLoading] = useState(!itemsProp);
  const [error, setError] = useState(null);

  const fetchSaved = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API}/scholarships/saved/`);
      if (!res.ok) {
        if (res.status === 401) return;
        throw new Error("Failed to load saved scholarships");
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (itemsProp !== undefined) {
      setItems(Array.isArray(itemsProp) ? itemsProp : []);
      setLoading(false);
      return;
    }
    fetchSaved();
  }, [itemsProp]);

  const withDeadlines = items
    .filter((s) => s.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, maxItems);

  if (loading && withDeadlines.length === 0) {
    return (
      <>
        <style>{udStyles}</style>
        <div className="ud-card">
          <h2 className="ud-card-title">Upcoming Deadlines</h2>
          <div className="ud-empty">Loading…</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{udStyles}</style>
        <div className="ud-card">
          <h2 className="ud-card-title">Upcoming Deadlines</h2>
          <div className="ud-empty" style={{ color: "#C0392B" }}>{error}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{udStyles}</style>
      <div className="ud-card">
        <h2 className="ud-card-title">Upcoming Deadlines</h2>
        {withDeadlines.length === 0 ? (
          <div className="ud-empty">No upcoming deadlines. Save scholarships to see them here.</div>
        ) : (
          <div className="ud-list">
            {withDeadlines.map((s) => {
              const days = daysUntil(s.deadline);
              const meta =
                days !== null && days >= 0
                  ? `${formatDeadline(s.deadline)} – ${days} days left`
                  : formatDeadline(s.deadline);
              return (
                <div className="ud-row" key={s.id}>
                  <div className="ud-row-left">
                    <div className="ud-badge">
                      {s.deadline ? new Date(s.deadline).getDate() : "—"}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="ud-row-title">{s.title}</div>
                      <div className="ud-row-sub">{meta}</div>
                    </div>
                  </div>
                  <div style={{ color: "var(--text-muted)", fontWeight: 900 }}>›</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export { formatDeadline, daysUntil };
