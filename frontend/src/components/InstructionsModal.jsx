export default function InstructionsModal({ title, steps, onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: "16px",
          padding: "2rem", maxWidth: "560px", width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          maxHeight: "80vh", overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#1a1a2e" }}>
            📘 {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", fontSize: "1.4rem",
              cursor: "pointer", color: "#666", lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                background: "#6366f1", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "0.9rem",
              }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: "#1a1a2e", marginBottom: "0.2rem" }}>
                  {step.title}
                </div>
                <div style={{ color: "#555", fontSize: "0.88rem", lineHeight: 1.5 }}>
                  {step.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: "1.5rem", width: "100%", padding: "0.75rem",
            background: "#6366f1", color: "#fff", border: "none",
            borderRadius: "10px", fontWeight: 600, fontSize: "0.95rem",
            cursor: "pointer",
          }}
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
