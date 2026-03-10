import { useState, useEffect, useCallback } from "react";
import Navbar from "./Navbar";

const API = "/api";
const STATUSES = [
  { key: "saved", label: "Saved / Planned" },
  { key: "in_progress", label: "In Progress" },
  { key: "submitted", label: "Submitted" },
];

const getAccessToken = () =>
  sessionStorage.getItem("userAccessToken") || sessionStorage.getItem("userToken");
const refreshAccessToken = async () => {
  const r = sessionStorage.getItem("userRefreshToken");
  if (!r) return null;
  const res = await fetch(`${API}/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: r }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.access) return null;
  sessionStorage.setItem("userToken", data.access);
  sessionStorage.setItem("userAccessToken", data.access);
  return data.access;
};
const fetchWithAuth = async (url, options = {}) => {
  let token = getAccessToken();
  if (!token) return { ok: false, status: 401 };
  const doFetch = (t) =>
    fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${t}` },
    });
  let res = await doFetch(token);
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await doFetch(newToken);
  }
  return res;
};

function formatAmount(s) {
  if (!s) return null;
  if (s.amount_min || s.amount_max) {
    const val = s.amount_max || s.amount_min;
    return `$${val.toLocaleString()}`;
  }
  return s.amount_text || null;
}
function formatDeadline(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600&display=swap');
  :root { --uoft-blue: #002A5C; --uoft-mid: #0047A0; --off-white: #F4F7FB; --text-muted: #6B7A90; --border: #D0DBE8; --white: #FFFFFF; }
  .ms-page { min-height: 100vh; background: var(--off-white); font-family: inherit; }
  .ms-body { max-width: 1200px; margin: 0 auto; padding: 2rem 2rem; }
  .ms-header { margin-bottom: 1.5rem; }
  .ms-header h1 { font-size: 1.9rem; font-weight: 700; color: var(--uoft-blue); margin: 0 0 0.25rem 0; }
  .ms-header p { color: var(--text-muted); font-size: 0.95rem; margin: 0; }
  .ms-kanban { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; align-items: start; }
  .ms-column {
    background: #E8EDF5;
    border: 1.5px solid var(--border);
    border-radius: 14px;
    padding: 0.75rem;
    min-height: 320px;
  }
  .ms-column-title {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.75rem;
    padding: 0.4rem 0.75rem;
    border-radius: 999px;
    display: inline-block;
  }
  .ms-column-title--saved {
    background: #E0E7FF;
    color: #3730A3;
    border: 1px solid #C7D2FE;
  }
  .ms-column-title--in_progress {
    background: #FEF3C7;
    color: #92400E;
    border: 1px solid #FDE68A;
  }
  .ms-column-title--submitted {
    background: #D1FAE5;
    color: #047857;
    border: 1px solid #A7F3D0;
  }
  .ms-column.drag-over { background: #D0DBE8; border-color: var(--uoft-mid); }
  .ms-card {
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 0.75rem;
    cursor: grab;
    transition: box-shadow 0.15s;
  }
  .ms-card:active { cursor: grabbing; }
  .ms-card.dragging { opacity: 0.6; box-shadow: 0 8px 24px rgba(0,42,92,0.15); }
  .ms-card-title { font-size: 0.95rem; font-weight: 700; color: var(--uoft-blue); margin-bottom: 0.4rem; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .ms-card-amount { font-size: 1.1rem; font-weight: 700; color: var(--uoft-mid); margin-bottom: 0.35rem; }
  .ms-card-deadline { font-size: 0.8rem; color: var(--text-muted); }
  .ms-card-status {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-top: 0.5rem;
    padding: 0.24rem 0.5rem;
    border-radius: 999px;
    display: inline-block;
  }
  .ms-card-status--saved { background: #E0E7FF; color: #3730A3; border: 1px solid #C7D2FE; }
  .ms-card-status--in_progress { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
  .ms-card-status--submitted { background: #D1FAE5; color: #047857; border: 1px solid #A7F3D0; }
  .ms-empty { font-size: 0.88rem; color: var(--text-muted); text-align: center; padding: 1.5rem 0.5rem; }
  .ms-loading { display: flex; justify-content: center; padding: 2rem; }
  .ms-spinner { width: 32px; height: 32px; border: 3px solid #E8EDF5; border-top-color: var(--uoft-mid); border-radius: 50%; animation: ms-spin 0.7s linear infinite; }
  @keyframes ms-spin { to { transform: rotate(360deg); } }
`;

function KanbanCard({ item, onDragStart, onDragEnd, isDragging }) {
  const s = item.scholarship;
  const amt = formatAmount(s);
  const statusLabel = STATUSES.find((st) => st.key === item.status)?.label || item.status;
  return (
    <div
      className={`ms-card ${isDragging ? "dragging" : ""}`}
      draggable
      onDragStart={() => onDragStart(item)}
      onDragEnd={onDragEnd}
    >
      <div className="ms-card-title">{s.title}</div>
      {amt && <div className="ms-card-amount">{amt}</div>}
      {s.deadline && (
        <div className="ms-card-deadline">Due {formatDeadline(s.deadline)}</div>
      )}
      {s.offered_by && (
        <div className="ms-card-deadline" style={{ marginTop: "0.2rem" }}>
          {s.offered_by}
        </div>
      )}
      <div className={`ms-card-status ms-card-status--${item.status}`}>{statusLabel}</div>
    </div>
  );
}

export default function MyScholarships() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API}/scholarships/saved/`);
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const updateStatus = async (savedId, newStatus) => {
    const res = await fetchWithAuth(`${API}/scholarships/saved/${savedId}/status/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === savedId ? { ...it, status: newStatus } : it
        )
      );
    }
  };

  const handleDragStart = (item) => setDragging(item);
  const handleDragEnd = () => {
    setDragging(null);
    setDragOverColumn(null);
  };
  const handleDragOver = (e, statusKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(statusKey);
  };
  const handleDragLeave = () => setDragOverColumn(null);
  const handleDrop = (e, statusKey) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!dragging || dragging.status === statusKey) return;
    updateStatus(dragging.id, statusKey);
    setDragging(null);
  };

  const byStatus = (key) => items.filter((it) => it.status === key);

  return (
    <>
      <style>{styles}</style>
      <div className="ms-page">
        <Navbar />
        <div className="ms-body">
          <div className="ms-header">
            <h1>My Scholarships</h1>
            <p>Drag cards between columns to update your application status.</p>
          </div>
          {loading ? (
            <div className="ms-loading">
              <div className="ms-spinner" />
            </div>
          ) : (
            <div className="ms-kanban">
              {STATUSES.map(({ key, label }) => (
                <div
                  key={key}
                  className={`ms-column ${dragOverColumn === key ? "drag-over" : ""}`}
                  onDragOver={(e) => handleDragOver(e, key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, key)}
                >
                  <div className={`ms-column-title ms-column-title--${key}`}>{label}</div>
                  {byStatus(key).length === 0 ? (
                    <div className="ms-empty">No scholarships</div>
                  ) : (
                    byStatus(key).map((item) => (
                      <KanbanCard
                        key={item.id}
                        item={item}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        isDragging={dragging?.id === item.id}
                      />
                    ))
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
