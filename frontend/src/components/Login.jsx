import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, fetchProfile, setOnboardingComplete, setTokens } from "../utils/session";


const MailIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const LockIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const EyeOpenIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeClosedIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim()) { setError("Please enter your email address."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) { setError("Please enter a valid email address."); return; }
    if (!formData.password) { setError("Please enter your password."); return; }

    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.email,
          password: formData.password
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const access = data.access || data.token || data.key;
        const refresh = data.refresh;
        setTokens({ access, refresh });
        const profile = await fetchProfile(access);
        setOnboardingComplete(Boolean(profile.onboarding_completed));
        setSuccess(true);

        setTimeout(() => { navigate(profile.onboarding_completed ? "/home" : "/onboarding"); }, 900);

      } else {
        setError(data?.detail || data?.message || "Invalid email or password.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="login-page">
        <div className="login-card">

          {/* Logo lockup */}
          <div style={{marginBottom:'1.4rem'}}>
            <div style={{display:'inline-flex', alignItems:'center', gap:'0.7rem'}}>
              <div style={{
                background:'#002A5C', borderRadius:'12px',
                padding:'0.55rem 1.2rem 0.55rem 1rem',
                display:'flex', alignItems:'center', gap:'0.65rem',
                boxShadow:'4px 4px 0px #E8B53E',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <span style={{ fontFamily:"'Playfair Display', serif", fontSize:'1.65rem', fontWeight:700, color:'white', letterSpacing:'-0.01em', lineHeight:1 }}>
                  SpendWise
                </span>
              </div>
              <span style={{
                background:'#E8B53E', color:'#002A5C',
                fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.1em',
                textTransform:'uppercase', padding:'3px 9px', borderRadius:'20px',
                alignSelf:'flex-start', marginTop:'10px',
              }}>UofT</span>
            </div>
          </div>

          <p className="card-subtitle">Welcome back! Sign in to your account.</p>

          {success && (
            <div className="success-banner"><CheckIcon /> Signed in! Redirecting...</div>
          )}
          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrap">
                <span className="input-icon"><MailIcon /></span>
                <input id="email" type="text" name="email" value={formData.email}
                  onChange={handleChange} placeholder="your@email.com" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <span className="input-icon"><LockIcon /></span>
                <input id="password" type={showPass ? "text" : "password"} name="password"
                  value={formData.password} onChange={handleChange} placeholder="Your password" />
                <button type="button" className="eye-btn"
                  onMouseDown={(e) => { e.preventDefault(); setShowPass(v => !v); }}>
                  {showPass ? <EyeClosedIcon /> : <EyeOpenIcon />}
                </button>
              </div>
              <a href="/forgot-password" className="forgot-link">Forgot password?</a>
            </div>

            <button type="submit" className="submit-btn" disabled={loading || success}>
              {loading ? <div className="spinner" /> : success ? <><CheckIcon /> Signed in!</> : "Sign In"}
            </button>
          </form>

          <p className="signup-prompt">
            Don't have an account? <a href="/">Sign up</a>
          </p>
        </div>
      </div>
    </>
  );
}
