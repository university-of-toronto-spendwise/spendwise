import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../utils/session";


const UserIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
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

export default function UofTSignup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ first_name: "", last_name: "", email: "", password: "", password2: "" });
  const [showPass, setShowPass]   = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name.trim()) { setError("Please enter your first name."); return; }
    if (!formData.last_name.trim()) { setError("Please enter your last name."); return; }
    if (!formData.email.trim()) { setError("Please enter your email address."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) { setError("Please enter a valid email address."); return; }
    if (!/utoronto\.ca$/i.test(formData.email.trim())) { setError("Please use your UofT email address."); return; }
    if (!formData.password) { setError("Please enter a password."); return; }
    if (!formData.password2) { setError("Please confirm your password."); return; }
    if (formData.password !== formData.password2) { setError("Passwords do not match."); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { navigate("/login"); }, 900);
      } else {
        // Parse Django serializer errors e.g. {"email": ["This field must be unique."]}
        if (typeof data === 'object') {
          if (data.email) setError("An account with this email already exists.");
          else if (data.password) setError(Array.isArray(data.password) ? data.password.join(' ') : data.password);
          else if (data.non_field_errors) setError(Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : data.non_field_errors);
          else {
            const firstKey = Object.keys(data)[0];
            const msg = data[firstKey];
            setError(Array.isArray(msg) ? msg.join(' ') : msg);
          }
        } else {
          setError("Registration failed. Please try again.");
        }
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="uoft-page">
        {/* ── RIGHT PANEL ── */}
        <div className="uoft-right">
          <div className="signup-card">

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

            <p className="card-subtitle">
              The money-saving platform built exclusively for UofT students. Track spending, discover student deals, and make every dollar go further.
            </p>

{success && (
              <div className="success-banner"><CheckIcon /> Account created! Welcome to SpendWise.</div>
            )}
            {error && <div className="error-banner">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="first_name">First Name</label>
                  <div className="input-wrap">
                    <span className="input-icon"><UserIcon /></span>
                    <input id="first_name" type="text" name="first_name" value={formData.first_name}
                      onChange={handleChange} placeholder="Jane" />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="last_name">Last Name</label>
                  <div className="input-wrap">
                    <span className="input-icon"><UserIcon /></span>
                    <input id="last_name" type="text" name="last_name" value={formData.last_name}
                      onChange={handleChange} placeholder="Doe" />
                  </div>
                </div>
              </div>

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
                    value={formData.password} onChange={handleChange} placeholder="Min. 8 characters" />
                  <button type="button" className="eye-btn"
                    onMouseDown={(e) => { e.preventDefault(); setShowPass(v => !v); }}>
                    {showPass ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password2">Confirm Password</label>
                <div className="input-wrap">
                  <span className="input-icon"><LockIcon /></span>
                  <input id="password2" type={showPass2 ? "text" : "password"} name="password2"
                    value={formData.password2} onChange={handleChange} placeholder="Re-enter password" />
                  <button type="button" className="eye-btn"
                    onMouseDown={(e) => { e.preventDefault(); setShowPass2(v => !v); }}>
                    {showPass2 ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading || success}>
                {loading ? <div className="spinner" /> : success ? <><CheckIcon /> Registered!</> : "Create My Account"}
              </button>
            </form>

            <p className="signin-prompt">
              Already have an account? <a href="/login">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
