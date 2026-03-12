import { useState, useEffect } from "react";
import { saveProfile } from "../utils/session";

const PROFILE_KEY = "userProfile";
const DEFAULT_PROFILE = {
  faculty: "",
  major: "",
  year: 1,
  degree_type: "Undergrad",
  citizenship: "Domestic",
  campus: "St.George",
};

function loadScholarshipProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

const styles = `
  .ep-form {
    background: white;
    border: 1.5px solid #D0DBE8;
    border-radius: 14px;
    padding: 2rem;
    max-width: 560px;
  }

  .ep-form h2 {
    font-size: 1.2rem;
    font-weight: 700;
    color: #002A5C;
    margin-bottom: 1.5rem;
  }

  .ep-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .ep-field label {
    display: block;
    font-size: 0.72rem;
    font-weight: 600;
    color: #002A5C;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-bottom: 0.4rem;
  }

  .ep-field input,
  .ep-field select {
    width: 100%;
    height: 42px;
    border: 1.5px solid #D0DBE8;
    border-radius: 8px;
    padding: 0 0.75rem;
    font-family: inherit;
    font-size: 0.88rem;
    color: #002A5C;
    outline: none;
    background: white;
    transition: border-color 0.15s;
  }

  .ep-field input:focus,
  .ep-field select:focus {
    border-color: #0047A0;
    box-shadow: 0 0 0 3px rgba(0,71,160,0.1);
  }

  .ep-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .ep-save {
    padding: 0.6rem 1.4rem;
    border-radius: 8px;
    border: none;
    background: #002A5C;
    color: white;
    font-family: inherit;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .ep-save:hover {
    background: #0047A0;
  }

  .ep-save:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export function loadProfileForEdit() {
  return loadScholarshipProfile();
}

export default function EditProfile({ profile: initialProfile, apiProfile, onSave }) {
  const schol = initialProfile || loadScholarshipProfile();
  const [form, setForm] = useState({
    ...schol,
    first_name: apiProfile?.first_name ?? "",
    last_name: apiProfile?.last_name ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (apiProfile) {
      setForm((f) => ({
        ...f,
        first_name: apiProfile.first_name ?? "",
        last_name: apiProfile.last_name ?? "",
      }));
    }
  }, [apiProfile]);

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const scholProfile = {
        faculty: form.faculty,
        major: form.major,
        year: form.year,
        degree_type: form.degree_type,
        citizenship: form.citizenship,
        campus: form.campus,
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(scholProfile));

      if (apiProfile) {
        await saveProfile({
          ...apiProfile,
          first_name: form.first_name || "",
          last_name: form.last_name || "",
          citizenship_status: form.citizenship,
          campus: form.campus,
          degree_type: form.degree_type,
        });
      }
      onSave?.({ ...form, ...scholProfile });
    } catch (err) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="ep-form">
        <h2>✏️ Edit Your Profile</h2>
        {error && <p style={{ color: "#C0392B", marginBottom: "1rem", fontSize: "0.9rem" }}>{error}</p>}
        <div className="ep-grid">
          <div className="ep-field">
            <label>First Name</label>
            <input
              value={form.first_name || ""}
              onChange={(e) => set("first_name", e.target.value)}
              placeholder="e.g. Jane"
            />
          </div>
          <div className="ep-field">
            <label>Last Name</label>
            <input
              value={form.last_name || ""}
              onChange={(e) => set("last_name", e.target.value)}
              placeholder="e.g. Doe"
            />
          </div>
          <div className="ep-field">
            <label>Faculty</label>
            <input
              value={form.faculty}
              onChange={(e) => set("faculty", e.target.value)}
              placeholder="e.g. Engineering"
            />
          </div>
          <div className="ep-field">
            <label>Major</label>
            <input
              value={form.major}
              onChange={(e) => set("major", e.target.value)}
              placeholder="e.g. Computer Science"
            />
          </div>
          <div className="ep-field">
            <label>Year</label>
            <select value={form.year} onChange={(e) => set("year", Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="ep-field">
            <label>Degree</label>
            <select value={form.degree_type} onChange={(e) => set("degree_type", e.target.value)}>
              <option>Undergrad</option>
              <option>Postgrad</option>
            </select>
          </div>
          <div className="ep-field">
            <label>Status</label>
            <select value={form.citizenship} onChange={(e) => set("citizenship", e.target.value)}>
              <option>Domestic</option>
              <option>International</option>
            </select>
          </div>
          <div className="ep-field">
            <label>Campus</label>
            <select value={form.campus} onChange={(e) => set("campus", e.target.value)}>
              <option>St.George</option>
              <option>Scarborough</option>
              <option>Mississauga</option>
            </select>
          </div>
        </div>
        <div className="ep-actions">
          <button className="ep-save" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </>
  );
}
