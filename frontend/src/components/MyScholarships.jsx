import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { API_BASE_URL, authHeaders, getToken } from "../utils/session";

const STATUSES = [
  { key: "saved", label: "Saved" },
  { key: "in_progress", label: "In Progress" },
  { key: "submitted", label: "Submitted" },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+3:wght@300;400;500;600&display=swap');

  :root {
    --uoft-blue: #002A5C;
    --uoft-mid: #0047A0;
    --uoft-accent: #E8B53E;
    --off-white: #F4F7FB;
    --text-muted: #6B7A90;
    --border: #D0DBE8;
    --error: #C0392B;
  }

  .ms-page {
    min-height: 100vh;
    background: var(--off-white);
    font-family: inherit;
  }

  .ms-body {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }

  .ms-header {
    margin-bottom: 1.5rem;
  }

  .ms-header h1 {
    font-size: 1.9rem;
    font-weight: 700;
    color: var(--uoft-blue);
    margin-bottom: 0.25rem;
  }

  .ms-header p {
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  .ms-kanban {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
    align-items: start;
  }

  .ms-column {
    background: white;
    border: 1.5px solid var(--border);
    border-radius: 14px;
    min-height: 400px;
    display: flex;
    flex-direction: column;
    transition: background 0.2s, border-color 0.2s;
  }

  .ms-column.drag-over {
    background: #EEF3FB;
    border-color: var(--uoft-mid);
  }

  .ms-column.saved { border-top: 4px solid #B91C1C; }
  .ms-column.saved .ms-column-header { background: #FEE2E2; color: #B91C1C; border-color: #FECACA; }
  .ms-column.saved .ms-column-count { background: #FECACA; color: #B91C1C; }

  .ms-column.in_progress { border-top: 4px solid #92400E; }
  .ms-column.in_progress .ms-column-header { background: #FEF3C7; color: #92400E; border-color: #FDE68A; }
  .ms-column.in_progress .ms-column-count { background: #FDE68A; color: #92400E; }

  .ms-column.submitted { border-top: 4px solid #047857; }
  .ms-column.submitted .ms-column-header { background: #D1FAE5; color: #047857; border-color: #A7F3D0; }
  .ms-column.submitted .ms-column-count { background: #A7F3D0; color: #047857; }

  .ms-column-header {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--uoft-blue);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 14px 14px 0 0;
  }

  .ms-column-count {
    font-size: 0.75rem;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
  }

  .ms-column-cards {
    flex: 1;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .ms-card {
    background: white;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    padding: 1rem 1.2rem;
    cursor: grab;
    transition: box-shadow 0.15s;
  }

  .ms-card:hover {
    box-shadow: 0 4px 12px rgba(0,42,92,0.08);
  }

  .ms-card:active {
    cursor: grabbing;
  }

  .ms-card.dragging {
    opacity: 0.6;
    cursor: grabbing;
  }

  .ms-card-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--uoft-blue);
    margin-bottom: 0.35rem;
    line-height: 1.3;
  }

  .ms-card-amount {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--uoft-mid);
    margin-bottom: 0.4rem;
  }

  .ms-card-deadline {
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  .ms-card-deadline.urgent {
    color: var(--error);
    font-weight: 600;
  }

  .ms-empty {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-muted);
  }

  .ms-empty-icon {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
  }

  .ms-loading {
    display: flex;
    justify-content: center;
    padding: 3rem;
  }

  .ms-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #E8EDF5;
    border-top-color: var(--uoft-mid);
    border-radius: 50%;
    animation: ms-spin 0.7s linear infinite;
  }

  @keyframes ms-spin {
    to { transform: rotate(360deg); }
  }
`;

// ── Shared auth helpers ───────────────────────────────────────────────────────
const getAccessToken = () =>
  sessionStorage.getItem("userAccessToken") || sessionStorage.getItem("userToken");

const refreshAccessToken = async () => {
  const refresh = sessionStorage.getItem("userRefreshToken");
  if (!refresh) return null;
  const res = await fetch(`${API_BASE_URL}/token/refresh/`, {
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
  let token = getAccessToken();
  if (!token) return { ok: false, status: 401 };
  const doFetch = (accessToken) =>
    fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` },
    });
  let res = await doFetch(token);
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await doFetch(newToken);
  }
  return res;
};
// ─────────────────────────────────────────────────────────────────────────────

function formatAmount(s) {
  if (!s) return null;
  if (s.amount_min || s.amount_max) {
    const val = s.amount_max || s.amount_min;
    return `$${val.toLocaleString()}`;
  }
  return s.amount_text || null;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function formatDeadline(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function KanbanCard({ item, onDragStart, onDragEnd, isDragging }) {
  const s = item.scholarship || item;
  const amt = formatAmount(s);
  const days = daysUntil(s.deadline);
  const isUrgent = days !== null && days <= 14;

  return (
    <div
      className={`ms-card ${isDragging ? "dragging" : ""}`}
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onDragEnd={onDragEnd}
    >
      <div className="ms-card-title">{s.title}</div>
      {amt && <div className="ms-card-amount">{amt}</div>}
      {s.deadline && (
        <div className={`ms-card-deadline ${isUrgent ? "urgent" : ""}`}>
          {formatDeadline(s.deadline)}
          {days !== null && days >= 0 && ` (${days} days)`}
        </div>
      )}
    </div>
  );
}

export default function MyScholarships() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggingItem, setDraggingItem] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/scholarships/saved/`);
      if (!res.ok) return;
      const data = await res.json();
      setSaved(Array.isArray(data) ? data : []);
    } catch {
      setSaved([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (savedId, newStatus) => {
    const res = await fetchWithAuth(`${API_BASE_URL}/scholarships/saved/${savedId}/status/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) await fetchSaved();
  }, [fetchSaved]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const byStatus = STATUSES.reduce((acc, { key }) => {
    acc[key] = saved.filter((i) => (i.status || "saved") === key);
    return acc;
  }, {});

  const handleDragStart = (e, item) => {
    setDraggingItem(item);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify({ id: item.id }));
    e.dataTransfer.setData("text/plain", String(item.id));
  };

  const handleDragEnd = () => {
    setDraggingItem(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, statusKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(statusKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggingItem || draggingItem.status === newStatus) return;
    updateStatus(draggingItem.id, newStatus);
    setDraggingItem(null);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="ms-page">
        <Navbar />
        <div className="ms-body">
          <div className="ms-header">
            <h1>My Scholarships</h1>
            <p>Drag and drop scholarships between columns to track your progress.</p>
          </div>

          {loading ? (
            <div className="ms-loading">
              <div className="ms-spinner" />
            </div>
          ) : saved.length === 0 ? (
            <div className="ms-empty">
              <div className="ms-empty-icon">🎓</div>
              <h3>No saved scholarships</h3>
              <p>
                <button
                  type="button"
                  onClick={() => navigate("/scholarships")}
                  style={{
                    background: "var(--uoft-blue)",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Browse Scholarships
                </button>
              </p>
            </div>
          ) : (
            <div className="ms-kanban">
              {STATUSES.map(({ key, label }) => (
                <div
                  key={key}
                  className={`ms-column ${key} ${dragOverColumn === key ? "drag-over" : ""}`}
                  onDragOver={(e) => handleDragOver(e, key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, key)}
                >
                  <div className="ms-column-header">
                    {label}
                    <span className="ms-column-count">{byStatus[key].length}</span>
                  </div>
                  <div className="ms-column-cards">
                    {byStatus[key].map((item) => (
                      <KanbanCard
                        key={item.id}
                        item={item}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        isDragging={draggingItem?.id === item.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
