// In depth view of the discount code

import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "./Navbar";

export default function StudentCodeDetail() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const deal = useMemo(() => {
    if (state?.deal) return state.deal;
    const cache = JSON.parse(sessionStorage.getItem("spcDealsCache") || "{}");
    return cache[id] || null;
  }, [state, id]);

  if (!deal) {
    return (
      <div>
        <Navbar />
        <main style={{ padding: "2rem" }}>
          <h2>Deal not found</h2>
          <button onClick={() => navigate("/student-codes")}>Back</button>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F4F7FB" }}>
      <Navbar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem", fontFamily: "Source Sans 3, sans-serif" }}>
        <button onClick={() => navigate("/student-codes")} style={{ marginBottom: 12 }}>← Back</button>

        <div style={{ background: "#fff", border: "1.5px solid #D7E1EF", borderRadius: 14, overflow: "hidden" }}>
          {deal.image || deal.logo ? (
            <img
              src={deal.image || deal.logo}
              alt={deal.partner}
              style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }}
            />
          ) : null}

          <div style={{ padding: "1rem 1.1rem" }}>
            <h1 style={{ margin: 0 }}>{deal.partner}</h1>
            <h3 style={{ margin: "6px 0 10px", color: "#002A5C" }}>{deal.title || "Offer"}</h3>
            <p style={{ margin: "0 0 12px", color: "#60738D" }}>{deal.description || "No description available."}</p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <span>Category: {deal.category || "N/A"}</span>
              <span>{deal.online ? "Online" : ""}{deal.online && deal.in_store ? " + " : ""}{deal.in_store ? "In-store" : ""}</span>
              <span>{deal.is_spc_plus ? "SPC+" : "SPC"}</span>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <span>Online code: {deal.promo_code_online || "No code"}</span>
              <span>In-store code: {deal.promo_code_instore || "No code"}</span>
            </div>

            {deal.url ? (
              <a
                href={deal.url}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-block", padding: "10px 14px", borderRadius: 8, background: "#002A5C", color: "#fff", textDecoration: "none", fontWeight: 700 }}
              >
                Open deal
              </a>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
