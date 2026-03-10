import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfile, getToken, saveProfile } from "../utils/session";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  :root {
    --uoft-blue: #002A5C;
    --uoft-mid: #0047A0;
    --uoft-accent: #E8B53E;
    --off-white: #F4F7FB;
    --white: #FFFFFF;
    --border: #D0DBE8;
    --text-muted: #6B7A90;
    --success: #1D6A37;
    --success-bg: #EAF7EF;
    --error: #C0392B;
    --error-bg: #FEF0EE;
  }

  body { font-family: 'Source Sans 3', sans-serif; }

  .ob-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(232,181,62,0.18), transparent 28%),
      linear-gradient(180deg, #F7FAFF 0%, var(--off-white) 100%);
    padding: 2.5rem 1.25rem;
  }

  .ob-shell {
    max-width: 1040px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    gap: 1.5rem;
  }

  .ob-side,
  .ob-card {
    background: rgba(255,255,255,0.9);
    backdrop-filter: blur(14px);
    border: 1.5px solid var(--border);
    border-radius: 24px;
    box-shadow: 0 16px 40px rgba(0,42,92,0.08);
  }

  .ob-side {
    padding: 1.5rem;
    align-self: start;
    position: sticky;
    top: 1.5rem;
  }

  .ob-logo {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    margin-bottom: 1rem;
  }

  .ob-logo-box {
    background: var(--uoft-blue);
    border-radius: 12px;
    padding: 0.55rem 1.1rem 0.55rem 0.95rem;
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    box-shadow: 4px 4px 0 var(--uoft-accent);
  }

  .ob-logo-text {
    font-family: 'Playfair Display', serif;
    font-size: 1.35rem;
    color: white;
    font-weight: 700;
    line-height: 1;
  }

  .ob-badge {
    background: var(--uoft-accent);
    color: var(--uoft-blue);
    border-radius: 999px;
    padding: 0.18rem 0.55rem;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    align-self: flex-start;
    margin-top: 0.45rem;
  }

  .ob-side h1 {
    font-size: 1.7rem;
    color: var(--uoft-blue);
    line-height: 1.05;
    margin-bottom: 0.75rem;
  }

  .ob-side p {
    color: var(--text-muted);
    font-size: 0.96rem;
    line-height: 1.6;
    margin-bottom: 1.4rem;
  }

  .ob-list {
    display: grid;
    gap: 0.85rem;
  }

  .ob-list-item {
    border: 1.5px solid var(--border);
    border-radius: 16px;
    padding: 0.85rem 1rem;
    background: #F9FBFE;
  }

  .ob-list-item strong {
    display: block;
    font-size: 0.9rem;
    color: var(--uoft-blue);
    margin-bottom: 0.2rem;
  }

  .ob-list-item span {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .ob-card {
    padding: 1.75rem;
  }

  .ob-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .ob-kicker {
    color: var(--uoft-mid);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.72rem;
    font-weight: 700;
    margin-bottom: 0.35rem;
  }

  .ob-header h2 {
    font-size: 1.7rem;
    color: var(--uoft-blue);
    margin-bottom: 0.35rem;
  }

  .ob-header p {
    color: var(--text-muted);
    line-height: 1.55;
    max-width: 38rem;
  }

  .ob-progress {
    min-width: 120px;
    border: 1.5px solid var(--border);
    border-radius: 18px;
    padding: 0.85rem 1rem;
    text-align: center;
    background: white;
  }

  .ob-progress strong {
    display: block;
    color: var(--uoft-blue);
    font-size: 1.15rem;
  }

  .ob-progress span {
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .ob-banner {
    border-radius: 14px;
    padding: 0.95rem 1.05rem;
    margin-bottom: 1rem;
    font-size: 0.92rem;
  }

  .ob-banner.error {
    background: var(--error-bg);
    border: 1.5px solid #E8827A;
    color: var(--error);
  }

  .ob-banner.success {
    background: var(--success-bg);
    border: 1.5px solid #68C98A;
    color: var(--success);
  }

  .ob-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .ob-field {
    margin-bottom: 1.1rem;
  }

  .ob-field.full {
    grid-column: 1 / -1;
  }

  .ob-label {
    display: block;
    font-size: 0.74rem;
    font-weight: 700;
    color: var(--uoft-blue);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 0.45rem;
  }

  .ob-help {
    color: var(--text-muted);
    font-size: 0.82rem;
    margin-top: 0.35rem;
  }

  .ob-input,
  .ob-select {
    width: 100%;
    height: 50px;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    padding: 0 0.95rem;
    background: white;
    font-size: 0.95rem;
    color: var(--uoft-blue);
    outline: none;
    transition: border-color 0.18s, box-shadow 0.18s;
  }

  .ob-input:focus,
  .ob-select:focus {
    border-color: var(--uoft-mid);
    box-shadow: 0 0 0 4px rgba(0,71,160,0.1);
  }

  .ob-toggle {
    display: flex;
    gap: 0.75rem;
  }

  .ob-toggle button {
    flex: 1;
    height: 48px;
    border-radius: 12px;
    border: 1.5px solid var(--border);
    background: white;
    color: var(--uoft-blue);
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.14s, border-color 0.18s, background 0.18s;
  }

  .ob-toggle button.active {
    background: #EAF0FF;
    border-color: var(--uoft-mid);
    color: var(--uoft-mid);
  }

  .ob-toggle button:hover {
    transform: translateY(-1px);
  }

  .ob-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  .ob-actions p {
    color: var(--text-muted);
    font-size: 0.88rem;
  }

  .ob-submit {
    min-width: 220px;
    height: 52px;
    border: none;
    border-radius: 12px;
    background: var(--uoft-blue);
    color: white;
    font-size: 0.96rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: background 0.18s, transform 0.14s;
  }

  .ob-submit:hover {
    background: var(--uoft-mid);
    transform: translateY(-1px);
  }

  .ob-submit:disabled {
    cursor: not-allowed;
    opacity: 0.65;
    transform: none;
  }

  @media (max-width: 900px) {
    .ob-shell {
      grid-template-columns: 1fr;
    }

    .ob-side {
      position: static;
    }
  }

  @media (max-width: 700px) {
    .ob-page {
      padding: 1rem;
    }

    .ob-card,
    .ob-side {
      padding: 1.2rem;
      border-radius: 18px;
    }

    .ob-grid {
      grid-template-columns: 1fr;
    }

    .ob-header {
      flex-direction: column;
    }

    .ob-progress {
      width: 100%;
    }
  }
`;

const initialForm = {
  citizenship_status: "Domestic",
  campus: "St.George",
  receives_scholarships_or_aid: false,
  scholarship_aid_amount: "",
  total_earnings: "",
  total_expenses: "",
  parental_support: "",
  degree_type: "Undergrad",
  expected_graduation: "",
};

function toForm(profile = {}) {
  return {
    citizenship_status: profile.citizenship_status || initialForm.citizenship_status,
    campus: profile.campus || initialForm.campus,
    receives_scholarships_or_aid: Boolean(profile.receives_scholarships_or_aid),
    scholarship_aid_amount: profile.scholarship_aid_amount ?? "",
    total_earnings: profile.total_earnings ?? "",
    total_expenses: profile.total_expenses ?? "",
    parental_support: profile.parental_support ?? "",
    degree_type: profile.degree_type || initialForm.degree_type,
    expected_graduation: profile.expected_graduation || "",
  };
}

function sanitizeCurrency(value) {
  return value === "" ? "" : Number(value).toFixed(2);
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    let isMounted = true;
    fetchProfile(token)
      .then((profile) => {
        if (!isMounted) return;
        if (profile.onboarding_completed) {
          navigate("/home", { replace: true });
          return;
        }
        setForm(toForm(profile));
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const setValue = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "receives_scholarships_or_aid" && !value ? { scholarship_aid_amount: "" } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (isBlank(form.citizenship_status)) {
      setError("Please select whether you are a domestic or international student.");
      return;
    }

    if (isBlank(form.campus)) {
      setError("Please select your campus.");
      return;
    }

    if (isBlank(form.total_earnings)) {
      setError("Please enter your total earnings.");
      return;
    }

    if (isBlank(form.total_expenses)) {
      setError("Please enter your total expenses.");
      return;
    }

    if (isBlank(form.parental_support)) {
      setError("Please enter your parental support amount. Use 0 if none.");
      return;
    }

    if (isBlank(form.degree_type)) {
      setError("Please select your degree type.");
      return;
    }

    if (!form.expected_graduation.trim()) {
      setError("Please share your expected degree completion timeline.");
      return;
    }

    if (form.receives_scholarships_or_aid && isBlank(form.scholarship_aid_amount)) {
      setError("Please enter how much scholarship or aid you receive.");
      return;
    }

    setSaving(true);
    try {
      await saveProfile({
        ...form,
        scholarship_aid_amount: form.receives_scholarships_or_aid ? sanitizeCurrency(form.scholarship_aid_amount) : null,
        total_earnings: sanitizeCurrency(form.total_earnings),
        total_expenses: sanitizeCurrency(form.total_expenses),
        parental_support: sanitizeCurrency(form.parental_support),
      });
      setSuccess("Onboarding complete. Redirecting to your dashboard...");
      setTimeout(() => navigate("/home", { replace: true }), 900);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="ob-page">
        <div className="ob-shell">
          <aside className="ob-side">
            <div className="ob-logo">
              <div className="ob-logo-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span className="ob-logo-text">SpendWise</span>
              </div>
              <span className="ob-badge">UofT</span>
            </div>

            <h1>Set up your student profile</h1>
            <p>
              These answers personalize scholarships, budgeting guidance, and the financial snapshots you see across SpendWise.
            </p>

            <div className="ob-list">
              <div className="ob-list-item">
                <strong>Funding context</strong>
                <span>Income, aid, and family support shape your financial recommendations.</span>
              </div>
              <div className="ob-list-item">
                <strong>Academic context</strong>
                <span>Campus, degree type, and graduation plan power scholarship matching.</span>
              </div>
              <div className="ob-list-item">
                <strong>One-time setup</strong>
                <span>You can edit these details later without losing access to your account.</span>
              </div>
            </div>
          </aside>

          <main className="ob-card">
            <div className="ob-header">
              <div>
                <div className="ob-kicker">Onboarding Questions</div>
                <h2>Tell us about your current financial situation</h2>
                <p>We only ask for the details needed to tailor scholarship matches and spending insights to your UofT journey.</p>
              </div>
              <div className="ob-progress">
                <strong>9 Questions</strong>
                <span>About 2 minutes</span>
              </div>
            </div>

            {error && <div className="ob-banner error">{error}</div>}
            {success && <div className="ob-banner success">{success}</div>}

            {loading ? (
              <div className="ob-banner">Loading your profile...</div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="ob-grid">
                  <div className="ob-field">
                    <label className="ob-label" htmlFor="citizenship_status">International or Domestic</label>
                    <select id="citizenship_status" className="ob-select" value={form.citizenship_status} onChange={(e) => setValue("citizenship_status", e.target.value)}>
                      <option value="Domestic">Domestic</option>
                      <option value="International">International</option>
                    </select>
                  </div>

                  <div className="ob-field">
                    <label className="ob-label" htmlFor="campus">Which campus</label>
                    <select id="campus" className="ob-select" value={form.campus} onChange={(e) => setValue("campus", e.target.value)}>
                      <option value="St.George">St.George</option>
                      <option value="Scarborough">Scarborough</option>
                      <option value="Mississauga">Mississauga</option>
                    </select>
                  </div>

                  <div className="ob-field">
                    <span className="ob-label">Receiving scholarships or aid</span>
                    <div className="ob-toggle">
                      <button type="button" className={!form.receives_scholarships_or_aid ? "active" : ""} onClick={() => setValue("receives_scholarships_or_aid", false)}>No</button>
                      <button type="button" className={form.receives_scholarships_or_aid ? "active" : ""} onClick={() => setValue("receives_scholarships_or_aid", true)}>Yes</button>
                    </div>
                  </div>

                  <div className="ob-field">
                    <label className="ob-label" htmlFor="scholarship_aid_amount">If yes, how much</label>
                    <input id="scholarship_aid_amount" type="number" min="0" step="0.01" className="ob-input" value={form.scholarship_aid_amount} onChange={(e) => setValue("scholarship_aid_amount", e.target.value)} placeholder="$0.00" disabled={!form.receives_scholarships_or_aid} />
                  </div>

                  <div className="ob-field">
                    <label className="ob-label" htmlFor="total_earnings">Earnings / total earnings</label>
                    <input id="total_earnings" type="number" min="0" step="0.01" className="ob-input" value={form.total_earnings} onChange={(e) => setValue("total_earnings", e.target.value)} placeholder="$0.00" />
                  </div>

                  <div className="ob-field">
                    <label className="ob-label" htmlFor="total_expenses">Total expenses</label>
                    <input id="total_expenses" type="number" min="0" step="0.01" className="ob-input" value={form.total_expenses} onChange={(e) => setValue("total_expenses", e.target.value)} placeholder="Utilities, bills, groceries..." />
                    <div className="ob-help">Include recurring living costs such as rent, utilities, groceries, transportation, and bills.</div>
                  </div>

                  <div className="ob-field">
                    <label className="ob-label" htmlFor="parental_support">Support from parents</label>
                    <input id="parental_support" type="number" min="0" step="0.01" className="ob-input" value={form.parental_support} onChange={(e) => setValue("parental_support", e.target.value)} placeholder="$0.00" />
                  </div>

                  <div className="ob-field">
                    <label className="ob-label" htmlFor="degree_type">Degree</label>
                    <select id="degree_type" className="ob-select" value={form.degree_type} onChange={(e) => setValue("degree_type", e.target.value)}>
                      <option value="Undergrad">Undergrad</option>
                      <option value="Postgrad">Postgrad</option>
                    </select>
                  </div>

                  <div className="ob-field full">
                    <label className="ob-label" htmlFor="expected_graduation">Career plan / expected degree completion</label>
                    <input id="expected_graduation" className="ob-input" value={form.expected_graduation} onChange={(e) => setValue("expected_graduation", e.target.value)} placeholder="e.g. Spring 2028 or complete in 2 years" />
                  </div>
                </div>

                <div className="ob-actions">
                  <p>Your answers stay tied to your account and can be updated later.</p>
                  <button className="ob-submit" type="submit" disabled={saving}>
                    {saving ? "Saving profile..." : "Complete Onboarding"}
                  </button>
                </div>
              </form>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
