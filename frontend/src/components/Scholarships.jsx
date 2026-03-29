import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import UpcomingDeadlines from "./UpcomingDeadlines";

const API = "/api";
const API_REL = "/api";

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
        <div style={{ fontSize: "0.9rem", color: "var(--sw-text-muted)", marginBottom: "0.5rem" }}>
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
            <span style={{ fontSize: "0.72rem", color: "var(--sw-text-muted)" }}>{reasons[0]}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──
export default function Scholarships() {
  const navigate = useNavigate();
  const [profile, setProfile]           = useState(loadProfile);
  const [scholarships, setScholarships]  = useState([]);
  const [savedScholarships, setSavedScholarships] = useState([]);
  const [matchResults, setMatchResults]  = useState(null);
  const [loading, setLoading]            = useState(false);
  const [total, setTotal]                = useState(0);
  const [page, setPage]                  = useState(1);
  const [onlyMatched, setOnlyMatched]    = useState(false);
  const [viewSavedOnly, setViewSavedOnly] = useState(false);
  const [savedIds, setSavedIds]          = useState(new Set());
  const [toast, setToast]                = useState(null);
  const toastTimerRef = useRef(null);

  // filters
  const [q, setQ]                               = useState("");
  const [sortBy, setSortBy]                     = useState("title");
  const [filterCitizenship, setFilterCitizenship] = useState("");
  const [filterAwardType, setFilterAwardType]   = useState("");

  const PAGE_SIZE = 20;

  const showToast = useCallback((message, tone = "success") => {
    setToast({ message, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

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
      if (res.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (res.ok) {
        await fetchSavedScholarships();
        showToast("Your data is saved.", "success");
      }
    } catch { /* ignore */ }
  };

  const handleUnsave = async (id) => {
    if (!getAccessToken()) return;
    try {
      const res = await fetchWithAuth(`${API_REL}/scholarships/${id}/save/`, { method: "DELETE" });
      if (res.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (res.ok) {
        await fetchSavedScholarships();
        showToast("Removed from saved scholarships.", "success");
      }
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

  const savedStatusMap = Object.fromEntries(
    savedScholarships
      .filter((i) => i.scholarship?.id)
      .map((i) => [i.scholarship.id, i.status])
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const yearLabel = ["1st", "2nd", "3rd", "4th", "5th"][profile.year - 1] || `${profile.year}th`;

  return (
    <>
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
              <button className="sc-edit-btn" onClick={() => navigate("/profile")}>
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
                  status={savedStatusMap[s.id]}
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
                {totalPages > 7 && <span style={{ color: "var(--sw-text-muted)" }}>…</span>}
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
            <UpcomingDeadlines items={savedScholarships} maxItems={5} />
          </div>,
          document.body
        )}

      {toast &&
        typeof document !== "undefined" &&
        createPortal(
          <div className={`sw-toast ${toast.tone || ""}`} role="status" aria-live="polite">
            <div className="sw-toast-msg">{toast.message}</div>
            <button className="sw-toast-close" onClick={() => setToast(null)} aria-label="Close">
              ×
            </button>
          </div>,
          document.body
        )}

    </>
  );
}
