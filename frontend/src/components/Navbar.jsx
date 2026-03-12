import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchProfile, clearSession, getToken } from "../utils/session";

const PROFILE_KEY = "userProfile";
const DEFAULT_PROFILE = { faculty: "", major: "", year: 1 };

function loadScholarshipProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
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
    font-family: 'Source Sans 3', sans-serif;
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

  .sw-nav-profile-wrap {
    position: relative;
  }

  .sw-nav-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 260px;
    background: white;
    border: 1.5px solid #D0DBE8;
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(0,42,92,0.12);
    padding: 0.5rem 0;
    z-index: 200;
  }

  .sw-nav-dropdown-header {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #E8EDF5;
  }

  .sw-nav-dropdown-name {
    font-size: 0.95rem;
    font-weight: 700;
    color: #002A5C;
    margin-bottom: 0.25rem;
  }

  .sw-nav-dropdown-meta {
    font-size: 0.8rem;
    color: #6B7A90;
  }

  .sw-nav-dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.65rem 1.25rem;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    color: #002A5C;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;
  }

  .sw-nav-dropdown-item:hover {
    background: #F4F7FB;
  }

  .sw-nav-dropdown-item.logout {
    color: #C0392B;
    border-top: 1px solid #E8EDF5;
    margin-top: 0.25rem;
    padding-top: 0.85rem;
  }

  .sw-nav-dropdown-item.logout:hover {
    background: #FEF0EE;
  }
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

const TABS = [
  { label: "Dashboard", path: "/home" },
  { label: "Scholarships", path: "/scholarships" },
  { label: "Transactions", path: "/transactions" },
  { label: "Student Codes", path: "/student-codes" },
  { label: "Investments", path: "/investing" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [apiProfile, setApiProfile] = useState(null);
  const dropdownRef = useRef(null);

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
    };
    if (dropdownOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [dropdownOpen]);

  const handleLogout = () => {
    clearSession();
    localStorage.removeItem(PROFILE_KEY);
    setDropdownOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <>
      <style>{styles}</style>
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
            <button type="button" className="sw-nav-icon-btn" title="Settings" aria-label="Settings" onClick={() => navigate("/settings")}>
              <SettingsIcon />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}