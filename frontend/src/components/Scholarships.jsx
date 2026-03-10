import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Navbar from "./Navbar";
import UpcomingDeadlines from "./UpcomingDeadlines";

const API = "http://localhost:8000/api";
const API_REL = "/api";

const styles = `
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
  }

  body { font-family: inherit; }

  .sc-page {
    min-height: 100vh;
    background: var(--off-white);
    font-family: inherit;
  }

  .sc-body {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 2rem;
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 1.5rem;
    align-items: start;
  }

  .sc-main { min-width: 0; }

  .sc-header { margin-bottom: 1.5rem; }
  .sc-header h1 {
    font-family: inherit;
    font-size: 1.9rem;
    font-weight: 700;
    color: var(--uoft-blue);
    margin-bottom: 0.25rem;
  }
  .sc-header p { color: var(--text-muted); font-size: 0.95rem; }

  .sc-profile-bar {
    background: white;
    border: 1.5px solid var(--border);
    border-radius: 14px;
    padding: 1.2rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 2rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .sc-profile-fields { display: flex; gap: 2rem; flex: 1; flex-wrap: wrap; }

  .sc-profile-field {}
  .sc-profile-field-label {
    font-size: 0.72rem;
    color: var(--text-muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 0.2rem;
  }
  .sc-profile-field-value {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--uoft-blue);
  }

  .sc-edit-btn {
    background: var(--uoft-blue);
    color: white;
    border: none;
    border-radius: 10px;
    padding: 0.6rem 1.2rem;
    font-family: inherit;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    transition: background 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .sc-edit-btn:hover { background: var(--uoft-mid); }

  .sc-filter-bar {
    background: white;
    border: 1.5px solid var(--border);
    border-radius: 14px;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .sc-search-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-muted);
    flex: 1;
    min-width: 160px;
  }

  .sc-search-wrap input {
    border: none;
    outline: none;
    font-family: inherit;
    font-size: 0.92rem;
    color: var(--uoft-blue);
    background: transparent;
    width: 100%;
  }

  .sc-search-wrap input::placeholder { color: #B0BAC8; }

  .sc-divider {
    width: 1px;
    height: 24px;
    background: var(--border);
    flex-shrink: 0;
  }

  .sc-select {
    border: none;
    outline: none;
    font-family: inherit;
    font-size: 0.88rem;
    color: var(--uoft-blue);
    background: transparent;
    cursor: pointer;
    padding: 0.25rem 0.1rem;
    font-weight: 500;
  }

  .sc-toggle-wrap {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: #F4F7FB;
    border-radius: 10px;
    padding: 0.4rem 0.85rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--uoft-blue);
    cursor: pointer;
    border: 1.5px solid var(--border);
    white-space: nowrap;
    user-select: none;
  }

  .sc-toggle {
    width: 36px;
    height: 20px;
    border-radius: 20px;
    background: #ccc;
    position: relative;
    transition: background 0.2s;
    flex-shrink: 0;
  }
  .sc-toggle.on { background: var(--uoft-mid); }
  .sc-toggle::after {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: white;
    top: 3px;
    left: 3px;
    transition: left 0.2s;
  }
  .sc-toggle.on::after { left: 19px; }

  .sc-card {
    background: white;
    border: 1.5px solid var(--border);
    border-radius: 14px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 0.85rem;
    transition: box-shadow 0.15s;
    position: relative;
  }
  .sc-card:hover { box-shadow: 0 4px 16px rgba(0,42,92,0.08); }

  .sc-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.4rem;
  }

  .sc-card-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--uoft-blue);
    line-height: 1.35;
    flex: 1;
    padding-right: 1rem;
  }

  .sc-bookmark-btn {
    background: none;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted);
    flex-shrink: 0;
    transition: color 0.15s, border-color 0.15s;
  }
  .sc-bookmark-btn:hover { color: var(--uoft-blue); border-color: var(--uoft-blue); }
  .sc-bookmark-btn.saved { color: var(--uoft-mid); border-color: var(--uoft-mid); background: #E8F0FC; }
  .sc-bookmark-btn.saved:hover { color: var(--uoft-blue); border-color: var(--uoft-blue); }

  .sc-card-amount {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--uoft-mid);
    margin-bottom: 0.5rem;
  }

  .sc-card-tags {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    margin-bottom: 0.6rem;
  }

  .sc-tag {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 2px 9px;
    border-radius: 20px;
    text-transform: capitalize;
    letter-spacing: 0.02em;
  }
  .sc-tag-blue { background: #E8F0FC; color: var(--uoft-mid); }
  .sc-tag-green { background: #E8F7EF; color: #1D6A37; }
  .sc-tag-yellow { background: #FEF9EC; color: #92600A; }
  .sc-tag-gray { background: #F0F2F5; color: #4A5568; }

  .sc-card-bottom {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .sc-deadline {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--error);
    background: #FEF0EE;
    padding: 0.3rem 0.75rem;
    border-radius: 8px;
  }

  .sc-deadline-gray {
    color: var(--text-muted);
    background: #F0F2F5;
  }

  .sc-offered-by {
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  .sc-score-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .sc-score-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 500; }
  .sc-score-track {
    flex: 1;
    height: 5px;
    background: #E8EDF5;
    border-radius: 10px;
    overflow: hidden;
    max-width: 120px;
  }
  .sc-score-fill {
    height: 100%;
    background: var(--uoft-mid);
    border-radius: 10px;
    transition: width 0.4s ease;
  }

  .sc-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1.5rem;
  }

  .sc-page-btn {
    min-width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1.5px solid var(--border);
    background: white;
    color: var(--uoft-blue);
    font-family: inherit;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.5rem;
    transition: background 0.15s, border-color 0.15s;
  }
  .sc-page-btn:hover { background: #F0F4FA; }
  .sc-page-btn.active { background: var(--uoft-blue); color: white; border-color: var(--uoft-blue); }
  .sc-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .sc-sidebar-spacer { width: 300px; min-width: 300px; flex-shrink: 0; }

  .sc-sidebar {
    position: fixed !important;
    top: 80px !important;
    right: max(2rem, calc((100vw - 1200px) / 2 + 2rem)) !important;
    width: 300px !important;
    max-height: calc(100vh - 80px) !important;
    overflow-y: auto;
    z-index: 50;
  }
  @media (max-width: 1247px) {
    .sc-sidebar { right: 2rem !important; }
  }

  .sc-sidebar-card {
    background: white;
    border: 1.5px solid var(--border);
    border-radius: 14px;
    padding: 1.25rem;
    margin-bottom: 1rem;
  }

  .sc-sidebar-title {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--uoft-blue);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .sc-deadline-item {
    padding: 0.65rem 0;
    border-bottom: 1px solid #F0F2F5;
  }
  .sc-deadline-item:last-child { border-bottom: none; }
  .sc-deadline-item-title {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--uoft-blue);
    margin-bottom: 0.2rem;
  }
  .sc-deadline-item-date {
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  .sc-empty {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-muted);
  }
  .sc-empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
  .sc-empty h3 { font-size: 1rem; color: var(--uoft-blue); margin-bottom: 0.35rem; }

  .sc-loading {
    display: flex;
    justify-content: center;
    padding: 3rem;
  }
  .sc-spinner {
    width: 32px; height: 32px;
    border: 3px solid #E8EDF5;
    border-top-color: var(--uoft-mid);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .sc-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .sc-modal {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    width: 100%;
    max-width: 480px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  }

  .sc-modal h2 {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--uoft-blue);
    margin-bottom: 1.5rem;
  }

  .sc-modal-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .sc-modal-field label {
    display: block;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--uoft-blue);
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-bottom: 0.4rem;
  }

  .sc-modal-field input,
  .sc-modal-field select {
    width: 100%;
    height: 42px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    padding: 0 0.75rem;
    font-family: inherit;
    font-size: 0.88rem;
    color: var(--uoft-blue);
    outline: none;
    background: white;
    transition: border-color 0.15s;
  }

  .sc-modal-field input:focus,
  .sc-modal-field select:focus {
    border-color: var(--uoft-mid);
    box-shadow: 0 0 0 3px rgba(0,71,160,0.1);
  }

  .sc-modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .sc-modal-cancel {
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    border: 1.5px solid var(--border);
    background: white;
    color: var(--text-muted);
    font-family: inherit;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .sc-modal-cancel:hover { border-color: var(--uoft-blue); color: var(--uoft-blue); }

  .sc-modal-save {
    padding: 0.6rem 1.4rem;
    border-radius: 8px;
    border: none;
    background: var(--uoft-blue);
    color: white;
    font-family: inherit;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .sc-modal-save:hover { background: var(--uoft-mid); }

  .sc-results-header {
    font-size: 0.82rem;
    color: var(--text-muted);
    margin-bottom: 0.85rem;
    font-weight: 500;
  }
  .sc-card-status-badge {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.28rem 0.6rem;
    border-radius: 999px;
    display: inline-block;
  }
  .sc-card-status-badge.saved {
    background: #E0E7FF;
    color: #3730A3;
    border: 1px solid #C7D2FE;
  }
  .sc-card-status-badge.in_progress {
    background: #FEF3C7;
    color: #92400E;
    border: 1px solid #FDE68A;
  }
  .sc-card-status-badge.submitted {
    background: #D1FAE5;
    color: #047857;
    border: 1px solid #A7F3D0;
  }
`;

