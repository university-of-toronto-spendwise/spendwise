
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";


function normalizeCode(value) {
  if (!value || value === "no_code" || value === "unique" || value === "random") return null;
  return value;
}

async function fetchJSON(url) {
  const token = sessionStorage.getItem("userToken");
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  let payload = {};
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }

  if (!res.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload;
}

export default function StudentCodes() {
  const navigate = useNavigate();

  const [page, setPage] = useState(2);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("all");
  const [spcPlusOnly, setSpcPlusOnly] = useState("all");
  const [deals, setDeals] = useState([]);
  const [meta, setMeta] = useState({ count: 0, total_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    fetchJSON(`/api/student-codes/spc/?page=${page}&page_size=24`)
      .then((json) => {
        if (!alive) return;
        setDeals(json.deals || []);
        setMeta({ count: json.count || 0, total_count: json.total_count || 0 });
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [page]);

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();

    return deals
      .filter((d) => {
        if (mode === "online") return d.online;
        if (mode === "instore") return d.in_store;
        if (mode === "both") return d.online && d.in_store;
        return true;
      })
      .filter((d) => {
        if (spcPlusOnly === "yes") return d.is_spc_plus;
        if (spcPlusOnly === "no") return !d.is_spc_plus;
        return true;
      })
      .filter((d) => {
        if (!query) return true;
        const blob = [d.partner, d.title, d.description, d.category, d.promo_code_online, d.promo_code_instore]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");
        return blob.includes(query);
      });
  }, [deals, q, mode, spcPlusOnly]);

  const onCopy = async (dealId, code) => {
    if (!code) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("execCommand copy failed");
      }

      setCopiedId(dealId);
      setTimeout(() => setCopiedId((prev) => (prev === dealId ? null : prev)), 1400);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const openDealDetails = (deal) => {
    const cache = JSON.parse(sessionStorage.getItem("spcDealsCache") || "{}");
    cache[deal.id] = deal;
    sessionStorage.setItem("spcDealsCache", JSON.stringify(cache));
    navigate(`/student-codes/deal/${deal.id}`, { state: { deal } });
  };

  return (
    <div className="codes-page">
      <Navbar />

      <main className="codes-wrap">
        <section className="codes-hero">
          <h1 className="codes-title">Student Discount Codes</h1>
          <p className="codes-sub">Find your discount today</p>
          <div className="codes-stats">
            <span className="stat-pill">Page {page}</span>
            <span className="stat-pill">{visible.length} visible</span>
            <span className="stat-pill">{meta.total_count} total offers</span>
          </div>
        </section>

        <section className="controls">
          <input
            className="codes-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search partner, headline, category, or code"
          />
          <select className="codes-select" value={page} onChange={(e) => setPage(Number(e.target.value))}>
            <option value={1}>SPC page 1</option>
            <option value={2}>SPC page 2</option>
            <option value={3}>SPC page 3</option>
          </select>
          <select className="codes-select" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="all">All channels</option>
            <option value="online">Online only</option>
            <option value="instore">In-store only</option>
            <option value="both">Online + In-store</option>
          </select>
          <select className="codes-select" value={spcPlusOnly} onChange={(e) => setSpcPlusOnly(e.target.value)}>
            <option value="all">All memberships</option>
            <option value="yes">SPC+ only</option>
            <option value="no">Non-SPC+ only</option>
          </select>
        </section>

        <div className="meta">Showing {visible.length} of {meta.count} on this page. Total available: {meta.total_count}.</div>

        {loading && <div className="state">Loading deals...</div>}
        {!loading && error && <div className="state">{error}</div>}
        {!loading && !error && visible.length === 0 && <div className="state">No deals match current filters.</div>}

        {!loading && !error && visible.length > 0 && (
          <section className="grid">
            {visible.map((d) => {
              const onlineCode = normalizeCode(d.promo_code_online);
              const inStoreCode = normalizeCode(d.promo_code_instore);
              const bestCode = onlineCode || inStoreCode;

              return (
                <article
                  className="deal"
                  key={d.id}
                  onClick={() => openDealDetails(d)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="thumb">
                    {d.image ? (
                      <img
                        src={d.image}
                        alt={d.partner || "Deal"}
                        onError={(e) => {
                          const s = e.currentTarget.src;
                          if (s.includes("https://storage.spccard.ca/")) {
                            e.currentTarget.src = s.replace(
                              "https://storage.spccard.ca/",
                              "https://storage.googleapis.com/storage.spccard.ca/"
                            );
                          } else {
                            e.currentTarget.style.display = "none";
                          }
                        }}
                      />
                    ) : d.logo ? (
                      <img
                        className="logoOnly"
                        src={d.logo}
                        alt={d.partner || "Deal"}
                        onError={(e) => {
                          const s = e.currentTarget.src;
                          if (s.includes("https://storage.spccard.ca/")) {
                            e.currentTarget.src = s.replace(
                              "https://storage.spccard.ca/",
                              "https://storage.googleapis.com/storage.spccard.ca/"
                            );
                          } else {
                            e.currentTarget.style.display = "none";
                          }
                        }}
                      />
                    ) : (
                      <div className="fallback">{(d.partner || "S").slice(0, 1)}</div>
                    )}
                    <span className="badge">{d.is_spc_plus ? "SPC+" : "SPC"}</span>
                  </div>

                  <h2 className="headline">{d.partner || "Partner"}</h2>
                  <div className="mini">{d.title || d.category || "Deal"}</div>
                  <p className="mini2">{(d.description || "No description").slice(0, 80)}</p>

                  <div className="deal-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className={`btn copyBtn ${copiedId === d.id ? "copied" : ""}`}
                      onClick={() => onCopy(d.id, bestCode)}
                      disabled={!bestCode}
                    >
                      <span className="copyText">{copiedId === d.id ? "Copied to clipboard" : "Copy"}</span>
                    </button>

                    {d.url ? (
                      <a className="btn primary" href={d.url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    ) : (
                      <button className="btn primary" disabled>Open</button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
