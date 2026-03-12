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
      <div className="ep-form">
        <h2>✏️ Edit Your Profile</h2>
        {error && <p style={{ color: "var(--sw-error)", marginBottom: "1rem", fontSize: "0.95rem" }}>{error}</p>}
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
