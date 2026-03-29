import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfile, getToken, saveProfile } from "../utils/session";


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
      setError("Please enter your monthly revenue.");
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
                    <label className="ob-label" htmlFor="total_earnings">Monthly revenue</label>
                    <input id="total_earnings" type="number" min="0" step="0.01" className="ob-input" value={form.total_earnings} onChange={(e) => setValue("total_earnings", e.target.value)} placeholder="$0.00" />
                    <div className="ob-help">Use the amount you typically bring in each month from work, stipends, or other income.</div>
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
