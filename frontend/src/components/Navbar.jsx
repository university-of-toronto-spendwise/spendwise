import { useNavigate, useLocation } from "react-router-dom";

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

          {/* Profile & Settings - inside same navbar box */}
          <div className="sw-nav-right">
            <button type="button" className="sw-nav-icon-btn" title="Profile" aria-label="Profile">
              <PersonIcon />
            </button>
            <button type="button" className="sw-nav-icon-btn" title="Settings" aria-label="Settings">
              <SettingsIcon />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}