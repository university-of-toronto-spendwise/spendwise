import { useState, useEffect } from "react";
import Navbar from "./Navbar";

const DEFAULT_PROFILE = {
  faculty: "",
  major: "",
  year: 1,
  degree_type: "Undergrad",
  citizenship: "Domestic",
  campus: "St.George",
};

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem("userProfile")) || DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600&display=swap');
  :root {
    --uoft-blue: #002A5C;
    --uoft-mid: #0047A0;
    --off-white: #F4F7FB;
    --text-muted: #6B7A90;
    --border: #D0DBE8;
    --white: #FFFFFF;
  }
  .profile-page { min-height: 100vh; background: var(--off-white); font-family: inherit; }
  .profile-body { max-width: 640px; margin: 0 auto; padding: 2rem 2rem; }
  .profile-header { margin-bottom: 1.5rem; }
  .profile-header h1 { font-size: 1.9rem; font-weight: 700; color: var(--uoft-blue); margin: 0 0 0.25rem 0; }
  .profile-header p { color: var(--text-muted); font-size: 0.95rem; margin: 0; }
  .profile-card {
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: 14px;
    padding: 1.5rem 1.75rem;
  }
  .profile-card h2 { font-size: 1.1rem; font-weight: 700; color: var(--uoft-blue); margin: 0 0 1rem 0; }
  .profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .profile-field label {
    display: block;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--uoft-blue);
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-bottom: 0.4rem;
  }
  .profile-field input, .profile-field select {
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
  }
  .profile-field input:focus, .profile-field select:focus {
    border-color: var(--uoft-mid);
    box-shadow: 0 0 0 3px rgba(0,71,160,0.1);
  }
  .profile-actions { margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: flex-end; }
  .profile-btn-cancel {
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    border: 1.5px solid var(--border);
    background: white;
    color: var(--text-muted);
    font-family: inherit;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
  }
  .profile-btn-cancel:hover { border-color: var(--uoft-blue); color: var(--uoft-blue); }
  .profile-btn-save {
    padding: 0.6rem 1.4rem;
    border-radius: 8px;
    border: none;
    background: var(--uoft-blue);
    color: white;
    font-family: inherit;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
  }
  .profile-btn-save:hover { background: var(--uoft-mid); }
  .profile-saved { font-size: 0.88rem; color: #18A574; font-weight: 600; margin-top: 0.5rem; }
`;

export default function Profile() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  const handleSave = () => {
    localStorage.setItem("userProfile", JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="profile-page">
        <Navbar />
        <div className="profile-body">
          <div className="profile-header">
            <h1>Profile</h1>
            <p>Update your academic profile so we can match you with relevant scholarships.</p>
          </div>
          <div className="profile-card">
            <h2>Edit your profile</h2>
            <div className="profile-grid">
              <div className="profile-field">
                <label>Faculty</label>
                <input
                  value={profile.faculty}
                  onChange={(e) => setProfile((p) => ({ ...p, faculty: e.target.value }))}
                  placeholder="e.g. Engineering"
                />
              </div>
              <div className="profile-field">
                <label>Major</label>
                <input
                  value={profile.major}
                  onChange={(e) => setProfile((p) => ({ ...p, major: e.target.value }))}
                  placeholder="e.g. Computer Science"
                />
              </div>
              <div className="profile-field">
                <label>Year</label>
                <select
                  value={profile.year}
                  onChange={(e) => setProfile((p) => ({ ...p, year: Number(e.target.value) }))}
                >
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="profile-field">
                <label>Degree</label>
                <select
                  value={profile.degree_type}
                  onChange={(e) => setProfile((p) => ({ ...p, degree_type: e.target.value }))}
                >
                  <option>Undergrad</option>
                  <option>Postgrad</option>
                </select>
              </div>
              <div className="profile-field">
                <label>Status</label>
                <select
                  value={profile.citizenship}
                  onChange={(e) => setProfile((p) => ({ ...p, citizenship: e.target.value }))}
                >
                  <option>Domestic</option>
                  <option>International</option>
                </select>
              </div>
              <div className="profile-field">
                <label>Campus</label>
                <select
                  value={profile.campus}
                  onChange={(e) => setProfile((p) => ({ ...p, campus: e.target.value }))}
                >
                  <option>St.George</option>
                  <option>Scarborough</option>
                  <option>Mississauga</option>
                </select>
              </div>
            </div>
            <div className="profile-actions">
              {saved && <span className="profile-saved">Profile saved.</span>}
              <button type="button" className="profile-btn-save" onClick={handleSave}>
                Save Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
