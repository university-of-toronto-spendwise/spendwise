import Navbar from "./Navbar";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "#F4F7FB" }}>
      <Navbar />
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
        <h1 style={{ fontFamily: "'Source Sans 3', sans-serif", color: "#002A5C", fontSize: "1.9rem", fontWeight: 700 }}>
          Welcome to SpendWise 👋
        </h1>
        <p style={{ color: "#6B7A90", marginTop: "0.5rem" }}>
          Use the navigation above to explore Scholarships, Spending, Bills, and more.
        </p>
      </div>
    </div>
  );
}
