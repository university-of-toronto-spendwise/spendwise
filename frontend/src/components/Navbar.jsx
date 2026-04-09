import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchProfile, clearSession, getToken } from "../utils/session";
import { useTheme } from "../context/ThemeContext";
import ReportBugModal from "./ReportBugModal";

const PROFILE_KEY = "userProfile";
const DEFAULT_PROFILE = { faculty: "", major: "", year: 1 };

function loadScholarshipProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

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

const EditIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const BookmarkIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const BugIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 22v-4M12 18a2 2 0 0 1-2-2V8a2 2 0 0 1 4 0v8a2 2 0 0 1-2 2z"/>
    <path d="M8 12h.01M12 12h.01M16 12h.01"/>
    <path d="M9 6a3 3 0 0 1 6 0"/>
  </svg>
);

const TABS = [
  { label: "Dashboard",        path: "/home" },
  { label: "Scholarships",     path: "/scholarships" },
  { label: "Transactions",     path: "/transactions" },
  { label: "Student Codes",    path: "/student-codes" },
  { label: "Goal Planner",     path: "/investing" },
  { label: "Portfolio Builder", path: "/investing/builder" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reportBugOpen, setReportBugOpen] = useState(false);
  const [apiProfile, setApiProfile] = useState(null);
  const dropdownRef = useRef(null);
  const settingsRef = useRef(null);

  const scholarshipProfile = loadScholarshipProfile();
  const yearLabel = ["1st", "2nd", "3rd", "4th", "5th"][scholarshipProfile.year - 1] || `${scholarshipProfile.year}th`;
  const fullName = apiProfile
    ? [apiProfile.first_name, apiProfile.last_name].filter(Boolean).join(" ") || apiProfile.email
    : "Loading...";

  useEffect(() => {
    if (!getToken()) return;
    fetchProfile()
      .then((p) => setApiProfile(p))
      .catch(() => setApiProfile({ first_name: "", last_name: "", email: "" }));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    };
    if (dropdownOpen || settingsOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [dropdownOpen, settingsOpen]);

  const handleLogout = () => {
    clearSession();
    localStorage.removeItem(PROFILE_KEY);
    setDropdownOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <>
      <nav className="sw-nav">
        <div className="sw-nav-inner">
          {/* Logo - DO NOT CHANGE */}
          <div className="sw-nav-logo" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>
            <div className="sw-nav-logo-box">
              <DollarIcon />
              <span className="sw-nav-logo-text">SpendWise</span>
            </div>
            <span className="sw-nav-badge">UofT</span>
          </div>

          {/* Tabs */}
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

          {/* Profile & Settings */}
          <div className="sw-nav-right">
            <div className="sw-nav-profile-wrap" ref={dropdownRef}>
              <button
                type="button"
                className="sw-nav-icon-btn"
                title="Profile"
                aria-label="Profile"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                onClick={() => setDropdownOpen((o) => !o)}
              >
                <PersonIcon />
              </button>
              {dropdownOpen && (
                <div className="sw-nav-dropdown" role="menu">
                  <div className="sw-nav-dropdown-header">
                    <div className="sw-nav-dropdown-name">{fullName}</div>
                    <div className="sw-nav-dropdown-meta">
                      {[scholarshipProfile.major, `${yearLabel} Year`].filter(Boolean).join(" • ") || "—"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="sw-nav-dropdown-item"
                    role="menuitem"
                    onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                  >
                    <EditIcon /> Edit Profile
                  </button>
                  <button
                    type="button"
                    className="sw-nav-dropdown-item"
                    role="menuitem"
                    onClick={() => { setDropdownOpen(false); navigate("/my-scholarships"); }}
                  >
                    <BookmarkIcon /> My Scholarships
                  </button>
                  <button
                    type="button"
                    className="sw-nav-dropdown-item logout"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <LogoutIcon /> Logout
                  </button>
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
                onClick={() => setSettingsOpen((o) => !o)}
              >
                <SettingsIcon />
              </button>
              {settingsOpen && (
                <div className="sw-nav-dropdown" role="menu">
                  <div className="sw-nav-toggle-row">
                    <span>Dark mode</span>
                    <button
                      type="button"
                      className={`sw-nav-toggle ${theme === "dark" ? "on" : ""}`}
                      onClick={toggleTheme}
                      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    />
                  </div>
                  <button
                    type="button"
                    className="sw-nav-dropdown-item"
                    role="menuitem"
                    onClick={() => { setSettingsOpen(false); setReportBugOpen(true); }}
                  >
                    <BugIcon /> Report a bug
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      {reportBugOpen && <ReportBugModal onClose={() => setReportBugOpen(false)} />}
    </>
  );
}
