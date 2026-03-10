import { useState } from "react";
import { useNavigate } from "react-router-dom";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Source+Sans+3:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --uoft-blue: #002A5C;
    --uoft-mid: #0047A0;
    --uoft-accent: #E8B53E;
    --off-white: #F4F7FB;
    --text-muted: #6B7A90;
    --border: #D0DBE8;
    --error: #C0392B;
  }

  body { font-family: 'Source Sans 3', sans-serif; }

  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--off-white);
  }

  .login-card {
    width: 100%;
    max-width: 440px;
    padding: 2rem;
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

  .forgot-link {
    display: block;
    text-align: right;
    font-size: 0.8rem;
    color: var(--uoft-mid);
    text-decoration: none;
    font-weight: 500;
    margin-top: 0.4rem;
  }

  .forgot-link:hover { text-decoration: underline; }

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
    margin-top: 0.75rem;
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
    font-weight: 500;
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

  .signup-prompt {
    text-align: center;
    margin-top: 1.4rem;
    font-size: 0.87rem;
    color: var(--text-muted);
  }

  .signup-prompt a {
    color: var(--uoft-mid);
    font-weight: 600;
    text-decoration: none;
  }

  .signup-prompt a:hover { text-decoration: underline; }
`;

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
      const res = await fetch("http://localhost:8000/api/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.email,
          password: formData.password
        }),
      });

	      const data = await res.json();
	
	      if (res.ok) {
	        const accessToken = data.token || data.access || data.key;
	        const refreshToken = data.refresh;

	        if (accessToken) sessionStorage.setItem("userToken", accessToken);
	        if (accessToken) sessionStorage.setItem("userAccessToken", accessToken);
	        if (refreshToken) sessionStorage.setItem("userRefreshToken", refreshToken);
	        setSuccess(true);

        setTimeout(() => { navigate("/home"); }, 2000);

      } else {
        setError(data?.detail || data?.message || "Invalid email or password.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="login-page">
        <div className="login-card">

          {/* Logo lockup */}
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
