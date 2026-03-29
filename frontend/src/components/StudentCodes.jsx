
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { API_BASE_URL, clearSession, fetchWithAuth } from "../utils/session";

function normalizeCode(value) {
  if (!value || value === "no_code" || value === "unique" || value === "random") return null;
  return value;
}

function copyPayloadForDeal(deal) {
  const onlineCode = normalizeCode(deal.promo_code_online);
  const inStoreCode = normalizeCode(deal.promo_code_instore);
  const code = onlineCode || inStoreCode;

  if (code) {
    return { value: code };
  }

  if (deal.url) {
    return { value: deal.url };
  }

  return { value: null };
}

async function fetchJSON(url) {
  let res;
  try {
    res = await fetchWithAuth(url, { headers: { Accept: "application/json" } });
  } catch (e) {
    throw new Error(e?.message || "Network error");
  }

  const contentType = res.headers.get("content-type") || "";
  let payload = null;

  if (res.status !== 204) {
    if (contentType.includes("application/json")) {
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }
    } else {
      try {
        payload = await res.text();
      } catch {
        payload = null;
      }
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
      const err = new Error("Session expired. Please log in again.");
      err.code = "SESSION_EXPIRED";
      err.status = 401;
      throw err;
    }

    const message =
      payload && typeof payload === "object"
        ? payload.error || payload.detail || payload.message
        : typeof payload === "string" && payload.trim()
          ? payload.trim()
          : `${res.status} ${res.statusText || "Request failed"}`;

    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return payload && typeof payload === "object" ? payload : {};
}

