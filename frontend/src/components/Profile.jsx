import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import EditProfile, { loadProfileForEdit } from "./EditProfile";
import { fetchProfile } from "../utils/session";

export default function Profile() {
  const [profile, setProfile] = useState(loadProfileForEdit);
  const [apiProfile, setApiProfile] = useState(null);

  useEffect(() => {
    fetchProfile()
      .then(setApiProfile)
      .catch(() => setApiProfile({}));
  }, []);

  const handleSave = (newProfile) => {
    setProfile(newProfile);
    if (apiProfile) {
      setApiProfile((p) => ({
        ...p,
        first_name: newProfile.first_name,
        last_name: newProfile.last_name,
        faculty: newProfile.faculty,
        major: newProfile.major,
        year: newProfile.year,
        citizenship_status: newProfile.citizenship,
        campus: newProfile.campus,
        degree_type: newProfile.degree_type,
      }));
    }
  };

  return (
    <>
      <Navbar />
      <div style={{ padding: "2rem", maxWidth: 800, margin: "0 auto", background: "var(--sw-bg)", minHeight: "100vh" }}>
        <h1 className="sw-font-1" style={{ marginBottom: "0.5rem" }}>Profile</h1>
        <p className="sw-font-2" style={{ marginBottom: "1.5rem" }}>Manage your profile and account settings. Your faculty, major, and year are used for scholarship matching.</p>
        <EditProfile profile={profile} apiProfile={apiProfile} onSave={handleSave} />
      </div>
    </>
  );
}
