import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

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
  const doFetch = (t) => fetch(url, { headers: { Authorization: `Bearer ${t}` } });
  let res = await doFetch(token);
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await doFetch(newToken);
  }
  return res;
};

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem("userProfile")) || {};
  } catch {
    return {};
  }
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+3:wght@300;400;500;600&display=swap');

  .sw-nav {
    height: 64px;
    background: white;
    border-bottom: 1.5px solid #D0DBE8;
    display: flex;
    align-items: center;
    justify-content: center;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .sw-nav-inner {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    align-items: center;
    gap: 2rem;
    height: 100%;
  }

  .sw-nav-logo {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    text-decoration: none;
    flex-shrink: 0;
  }

  .sw-nav-logo-box {
    background: #002A5C;
    border-radius: 10px;
    padding: 0.4rem 0.9rem 0.4rem 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 3px 3px 0px #E8B53E;
  }

  .sw-nav-logo-text {
    font-family: 'Playfair Display', serif;
    font-size: 1.2rem;
    font-weight: 700;
    color: white;
    line-height: 1;
  }

  .sw-nav-badge {
    background: #E8B53E;
    color: #002A5C;
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 20px;
    align-self: flex-start;
    margin-top: 8px;
  }

  .sw-nav-tabs {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex: 1;
    justify-content: center;
  }

  .sw-nav-tab {
    padding: 0.45rem 1.1rem;
    border-radius: 8px;
    font-family: inherit;
    font-size: 0.92rem;
    font-weight: 500;
    color: #6B7A90;
    cursor: pointer;
    border: none;
    background: none;
    transition: color 0.15s, background 0.15s;
    text-decoration: none;
    display: flex;
    align-items: center;
  }

  .sw-nav-tab:hover {
    color: #002A5C;
    background: #F4F7FB;
  }

  .sw-nav-tab.active {
    color: #002A5C;
    background: #EEF3FB;
    font-weight: 600;
    border: 1.5px solid #D0DBE8;
  }

  .sw-nav-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .sw-nav-icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1.5px solid #D0DBE8;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #6B7A90;
    transition: color 0.15s, border-color 0.15s;
  }

  .sw-nav-icon-btn:hover {
    color: #002A5C;
    border-color: #002A5C;
  }

  .sw-nav-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 260px;
    background: white;
    border: 1.5px solid #D0DBE8;
    border-radius: 14px;
    box-shadow: 0 10px 40px rgba(0,42,92,0.12);
    padding: 0.75rem 0;
    z-index: 200;
  }
  .sw-nav-dropdown-section {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid #EEF2F8;
  }
  .sw-nav-dropdown-section:last-child { border-bottom: none; }
  .sw-nav-dropdown-name { font-weight: 700; color: #002A5C; font-size: 1rem; margin-bottom: 0.2rem; }
  .sw-nav-dropdown-meta { font-size: 0.82rem; color: #6B7A90; }
  .sw-nav-dropdown-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    text-align: left;
    padding: 0.6rem 1rem;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    color: #002A5C;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.15s;
  }
  .sw-nav-dropdown-btn:hover { background: #F4F7FB; }
  .sw-nav-dropdown-btn.logout { color: #C0392B; }
  .sw-nav-dropdown-btn.logout:hover { background: #FEF0EE; }
  .sw-nav-profile-wrap { position: relative; }

  .sw-nav-settings-wrap { position: relative; }
  .sw-nav-dropdown .sw-theme-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: inherit;
  }
  .sw-theme-toggle {
    width: 44px;
    height: 24px;
    border-radius: 12px;
    background: #D0DBE8;
    position: relative;
    cursor: pointer;
    transition: background 0.2s;
  }
  .sw-theme-toggle.dark { background: #0047A0; }
  .sw-theme-toggle::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    top: 2px;
    left: 2px;
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  .sw-theme-toggle.dark::after { left: 22px; }

  .sw-bug-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .sw-bug-modal {
    background: white;
    border-radius: 14px;
    padding: 1.5rem;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }
  [data-theme="dark"] .sw-bug-modal {
    background: #1e293b;
    border: 1px solid #334155;
  }
  .sw-bug-modal h3 { margin: 0 0 1rem 0; font-size: 1.1rem; color: #002A5C; }
  [data-theme="dark"] .sw-bug-modal h3 { color: #f1f5f9; }
  .sw-bug-modal label { display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.35rem; color: #6B7A90; }
  [data-theme="dark"] .sw-bug-modal label { color: #94a3b8; }
  .sw-bug-modal input, .sw-bug-modal textarea {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1.5px solid #D0DBE8;
    border-radius: 8px;
    font-size: 0.9rem;
    margin-bottom: 1rem;
    font-family: inherit;
  }
  [data-theme="dark"] .sw-bug-modal input,
  [data-theme="dark"] .sw-bug-modal textarea {
    background: #334155;
    border-color: #475569;
    color: #e2e8f0;
  }
  .sw-bug-modal textarea { min-height: 80px; resize: vertical; }
  .sw-bug-modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
  .sw-bug-modal-actions button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.88rem;
    cursor: pointer;
    border: none;
  }
  .sw-bug-modal-actions .cancel { background: #E8EDF5; color: #002A5C; }
  .sw-bug-modal-actions .submit { background: #002A5C; color: white; }
  [data-theme="dark"] .sw-bug-modal-actions .cancel { background: #334155; color: #e2e8f0; }
`;

const DollarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

const PersonIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const EditProfileIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const ScholarshipsIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <path d="M8 7h8M8 11h8"/>
  </svg>
);

const BugIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const TABS = [
  { label: "Dashboard", path: "/home" },
  { label: "Scholarships", path: "/scholarships" },
  { label: "Transactions", path: "/transactions" },
  { label: "Bills", path: "/bills" },
  { label: "Student Codes", path: "/student-codes" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [bugEmail, setBugEmail] = useState("");
  const [bugDesc, setBugDesc] = useState("");
  const [user, setUser] = useState({ first_name: "", last_name: "", email: "" });
  const profile = loadProfile();
  const dropdownRef = useRef(null);
  const settingsRef = useRef(null);

  useEffect(() => {
    if (!getAccessToken()) return;
    fetchWithAuth(`${API}/me/`).then((res) => {
      if (res.ok) res.json().then((data) => setUser(data));
    });
  }, []);

  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Profile";
  const majorYear = [profile.major, profile.year && `Year ${profile.year}`].filter(Boolean).join(" · ") || null;

  const handleLogout = () => {
    sessionStorage.removeItem("userToken");
    sessionStorage.removeItem("userAccessToken");
    sessionStorage.removeItem("userRefreshToken");
    setDropdownOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <>
      <style>{styles}</style>
      <nav className="sw-nav">
        <div className="sw-nav-inner">
          <div className="sw-nav-logo" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>
            <div className="sw-nav-logo-box">
              <DollarIcon />
              <span className="sw-nav-logo-text">SpendWise</span>
            </div>
            <span className="sw-nav-badge">UofT</span>
          </div>

          <div className="sw-nav-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.path}
                className={`sw-nav-tab ${location.pathname === tab.path ? "active" : ""}`}
                onClick={() => navigate(tab.path)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="sw-nav-right">
            <div className="sw-nav-profile-wrap" ref={dropdownRef}>
              <button
                type="button"
                className="sw-nav-icon-btn"
                title="Profile"
                aria-label="Profile"
                aria-expanded={dropdownOpen}
                onClick={() => setDropdownOpen((v) => !v)}
              >
                <PersonIcon />
              </button>
              {dropdownOpen && (
                <div className="sw-nav-dropdown">
                  <div className="sw-nav-dropdown-section">
                    <div className="sw-nav-dropdown-name">{fullName}</div>
                    {majorYear && <div className="sw-nav-dropdown-meta">{majorYear}</div>}
                  </div>
                  <div className="sw-nav-dropdown-section">
                    <button
                      type="button"
                      className="sw-nav-dropdown-btn"
                      onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                    >
                      <EditProfileIcon />
                      Edit Profile
                    </button>
                    <button
                      type="button"
                      className="sw-nav-dropdown-btn"
                      onClick={() => { setDropdownOpen(false); navigate("/my-scholarships"); }}
                    >
                      <ScholarshipsIcon />
                      My Scholarships
                    </button>
                  </div>
                  <div className="sw-nav-dropdown-section">
                    <button type="button" className="sw-nav-dropdown-btn logout" onClick={handleLogout}>
                      <LogoutIcon />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="sw-nav-settings-wrap" ref={settingsRef}>
              <button
                type="button"
                className="sw-nav-icon-btn"
                title="Settings"
                aria-label="Settings"
                aria-expanded={settingsOpen}
                onClick={() => setSettingsOpen((v) => !v)}
              >
                <SettingsIcon />
              </button>
              {settingsOpen && (
                <div className="sw-nav-dropdown">
                  <div className="sw-nav-dropdown-section">
                    <div className="sw-nav-dropdown-name">Appearance</div>
                    <div className="sw-theme-row">
                      <span className="sw-nav-dropdown-meta">{theme === "dark" ? "Dark mode" : "Light mode"}</span>
                      <button
                        type="button"
                        className={`sw-theme-toggle ${theme === "dark" ? "dark" : ""}`}
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                      />
                    </div>
                  </div>
                  <div className="sw-nav-dropdown-section">
                    <button
                      type="button"
                      className="sw-nav-dropdown-btn"
                      onClick={() => {
                        setSettingsOpen(false);
                        setBugModalOpen(true);
                      }}
                    >
                      <BugIcon />
                      Report a bug
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {bugModalOpen && (
        <div className="sw-bug-modal-overlay" onClick={() => setBugModalOpen(false)}>
          <div className="sw-bug-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Report a bug</h3>
            <label htmlFor="bug-email">Your email</label>
            <input
              id="bug-email"
              type="email"
              placeholder="you@example.com"
              value={bugEmail}
              onChange={(e) => setBugEmail(e.target.value)}
            />
            <label htmlFor="bug-desc">What went wrong?</label>
            <textarea
              id="bug-desc"
              placeholder="Describe the issue..."
              value={bugDesc}
              onChange={(e) => setBugDesc(e.target.value)}
            />
            <div className="sw-bug-modal-actions">
              <button type="button" className="cancel" onClick={() => setBugModalOpen(false)}>
                <CloseIcon />
                Cancel
              </button>
              <button
                type="button"
                className="submit"
                onClick={() => {
                  const subject = encodeURIComponent("SpendWise Bug Report");
                  const body = encodeURIComponent(
                    `Email: ${bugEmail}\n\nDescription:\n${bugDesc}`
                  );
                  window.location.href = `mailto:support@spendwise.app?subject=${subject}&body=${body}`;
                  setBugModalOpen(false);
                  setBugEmail("");
                  setBugDesc("");
                }}
              >
                <SendIcon />
                Send report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