function scoreIntent(deal, intent) {
  const query = intent.trim().toLowerCase();
  if (!query) return 0;

  const intentAliases = {
    iphone: ["apple", "ios", "macbook", "ipad", "airpods"],
    apple: ["iphone", "ios", "macbook", "ipad", "airpods"],
    laptop: ["computer", "macbook", "notebook", "pc", "apple", "dell", "lenovo", "hp"],
    phone: ["iphone", "apple", "android", "samsung", "google", "pixel", "motorola", "mobile", "cell"],
    headphones: ["earbuds", "airpods", "beats", "sony", "bose"],
    groceries: ["grocery", "food", "meal", "fresh", "prep"],
    shoes: ["sneakers", "boots", "footwear", "nike", "adidas"],
  };

  const fields = [
    deal.partner,
    deal.title,
    deal.description,
    deal.category,
    deal.promo_code_online,
    deal.promo_code_instore,
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

  const exactPhraseMatch = fields.includes(query);
  const tokens = query.split(/\s+/).filter(Boolean);
  const expandedTokens = new Set(tokens);
  tokens.forEach((token) => {
    (intentAliases[token] || []).forEach((alias) => expandedTokens.add(alias));
  });

  let score = 0;
  if (exactPhraseMatch) {
    score += 12;
  }

  expandedTokens.forEach((token) => {
    if (fields.includes(token)) {
      score += token === query ? 8 : 3;
    }
  });

  return score;
}

export default function StudentCodes() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("all");
  const [search, setSearch] = useState("");
  const [intent, setIntent] = useState("");
  const [mode, setMode] = useState("all");
  const [spcPlusOnly, setSpcPlusOnly] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("best_match");
  const [allDeals, setAllDeals] = useState([]);
  const [recommendedDeals, setRecommendedDeals] = useState([]);
  const [trendingDeals, setTrendingDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    Promise.all([
      fetchJSON(`${API_BASE_URL}/student-codes/all/`),
      fetchJSON(`${API_BASE_URL}/student-codes/recommended/`),
      fetchJSON(`${API_BASE_URL}/student-codes/trending/`),
    ])
      .then(([all, recommended, trending]) => {
        if (!alive) return;
        setAllDeals(all.deals || []);
        setRecommendedDeals(recommended.deals || []);
        setTrendingDeals(trending.deals || []);
      })
      .catch((e) => {
        if (!alive) return;
        if (e?.status === 401 || e?.code === "SESSION_EXPIRED") {
          navigate("/login", { replace: true });
          return;
        }
        setError(e?.message || "Request failed");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [navigate]);

  const baseDeals = useMemo(() => {
    if (activeView === "recommended") return recommendedDeals;
    if (activeView === "trending") return trendingDeals;
    return allDeals;
  }, [activeView, allDeals, recommendedDeals, trendingDeals]);

  const categories = useMemo(() => {
    const values = new Set();
    allDeals.forEach((deal) => {
      const raw = String(deal.category || "").trim();
      if (!raw) return;
      raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((value) => {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return false;
          if (value.length < 3) return false;
          if (/student discounts?/i.test(value)) return false;
          if (/^[a-z0-9&' -]+$/i.test(value) && value.split(" ").length <= 2 && value === value.toLowerCase()) return false;
          return true;
        })
        .forEach((value) => values.add(value));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [allDeals]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = baseDeals
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
      .filter((d) => (sourceFilter === "all" ? true : d.source === sourceFilter))
      .filter((d) => {
        if (categoryFilter === "all") return true;
        return String(d.category || "")
          .split(",")
          .map((value) => value.trim())
          .includes(categoryFilter);
      })
      .filter((d) => {
        if (!query) return true;
        const blob = [d.partner, d.title, d.description, d.category, d.promo_code_online, d.promo_code_instore]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");
        return blob.includes(query);
      })
      .map((deal) => ({
        ...deal,
        intentScore: scoreIntent(deal, intent),
      }));

    const intentFiltered = intent.trim()
      ? filtered.filter((deal) => deal.intentScore >= 8)
      : filtered;

    if (intent.trim()) {
      intentFiltered.sort((a, b) => b.intentScore - a.intentScore || b.popularity_score - a.popularity_score);
    } else if (sortBy === "alphabetical") {
      intentFiltered.sort((a, b) => String(a.partner || "").localeCompare(String(b.partner || "")));
    } else if (sortBy === "trending") {
      intentFiltered.sort((a, b) => b.popularity_score - a.popularity_score);
    } else {
      intentFiltered.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0) || b.popularity_score - a.popularity_score);
    }

    return intent.trim() ? intentFiltered.slice(0, 10) : intentFiltered;
  }, [baseDeals, categoryFilter, intent, mode, search, sortBy, sourceFilter, spcPlusOnly]);

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

  const badgeLabelForDeal = (deal) => {
    if (activeView === "trending") return "Trending";
    if (activeView === "recommended") return "For you";
    if (deal.is_spc_plus) return "SPC+";
    return deal.source || "Code";
  };

  return (
    <div className="codes-page">
      <Navbar />

      <main className="codes-wrap">
        <section className="codes-hero">
          <h1 className="codes-title">Student Discount Codes</h1>
          <p className="codes-sub">Browse the full database, trending deals, or recommendations from your spending history.</p>
          <div className="codes-stats">
            <span className="stat-pill">{allDeals.length} total offers</span>
            <span className="stat-pill">{recommendedDeals.length} recommended</span>
            <span className="stat-pill">{trendingDeals.length} trending</span>
          </div>
        </section>

        <section className="controls">
          <div className="codes-field codes-field-wide">
            <label className="codes-label" htmlFor="codes-search">Search</label>
            <input
              id="codes-search"
              className="codes-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search partner, headline, category, or code"
            />
          </div>

          <div className="codes-field">
            <label className="codes-label" htmlFor="codes-view">View</label>
            <select id="codes-view" className="codes-select" value={activeView} onChange={(e) => setActiveView(e.target.value)}>
              <option value="all">All student codes</option>
              <option value="recommended">Recommended for you</option>
              <option value="trending">Trending now</option>
            </select>
          </div>

          <div className="codes-field">
            <label className="codes-label" htmlFor="codes-source">Source</label>
            <select id="codes-source" className="codes-select" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option value="all">All sources</option>
              <option value="spc">SPC</option>
              <option value="unidays">UNiDAYS</option>
              <option value="studentbeans">Student Beans</option>
            </select>
          </div>

          <div className="codes-field">
            <label className="codes-label" htmlFor="codes-category">Category</label>
            <select id="codes-category" className="codes-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="codes-field">
            <label className="codes-label" htmlFor="codes-mode">Channel</label>
            <select id="codes-mode" className="codes-select" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="all">All channels</option>
              <option value="online">Online only</option>
              <option value="instore">In-store only</option>
              <option value="both">Online + In-store</option>
            </select>
          </div>

          <div className="codes-field">
            <label className="codes-label" htmlFor="codes-membership">Membership</label>
            <select id="codes-membership" className="codes-select" value={spcPlusOnly} onChange={(e) => setSpcPlusOnly(e.target.value)}>
              <option value="all">All memberships</option>
              <option value="yes">SPC+ only</option>
              <option value="no">Non-SPC+ only</option>
            </select>
          </div>

          <div className="codes-field">
            <label className="codes-label" htmlFor="codes-sort">Sort</label>
            <select id="codes-sort" className="codes-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="best_match">Best match</option>
              <option value="trending">Trending order</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </section>

        <section className="controls codes-intentBar">
          <div className="codes-field">
            <label className="codes-label" htmlFor="codes-intent-custom">What are you looking to purchase next?</label>
            <input
              id="codes-intent-custom"
              className="codes-input"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="Example: laptop, headphones, groceries"
            />
          </div>
        </section>

        <div className="meta">
          Showing {visible.length} offers from the {activeView === "all" ? "full catalog" : activeView} view.
          {intent.trim() ? ` Prioritizing deals related to "${intent}".` : ""}
        </div>

        {loading && <div className="state">Loading deals...</div>}
        {!loading && error && <div className="state">{error}</div>}
        {!loading && !error && visible.length === 0 && <div className="state">No discount codes match your current filters.</div>}

        {!loading && !error && visible.length > 0 && (
          <section className="grid">
            {visible.map((d) => {
              const copyPayload = copyPayloadForDeal(d);

              return (
                <article
                  className="deal"
                  key={`${activeView}-${d.id}`}
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
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="fallback">{(d.partner || "S").slice(0, 1)}</div>
                    )}
                    <span className="badge">{badgeLabelForDeal(d)}</span>
                  </div>

                  <h2 className="headline">{d.partner || "Partner"}</h2>
                  <div className="mini">{d.title || d.category || "Deal"}</div>
                  <p className="mini2">{(d.description || "No description").slice(0, 80)}</p>

                  <div className="mini">
                    {d.online ? "Online" : ""}{d.online && d.in_store ? " + " : ""}{d.in_store ? "In-store" : ""}
                    {d.intentScore > 0 ? ` • ${d.intentScore} intent match` : ""}
                  </div>

                  <div className="deal-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className={`btn copyBtn ${copiedId === d.id ? "copied" : ""}`}
                      onClick={() => onCopy(d.id, copyPayload.value)}
                      disabled={!copyPayload.value}
                    >
                      <span className="copyText">{copiedId === d.id ? "Copied" : "Copy code"}</span>
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
