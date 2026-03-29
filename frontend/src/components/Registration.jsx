import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { API_BASE_URL, hydrateSessionFromTokens } from "../utils/session";

const UserIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const MailIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const LockIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const ShieldIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="M9 12l2 2 4-4" />
  </svg>
);
const EyeOpenIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeClosedIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const initialForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  password2: "",
};
const PENDING_SIGNUP_KEY = "pendingSignup";

function extractErrorMessage(data, fallback) {
  if (!data || typeof data !== "object") return fallback;
  const firstKey = Object.keys(data)[0];
  if (!firstKey) return fallback;
  const message = data[firstKey];
  return Array.isArray(message) ? message.join(" ") : message;
}

export default function UofTSignup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [verificationCode, setVerificationCode] = useState("");
  const [stage, setStage] = useState("details");
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(PENDING_SIGNUP_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed?.formData) {
        setFormData((current) => ({ ...current, ...parsed.formData }));
      }
      if (parsed?.stage === "verify") {
        setStage("verify");
      }
    } catch {
      sessionStorage.removeItem(PENDING_SIGNUP_KEY);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(
      PENDING_SIGNUP_KEY,
      JSON.stringify({
        formData,
        stage,
      })
    );
  }, [formData, stage]);

  const handleChange = (event) => setFormData({ ...formData, [event.target.name]: event.target.value });

  const validateDetails = () => {
    if (!formData.first_name.trim()) return "Please enter your first name.";
    if (!formData.last_name.trim()) return "Please enter your last name.";
    if (!formData.email.trim()) return "Please enter your email address.";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return "Please enter a valid email address.";
    if (!/@(mail\.)?utoronto\.ca$/i.test(formData.email.trim())) return "Please use your UofT email address.";

    if (!formData.password) return "Please enter a password.";
    if (!formData.password2) return "Please confirm your password.";
    if (formData.password !== formData.password2) return "Passwords do not match.";

    return "";
  };

  const requestVerificationCode = async (event) => {
    event.preventDefault();
    const validationError = validateDetails();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSuccess("");
    setSendingCode(true);

    try {
      const response = await fetch(`${API_BASE_URL}/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(extractErrorMessage(data, "We couldn't send the verification code. Please try again."));
        return;
      }

      const normalizedEmail = data.email || formData.email.trim().toLowerCase();
      setFormData((current) => ({ ...current, email: normalizedEmail }));
      setStage("verify");
      setVerificationCode("");
      setSuccess(`We sent a 6-digit code to ${normalizedEmail}.`);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setSendingCode(false);
    }
  };

  const verifyCodeAndCreateAccount = async (event) => {
    event.preventDefault();

    if (!verificationCode.trim()) {
      setError("Please enter the verification code.");
      return;
    }

    setError("");
    setSuccess("");
    setVerifyingCode(true);

    try {
      const response = await fetch(`${API_BASE_URL}/register/verify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          code: verificationCode.trim(),
          password: formData.password,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(extractErrorMessage(data, "Verification failed. Please try again."));
        return;
      }

      sessionStorage.removeItem(PENDING_SIGNUP_KEY);
      setSuccess("Email verified. Redirecting to onboarding...");
      const destination = await hydrateSessionFromTokens({
        access: data.access,
        refresh: data.refresh,
      });

      setTimeout(() => {
        navigate(destination, { replace: true });
      }, 900);
    } catch (err) {
      setError(err?.message || "Network error. Please check your connection.");
    } finally {
      setVerifyingCode(false);
    }
  };

  const backToDetails = () => {
    setStage("details");
    setVerificationCode("");
    setError("");
    setSuccess("");
    sessionStorage.removeItem(PENDING_SIGNUP_KEY);
  };

  return (
    <div className="uoft-page">
      <div className="uoft-right">
        <div className="signup-card">
          <div style={{ marginBottom: "1.4rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.7rem" }}>
              <div
                style={{
                  background: "#002A5C",
                  borderRadius: "12px",
                  padding: "0.55rem 1.2rem 0.55rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  boxShadow: "4px 4px 0px #E8B53E",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.65rem", fontWeight: 700, color: "white", letterSpacing: "-0.01em", lineHeight: 1 }}>
                  SpendWise
                </span>
              </div>
              <span
                style={{
                  background: "#E8B53E",
                  color: "#002A5C",
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "3px 9px",
                  borderRadius: "20px",
                  alignSelf: "flex-start",
                  marginTop: "10px",
                }}
              >
                UofT
              </span>
            </div>
          </div>

          <p className="card-subtitle">
            {stage === "details"
              ? "Create your SpendWise account with your UofT email, verify the code we send, and continue straight into onboarding."
              : "Check your UofT inbox, enter the 6-digit code, and we will finish creating your account securely."}
          </p>

          {stage === "verify" && formData.email && (
            <p className="card-subtitle" style={{ marginTop: "-0.35rem", marginBottom: "1rem" }}>
              Code sent to <strong>{formData.email}</strong>
            </p>
          )}

          {success && <div className="success-banner"><CheckIcon /> {success}</div>}
          {error && <div className="error-banner">{error}</div>}

          {stage === "details" ? (
            <form onSubmit={requestVerificationCode}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="first_name">First Name</label>
                  <div className="input-wrap">
                    <span className="input-icon"><UserIcon /></span>
                    <input id="first_name" type="text" name="first_name" value={formData.first_name} onChange={handleChange} placeholder="Jane" />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="last_name">Last Name</label>
                  <div className="input-wrap">
                    <span className="input-icon"><UserIcon /></span>
                    <input id="last_name" type="text" name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Doe" />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">UofT Email</label>
                <div className="input-wrap">
                  <span className="input-icon"><MailIcon /></span>
                  <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your.name@mail.utoronto.ca" />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrap">
                  <span className="input-icon"><LockIcon /></span>
                  <input id="password" type={showPass ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Min. 8 characters" />
                  <button type="button" className="eye-btn" onMouseDown={(event) => { event.preventDefault(); setShowPass((value) => !value); }}>
                    {showPass ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password2">Confirm Password</label>
                <div className="input-wrap">
                  <span className="input-icon"><LockIcon /></span>
                  <input id="password2" type={showPass2 ? "text" : "password"} name="password2" value={formData.password2} onChange={handleChange} placeholder="Re-enter password" />
                  <button type="button" className="eye-btn" onMouseDown={(event) => { event.preventDefault(); setShowPass2((value) => !value); }}>
                    {showPass2 ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={sendingCode}>
                {sendingCode ? <div className="spinner" /> : "Send Verification Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCodeAndCreateAccount}>
              <div className="form-group">
                <label htmlFor="verification_code">Verification Code</label>
                <div className="input-wrap">
                  <span className="input-icon"><ShieldIcon /></span>
                  <input
                    id="verification_code"
                    type="text"
                    inputMode="numeric"
                    maxLength="6"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit code"
                  />
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={verifyingCode}>
                {verifyingCode ? <div className="spinner" /> : "Verify Email and Continue"}
              </button>

              <button
                type="button"
                className="submit-btn"
                style={{ marginTop: "0.85rem", background: "#EEF3FB", color: "#002A5C" }}
                onClick={requestVerificationCode}
                disabled={sendingCode || verifyingCode}
              >
                {sendingCode ? "Sending..." : "Resend Code"}
              </button>

              <p className="signin-prompt">
                Need to change your details? <button type="button" onClick={backToDetails} style={{ border: 0, background: "transparent", color: "#5b3cc4", padding: 0, cursor: "pointer", textDecoration: "underline" }}>Go back</button>
              </p>
            </form>
          )}

          <p className="signin-prompt">
            Already verified? <a href="/login">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