// ── Icons ──
const SearchIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const BookmarkIcon = ({ filled }) => (
  <svg width="14" height="14" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
);
const CalendarIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);

// ── Helpers ──
const DEFAULT_PROFILE = {
  faculty: "", major: "", year: 1,
  degree_type: "Undergrad", citizenship: "Domestic", campus: "St.George",
};

function loadProfile() {
  try { return JSON.parse(localStorage.getItem("userProfile")) || DEFAULT_PROFILE; }
  catch { return DEFAULT_PROFILE; }
}

function formatAmount(s) {
  if (!s) return null;
  if (s.amount_min || s.amount_max) {
    const val = s.amount_max || s.amount_min;
    return `$${val.toLocaleString()}`;
  }
  return null;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function formatDeadline(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_LABELS = { saved: "Saved", in_progress: "In Progress", submitted: "Submitted" };

// ── Sub-components ──
function ScholarshipCard({ s, score, reasons, isSaved, onSave, onUnsave, status }) {
  const amt = formatAmount(s);
  const days = daysUntil(s.deadline);
  const isUrgent = days !== null && days <= 14;

  const handleBookmarkClick = () => {
    if (isSaved) onUnsave?.(s.id);
    else onSave?.(s.id);
  };

  return (
    <div className="sc-card">
      <div className="sc-card-top">
        <div className="sc-card-title">{s.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {status && (
            <span className={`sc-card-status-badge ${status}`} title={STATUS_LABELS[status] || status}>
              {STATUS_LABELS[status] || status}
            </span>
          )}
          <button
            className={`sc-bookmark-btn ${isSaved ? "saved" : ""}`}
            title={isSaved ? "Unsave" : "Save to my scholarships"}
            onClick={handleBookmarkClick}
          >
            <BookmarkIcon filled={isSaved} />
          </button>
        </div>
      </div>

      {amt && <div className="sc-card-amount">{amt}</div>}
      {!amt && s.amount_text && (
        <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
          {s.amount_text}
        </div>
      )}

      <div className="sc-card-tags">
        {s.award_type && (
          <span className="sc-tag sc-tag-blue">{s.award_type.replace("_", "-")}</span>
        )}
        {s.citizenship?.map((c) => (
          <span key={c} className="sc-tag sc-tag-green">{c}</span>
        ))}
        {s.nature?.slice(0, 2).map((n) => (
          <span key={n} className="sc-tag sc-tag-gray">{n.replace(/_/g, " ")}</span>
        ))}
        {s.application_required && (
          <span className="sc-tag sc-tag-yellow">Application Required</span>
        )}
      </div>

      <div className="sc-card-bottom">
        {s.deadline ? (
          <span className={`sc-deadline ${!isUrgent ? "sc-deadline-gray" : ""}`}>
            {isUrgent ? <ClockIcon /> : <CalendarIcon />}
            Deadline: {formatDeadline(s.deadline)}
            {days !== null && days >= 0 && ` (${days} days left)`}
          </span>
        ) : (
          <span className="sc-deadline sc-deadline-gray">
            <CalendarIcon /> No deadline listed
          </span>
        )}
        {s.offered_by && <span className="sc-offered-by">{s.offered_by}</span>}
      </div>

      {score !== undefined && (
        <div className="sc-score-bar">
          <span className="sc-score-label">Match {Math.round(score * 100)}%</span>
          <div className="sc-score-track">
            <div className="sc-score-fill" style={{ width: `${score * 100}%` }} />
          </div>
          {reasons?.length > 0 && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{reasons[0]}</span>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileModal({ profile, onSave, onClose }) {
  const [form, setForm] = useState({ ...profile });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="sc-modal-overlay" onClick={onClose}>
      <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
        <h2>✏️ Edit Your Profile</h2>
        <div className="sc-modal-grid">
          <div className="sc-modal-field">
            <label>Faculty</label>
            <input value={form.faculty} onChange={(e) => set("faculty", e.target.value)} placeholder="e.g. Engineering" />
          </div>
          <div className="sc-modal-field">
            <label>Major</label>
            <input value={form.major} onChange={(e) => set("major", e.target.value)} placeholder="e.g. Computer Science" />
          </div>
          <div className="sc-modal-field">
            <label>Year</label>
            <select value={form.year} onChange={(e) => set("year", Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="sc-modal-field">
            <label>Degree</label>
            <select value={form.degree_type} onChange={(e) => set("degree_type", e.target.value)}>
              <option>Undergrad</option>
              <option>Postgrad</option>
            </select>
          </div>
          <div className="sc-modal-field">
            <label>Status</label>
            <select value={form.citizenship} onChange={(e) => set("citizenship", e.target.value)}>
              <option>Domestic</option>
              <option>International</option>
            </select>
          </div>
          <div className="sc-modal-field">
            <label>Campus</label>
            <select value={form.campus} onChange={(e) => set("campus", e.target.value)}>
              <option>St.George</option>
              <option>Scarborough</option>
              <option>Mississauga</option>
            </select>
          </div>
        </div>
        <div className="sc-modal-actions">
          <button className="sc-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="sc-modal-save" onClick={() => onSave(form)}>Save Profile</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
export default function Scholarships() {
  const [profile, setProfile]           = useState(loadProfile);
  const [showModal, setShowModal]        = useState(false);
  const [scholarships, setScholarships]  = useState([]);
  const [savedScholarships, setSavedScholarships] = useState([]);
  const [matchResults, setMatchResults]  = useState(null);
  const [loading, setLoading]            = useState(false);
  const [total, setTotal]                = useState(0);
  const [page, setPage]                  = useState(1);
  const [onlyMatched, setOnlyMatched]    = useState(false);
  const [viewSavedOnly, setViewSavedOnly] = useState(false);
  const [savedIds, setSavedIds]          = useState(new Set());

  // filters
  const [q, setQ]                               = useState("");
  const [sortBy, setSortBy]                     = useState("title");
  const [filterCitizenship, setFilterCitizenship] = useState("");
  const [filterAwardType, setFilterAwardType]   = useState("");

  const PAGE_SIZE = 20;

  const getAccessToken = () =>
    sessionStorage.getItem("userAccessToken") || sessionStorage.getItem("userToken");

  const refreshAccessToken = async () => {
    const refresh = sessionStorage.getItem("userRefreshToken");
    if (!refresh) return null;
    const res = await fetch(`${API_REL}/token/refresh/`, {
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

  // ── Fetch saved scholarships ──
  const fetchSavedScholarships = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      const res = await fetchWithAuth(`${API_REL}/scholarships/saved/`);
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setSavedScholarships(list);
      setSavedIds(new Set(list.map((i) => i.scholarship?.id ?? i.id).filter(Boolean)));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSavedScholarships();
  }, [fetchSavedScholarships]);

  // ── Save / Unsave ──
  const handleSave = async (id) => {
    if (!getAccessToken()) return;
    try {
      const res = await fetchWithAuth(`${API_REL}/scholarships/${id}/save/`, { method: "POST" });
      if (res.ok) await fetchSavedScholarships();
    } catch { /* ignore */ }
  };

  const handleUnsave = async (id) => {
    if (!getAccessToken()) return;
    try {
      const res = await fetchWithAuth(`${API_REL}/scholarships/${id}/save/`, { method: "DELETE" });
      if (res.ok) await fetchSavedScholarships();
    } catch { /* ignore */ }
  };

  // ── Fetch list ──
  const fetchScholarships = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page });
      if (q)                 params.set("q", q);
      if (sortBy)            params.set("sort", sortBy);
      if (filterCitizenship) params.set("citizenship", filterCitizenship);
      if (filterAwardType)   params.set("award_type", filterAwardType);

      const res = await fetch(`${API}/scholarships/?${params}`);
      const data = await res.json();
      setScholarships(data.results || []);
      setTotal(data.count || 0);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [page, q, sortBy, filterCitizenship, filterAwardType]);

  // ── Fetch match ──
  const fetchMatch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/scholarships/match/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      setMatchResults(data);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [profile]);

  useEffect(() => {
    if (viewSavedOnly) return;
    if (onlyMatched) fetchMatch();
    else fetchScholarships();
  }, [onlyMatched, viewSavedOnly, fetchScholarships, fetchMatch]);

  // reset page on filter change
  useEffect(() => { setPage(1); }, [q, sortBy, filterCitizenship, filterAwardType, onlyMatched]);

  const handleSaveProfile = (newProfile) => {
    setProfile(newProfile);
    localStorage.setItem("userProfile", JSON.stringify(newProfile));
    setShowModal(false);
    if (onlyMatched) fetchMatch();
  };

  const displayList = (() => {
    if (onlyMatched && matchResults?.length) {
      const mapped = matchResults.map((r) => ({ ...r.scholarship, _score: r.score, _reasons: r.reasons }));
      return [...mapped].sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
    }
    if (viewSavedOnly) {
      return savedScholarships.map((i) => i.scholarship ?? i);
    }
    return scholarships;
  })();

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const yearLabel = ["1st", "2nd", "3rd", "4th", "5th"][profile.year - 1] || `${profile.year}th`;

  return (
    <>
      <style>{styles}</style>
      <div className="sc-page">
        <Navbar />

        <div className="sc-body">
          <div className="sc-main">

            {/* Header */}
            <div className="sc-header">
              <h1>Scholarships & Bursaries</h1>
              <p>Matched to your program, faculty, and financial profile. Edit your profile from the menu.</p>
            </div>

            {/* Profile Bar */}
            <div className="sc-profile-bar">
              <div className="sc-profile-fields">
                {[
                  ["Faculty",  profile.faculty    || "—"],
                  ["Major",    profile.major      || "—"],
                  ["Year",     profile.faculty ? `${yearLabel} Year` : "—"],
                  ["Degree",   profile.degree_type],
                  ["Status",   profile.citizenship],
                  ["Campus",   profile.campus],
                ].map(([label, value]) => (
                  <div className="sc-profile-field" key={label}>
                    <div className="sc-profile-field-label">{label}</div>
                    <div className="sc-profile-field-value">{value}</div>
                  </div>
                ))}
              </div>
              <button className="sc-edit-btn" onClick={() => setShowModal(true)}>
                <EditIcon /> Edit Profile
              </button>
            </div>

            {/* Filter Bar */}
            <div className="sc-filter-bar">
              <div className="sc-search-wrap">
                <SearchIcon />
                <input
                  placeholder="Search scholarships..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <div className="sc-divider" />

              <select className="sc-select" value={filterAwardType} onChange={(e) => setFilterAwardType(e.target.value)}>
                <option value="">Award Type</option>
                <option value="admissions">Admissions</option>
                <option value="in_course">In-Course</option>
                <option value="graduating">Graduating</option>
              </select>

              <div className="sc-divider" />

              <select
                className="sc-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                disabled={onlyMatched}
                title={onlyMatched ? "Match view is always ordered by match strength" : ""}
              >
                <option value="title">Title A–Z</option>
                <option value="-title">Title Z–A</option>
                <option value="-amount">Amount ↓</option>
                <option value="amount">Amount ↑</option>
                <option value="deadline">Deadline ↑</option>
                <option value="-deadline">Deadline ↓</option>
              </select>

              <div className="sc-divider" />

              <select className="sc-select" value={filterCitizenship} onChange={(e) => setFilterCitizenship(e.target.value)}>
                <option value="">Citizenship</option>
                <option value="Domestic">Domestic</option>
                <option value="International">International</option>
              </select>

              <div className="sc-divider" />

              <div className="sc-toggle-wrap" onClick={() => setOnlyMatched((v) => !v)}>
                Match to my profile
                <div className={`sc-toggle ${onlyMatched ? "on" : ""}`} />
              </div>

              <div className="sc-divider" />

              <button
                type="button"
                className="sc-edit-btn"
                onClick={() => setViewSavedOnly((v) => !v)}
                style={{ marginLeft: 0 }}
              >
                <BookmarkIcon filled={viewSavedOnly} /> {viewSavedOnly ? "Show all" : "View saved"}
              </button>
            </div>

            {/* Results count */}
            {!loading && (
              <div className="sc-results-header">
                {viewSavedOnly
                  ? `${displayList.length} saved scholarship${displayList.length !== 1 ? "s" : ""} (edit status on My Scholarships)`
                  : onlyMatched
                    ? `${displayList.length} scholarships matched to your profile (strongest first)`
                    : `${total} scholarships found`}
              </div>
            )}

            {/* Cards */}
            {loading ? (
              <div className="sc-loading"><div className="sc-spinner" /></div>
            ) : displayList.length === 0 ? (
              <div className="sc-empty">
                <div className="sc-empty-icon">🎓</div>
                <h3>{viewSavedOnly ? "No saved scholarships" : "No scholarships found"}</h3>
                <p>{viewSavedOnly ? "Use the bookmark on any scholarship to save it." : "Try adjusting your filters or editing your profile."}</p>
              </div>
            ) : (
              displayList.map((s) => (
                <ScholarshipCard
                  key={s.id}
                  s={s}
                  score={s._score}
                  reasons={s._reasons}
                  isSaved={savedIds.has(s.id)}
                  onSave={handleSave}
                  onUnsave={handleUnsave}
                />
              ))
            )}

            {/* Pagination */}
            {!onlyMatched && !viewSavedOnly && totalPages > 1 && !loading && (
              <div className="sc-pagination">
                <button className="sc-page-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={`sc-page-btn ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                {totalPages > 7 && <span style={{ color: "var(--text-muted)" }}>…</span>}
                <button className="sc-page-btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</button>
              </div>
            )}
          </div>

          <div className="sc-sidebar-spacer" aria-hidden="true" />
        </div>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <div className="sc-sidebar">
            <UpcomingDeadlines items={savedScholarships} maxItems={6} />
          </div>,
          document.body
        )}

      {showModal && (
        <ProfileModal
          profile={profile}
          onSave={handleSaveProfile}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}