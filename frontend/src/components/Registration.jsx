import { useState } from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Source+Sans+3:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --uoft-blue: #002A5C;
    --uoft-mid: #0047A0;
    --uoft-light: #1E5FA8;
    --uoft-sky: #D6E4F7;
    --uoft-accent: #E8B53E;
    --white: #FFFFFF;
    --off-white: #F4F7FB;
    --text-muted: #6B7A90;
    --border: #D0DBE8;
    --error: #C0392B;
  }

  body { font-family: 'Source Sans 3', sans-serif; }

  .uoft-page {
    min-height: 100vh;
    width: 100%;
    display: flex;
    background: var(--off-white);
    position: relative;
    overflow: hidden;
  }

  /* ===================== RIGHT PANEL ===================== */
  .uoft-right {
    flex: 1;
    width: 100%;
    border-left: none;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--off-white);
    position: relative;
    z-index: 1;
    padding: 3rem 2rem;
  }

  .signup-card {
    width: 100%;
    max-width: 440px;
    animation: fadeUp 0.5s ease both;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .card-subtitle {
    font-size: 0.92rem;
    color: var(--text-muted);
    font-weight: 400;
    margin-bottom: 2rem;
    line-height: 1.55;
  }

  .form-group { margin-bottom: 1.1rem; }

  .form-row { display: flex; gap: 0.75rem; }
  .form-row .form-group { flex: 1; }

  label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--uoft-blue);
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-bottom: 0.4rem;
  }

  .input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-icon {
    position: absolute;
    left: 13px;
    color: var(--text-muted);
    pointer-events: none;
    display: flex;
    align-items: center;
    z-index: 1;
    transition: color 0.2s;
  }

  .input-wrap:focus-within .input-icon { color: var(--uoft-mid); }

  .input-wrap input {
    width: 100%;
    height: 48px;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    background: white;
    padding: 0 2.8rem 0 2.6rem;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 0.92rem;
    color: var(--uoft-blue);
    transition: border-color 0.2s, box-shadow 0.2s;
    outline: none;
  }

  .input-wrap input::placeholder { color: #B0BAC8; font-weight: 300; }

  .input-wrap input:focus {
    border-color: var(--uoft-mid);
    box-shadow: 0 0 0 4px rgba(0,71,160,0.1);
  }

  .input-wrap input:-webkit-autofill,
  .input-wrap input:-webkit-autofill:hover,
  .input-wrap input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0px 1000px white inset;
    -webkit-text-fill-color: var(--uoft-blue);
    transition: background-color 5000s ease-in-out 0s;
  }

  .eye-btn {
    position: absolute;
    right: 10px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    z-index: 3;
    line-height: 1;
    transition: color 0.15s;
  }

  .eye-btn:hover { color: var(--uoft-blue); }
  .eye-btn:focus { outline: none; }

  .submit-btn {
    width: 100%;
    height: 52px;
    border-radius: 10px;
    border: none;
    background: var(--uoft-blue);
    color: white;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 0.97rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    margin-top: 0.5rem;
    transition: background 0.2s, transform 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .submit-btn:hover { background: var(--uoft-mid); transform: translateY(-1px); }
  .submit-btn:active { transform: translateY(0); }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  .spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .success-banner {
    background: #EAF7EF;
    border: 1.5px solid #68C98A;
    border-radius: 10px;
    padding: 1rem 1.2rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #1D6A37;
    font-size: 0.9rem;
    font-weight: 400;
    margin-bottom: 1.5rem;
  }

  .error-banner {
    background: #FEF0EE;
    border: 1.5px solid #E8827A;
    border-radius: 10px;
    padding: 0.85rem 1.1rem;
    color: var(--error);
    font-size: 0.87rem;
    margin-bottom: 1rem;
  }

  .signin-prompt {
    text-align: center;
    margin-top: 1.4rem;
    font-size: 0.87rem;
    color: var(--text-muted);
  }

  .signin-prompt a {
    color: var(--uoft-mid);
    font-weight: 600;
    text-decoration: none;
  }

  .signin-prompt a:hover { text-decoration: underline; }

`;

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
    if (!formData.password) { setError("Please enter a password."); return; }
    if (!formData.password2) { setError("Please confirm your password."); return; }
    if (formData.password !== formData.password2) { setError("Passwords do not match."); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { window.location.href = "/login"; }, 2000);
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
      <style>{styles}</style>
      <div className="uoft-page">
        {/* ── RIGHT PANEL ── */}
        <div className="uoft-right">
          <div className="signup-card">

            <div style={{marginBottom:'1.4rem'}}>
              <div style={{display:'inline-flex', alignItems:'center', gap:'0.7rem'}}>
                <div style={{
                  background:'var(--uoft-blue)', borderRadius:'12px',
                  padding:'0.55rem 1.2rem 0.55rem 1rem',
                  display:'flex', alignItems:'center', gap:'0.65rem',
                  boxShadow:'4px 4px 0px var(--uoft-accent)',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  <span style={{ fontFamily:"'Playfair Display', serif", fontSize:'1.65rem', fontWeight:700, color:'white', letterSpacing:'-0.01em', lineHeight:1 }}>
                    SpendWise
                  </span>
                </div>
                <span style={{
                  background:'var(--uoft-accent)', color:'var(--uoft-blue)',
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