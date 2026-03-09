
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+3:wght@300;400;500;600;700;800&display=swap');

  :root {
    --sw-bg: #F3F6FB;
    --sw-card: #FFFFFF;
    --sw-border: #D7E1EF;
    --sw-blue: #002A5C;
    --sw-mid: #0E4FA8;
    --sw-muted: #60738D;
  }

  * { box-sizing: border-box; }
  .codes-page { min-height: 100vh; background: radial-gradient(1200px 500px at 10% -10%, #E7F0FF 0%, var(--sw-bg) 45%); }
  .codes-wrap { max-width: 1200px; margin: 0 auto; padding: 1.5rem; font-family: 'Source Sans 3', sans-serif; }

  .codes-hero {
    background: linear-gradient(135deg, #001E44 0%, #003A82 50%, #0E4FA8 100%);
    border-radius: 18px; color: #fff; padding: 1.2rem 1.3rem;
    border: 1px solid rgba(255,255,255,0.14);
    box-shadow: 0 10px 30px rgba(0, 33, 79, 0.22);
    margin-bottom: .9rem;
  }

  .codes-title { margin: 0 0 .2rem; font-size: 2rem; line-height: 1.08; font-weight: 800; letter-spacing: -0.02em; }
  .codes-sub { margin: 0; opacity: 0.92; font-size: .95rem; }

  .codes-stats { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .8rem; }
  .stat-pill {
    background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.22);
    border-radius: 999px; padding: .28rem .65rem; font-size: .8rem; font-weight: 700;
  }

  .controls {
    background: var(--sw-card); border: 1.5px solid var(--sw-border); border-radius: 14px;
    padding: .7rem; display: grid; grid-template-columns: 1.2fr .55fr .55fr .55fr; gap: .55rem; margin-bottom: .75rem;
  }

  .input, .select {
    height: 42px; border: 1.5px solid var(--sw-border); border-radius: 10px; padding: 0 .75rem;
    outline: none; font-size: .92rem; color: var(--sw-blue); background: #fff; font-family: 'Source Sans 3', sans-serif;
  }

  .input:focus, .select:focus { border-color: #7AA7E5; box-shadow: 0 0 0 3px rgba(30, 109, 220, 0.12); }

  .meta { margin: .35rem 0 .7rem; color: var(--sw-muted); font-size: .9rem; font-weight: 600; }

  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: .75rem; }

  .deal {
    background: #fff; border: 1.5px solid var(--sw-border); border-radius: 14px;
    overflow: hidden; padding: .55rem;
    transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
    cursor: pointer;
  }

  .deal:hover { transform: translateY(-1px); border-color: #B8CAE5; box-shadow: 0 8px 22px rgba(0, 42, 92, 0.09); }

  .thumb {
    position: relative; height: 140px; border-radius: 10px; overflow: hidden;
    background: #EEF3FB; display: flex; align-items: center; justify-content: center;
  }

  .thumb img { width: 100%; height: 100%; object-fit: cover; }
  .logoOnly { object-fit: contain !important; width: 75% !important; height: 75% !important; }
  .fallback { font-size: 2rem; font-weight: 800; color: var(--sw-blue); }

  .badge {
    position: absolute; top: 8px; right: 8px;
    background: #fff; border: 1px solid var(--sw-border); border-radius: 999px;
    padding: .2rem .45rem; font-size: .68rem; font-weight: 800; color: var(--sw-blue);
  }

  .headline {
    margin: .55rem .1rem 0; font-size: 1rem; color: var(--sw-blue);
    font-weight: 800; line-height: 1.2;
  }

  .mini { margin: .2rem .1rem .2rem; color: var(--sw-muted); font-size: .8rem; font-weight: 700; }
  .mini2 { margin: 0 .1rem .5rem; color: var(--sw-muted); font-size: .78rem; opacity: .95; min-height: 1.2rem; }

  .actions { display: flex; gap: .4rem; }
  .btn {
    flex: 1; height: 32px; border-radius: 8px; border: 1.5px solid var(--sw-border);
    background: #fff; font-weight: 800; font-size: .8rem; cursor: pointer; color: var(--sw-blue);
  }

  .btn.primary {
    background: var(--sw-blue); color: #fff; border-color: var(--sw-blue); text-decoration: none;
    display: flex; align-items: center; justify-content: center;
  }

  .copyBtn { position: relative; overflow: hidden; transition: all .18s ease; }
  .copyBtn.copied {
    background: #E9F8F0;
    border-color: #89D7AE;
    color: #0F7A47;
    transform: translateY(-1px);
  }

  .copyBtn.copied::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 0%, rgba(16,185,129,.22) 45%, transparent 100%);
    animation: sweep .7s ease;
  }

  .copyText { position: relative; z-index: 1; font-weight: 800; }

  @keyframes sweep {
    from { transform: translateX(-120%); }
    to { transform: translateX(120%); }
  }

  .state {
    background: #fff; border: 1.5px dashed var(--sw-border); border-radius: 14px;
    padding: 1rem; text-align: center; color: var(--sw-muted); font-weight: 600;
  }

  @media (max-width: 980px) { .controls { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 640px) {
    .codes-wrap { padding: 1rem; }
    .controls { grid-template-columns: 1fr; }
    .codes-title { font-size: 1.65rem; }
  }
`;

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
      <style>{styles}</style>
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
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search partner, headline, category, or code"
          />
          <select className="select" value={page} onChange={(e) => setPage(Number(e.target.value))}>
            <option value={1}>SPC page 1</option>
            <option value={2}>SPC page 2</option>
            <option value={3}>SPC page 3</option>
          </select>
          <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="all">All channels</option>
            <option value="online">Online only</option>
            <option value="instore">In-store only</option>
            <option value="both">Online + In-store</option>
          </select>
          <select className="select" value={spcPlusOnly} onChange={(e) => setSpcPlusOnly(e.target.value)}>
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

                  <div className="actions" onClick={(e) => e.stopPropagation()}>
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
