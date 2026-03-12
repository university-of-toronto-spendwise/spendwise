import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { API_BASE_URL, authHeaders, getToken } from "../utils/session";

const STATUSES = [
  { key: "saved", label: "Saved" },
  { key: "in_progress", label: "In Progress" },
  { key: "submitted", label: "Submitted" },
];


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
                    background: "var(--sw-primary)",
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
