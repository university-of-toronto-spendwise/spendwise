import { useState } from "react";

export default function ReportBugModal({ onClose }) {
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSending(true);
    try {
      // In a real app, you'd POST to an API. For now we simulate success.
      await new Promise((r) => setTimeout(r, 500));
      setSubmitted(true);
      setTimeout(() => onClose(), 1200);
    } catch {
      setSending(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="rb-overlay" onClick={onClose}>
        <div className="rb-modal" onClick={(e) => e.stopPropagation()}>
          <h2>Report a Bug</h2>
          {submitted ? (
            <p className="rb-success">Thank you! Your report has been submitted.</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="rb-field">
                <label htmlFor="rb-desc">Describe the issue</label>
                <textarea
                  id="rb-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What happened? Include steps to reproduce if possible."
                  required
                />
              </div>
              <div className="rb-actions">
                <button type="button" className="rb-btn rb-btn-cancel" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="rb-btn rb-btn-submit" disabled={sending}>
                  {sending ? "Sending..." : "Submit"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
