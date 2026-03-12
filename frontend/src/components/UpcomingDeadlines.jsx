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

/** End of school year placeholder for scholarships without a deadline (sorts to the back). */
const NO_DEADLINE_PLACEHOLDER = "9999-12-31";

/**
 * Normalize saved scholarship item to flat shape. Handles API format { scholarship, status }.
 */
function normalizeItem(raw) {
  const s = raw.scholarship || raw;
  const status = raw.status || "saved";
  return {
    id: raw.id ?? s?.id,
    scholarshipId: s?.id,
    title: s?.title ?? raw.title,
    deadline: s?.deadline ?? raw.deadline,
    status,
  };
}

/**
 * Reusable Upcoming Deadlines component.
 * Shows saved scholarships (saved + in_progress only) ordered by due date (soonest first).
 * Scholarships without a deadline are pushed to the very back.
 * Submitted scholarships are excluded to make space for others.
 * - If `items` is provided, uses that list (e.g. from parent state).
 * - Otherwise fetches saved scholarships from the API.
 * Used on both Dashboard and Scholarships pages.
 */
export default function UpcomingDeadlines({ items: itemsProp, maxItems = 5 }) {
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
    .map(normalizeItem)
    .filter((s) => s.status !== "submitted")
    .map((s) => ({
      ...s,
      sortDeadline: s.deadline || NO_DEADLINE_PLACEHOLDER,
    }))
    .sort((a, b) => new Date(a.sortDeadline) - new Date(b.sortDeadline))
    .slice(0, maxItems);

  if (loading && withDeadlines.length === 0) {
    return (
      <>
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
        <div className="ud-card">
          <h2 className="ud-card-title">Upcoming Deadlines</h2>
          <div className="ud-empty" style={{ color: "var(--sw-error)" }}>{error}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="ud-card">
        <h2 className="ud-card-title">Upcoming Deadlines</h2>
        {withDeadlines.length === 0 ? (
          <div className="ud-empty">No upcoming deadlines. Save scholarships to see them here.</div>
        ) : (
          <div className="ud-list">
            {withDeadlines.map((s) => {
              const hasRealDeadline = !!s.deadline;
              const days = daysUntil(s.deadline);
              const meta = hasRealDeadline
                ? days !== null && days >= 0
                  ? `${formatDeadline(s.deadline)} – ${days} days left`
                  : formatDeadline(s.deadline)
                : "No deadline listed";
              return (
                <div className="ud-row" key={s.id ?? s.scholarshipId}>
                  <div className="ud-row-left">
                    <div className="ud-badge">
                      {hasRealDeadline ? new Date(s.deadline).getDate() : "—"}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="ud-row-title">{s.title}</div>
                      <div className="ud-row-sub">{meta}</div>
                    </div>
                  </div>
                  <div style={{ color: "var(--sw-text-muted)", fontWeight: 600 }}>›</div>
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
