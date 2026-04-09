export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const TOKEN_KEY = "userToken"; // legacy (access token)
const ACCESS_TOKEN_KEY = "userAccessToken";
const REFRESH_TOKEN_KEY = "userRefreshToken";
const ONBOARDING_KEY = "onboardingComplete";
const PROFILE_KEY = "userProfile";

const DEFAULT_PROFILE = {
  faculty: "",
  major: "",
  year: 1,
  degree_type: "Undergrad",
  citizenship: "Domestic",
  campus: "St.George",
  total_earnings: 0,
  total_expenses: 0,
  parental_support: 0,
  scholarship_aid_amount: 0,
  receives_scholarships_or_aid: false,
  estimated_annual_school_cost: null,
  net_annual_cost_after_aid: null,
  gpa: null,
  resume_summary: "",
};

export function getToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (!token) return;
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function setTokens({ access, refresh } = {}) {
  if (access) setToken(access);
  if (refresh) sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function isOnboardingComplete() {
  return sessionStorage.getItem(ONBOARDING_KEY) === "true";
}

export function setOnboardingComplete(value) {
  sessionStorage.setItem(ONBOARDING_KEY, value ? "true" : "false");
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ONBOARDING_KEY);
}

export function authHeaders(token = getToken()) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function refreshAccessToken() {
  const refresh = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refresh) return null;

  const res = await fetch(`${API_BASE_URL}/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.access) return null;

  setToken(data.access);
  return data.access;
}

export async function fetchWithAuth(url, options = {}, accessTokenOverride) {
  const token = accessTokenOverride || getToken();
  const doFetch = (accessToken) =>
    fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...authHeaders(accessToken),
      },
    });

  if (!token) return doFetch(null);

  let res = await doFetch(token);
  if (res.status !== 401) return res;

  const newToken = await refreshAccessToken();
  if (!newToken) return res;

  return doFetch(newToken);
}

export function profileToScholarshipProfile(profile = {}) {
  let existing = DEFAULT_PROFILE;
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) existing = { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  const deg = profile.degree_type || existing.degree_type || DEFAULT_PROFILE.degree_type;
  const student_level =
    profile.student_level || (deg === "Postgrad" ? "grad" : "undergrad");

  return {
    ...DEFAULT_PROFILE,
    ...existing,
    faculty: profile.faculty || existing.faculty || DEFAULT_PROFILE.faculty,
    major: profile.major || existing.major || DEFAULT_PROFILE.major,
    year: profile.year ?? existing.year ?? DEFAULT_PROFILE.year,
    degree_type: deg,
    citizenship: profile.citizenship_status || existing.citizenship || DEFAULT_PROFILE.citizenship,
    campus: profile.campus || existing.campus || DEFAULT_PROFILE.campus,
    total_earnings: profile.total_earnings ?? existing.total_earnings ?? DEFAULT_PROFILE.total_earnings,
    total_expenses: profile.total_expenses ?? existing.total_expenses ?? DEFAULT_PROFILE.total_expenses,
    parental_support: profile.parental_support ?? existing.parental_support ?? DEFAULT_PROFILE.parental_support,
    scholarship_aid_amount:
      profile.scholarship_aid_amount ?? existing.scholarship_aid_amount ?? DEFAULT_PROFILE.scholarship_aid_amount,
    receives_scholarships_or_aid:
      profile.receives_scholarships_or_aid ?? existing.receives_scholarships_or_aid ?? DEFAULT_PROFILE.receives_scholarships_or_aid,
    estimated_annual_school_cost:
      profile.estimated_annual_school_cost ?? existing.estimated_annual_school_cost ?? DEFAULT_PROFILE.estimated_annual_school_cost,
    net_annual_cost_after_aid:
      profile.net_annual_cost_after_aid ?? existing.net_annual_cost_after_aid ?? DEFAULT_PROFILE.net_annual_cost_after_aid,
    gpa: profile.gpa ?? existing.gpa ?? DEFAULT_PROFILE.gpa,
    resume_summary: profile.resume_summary ?? existing.resume_summary ?? DEFAULT_PROFILE.resume_summary,
    student_level,
  };
}

export function hydrateProfile(profile = {}) {
  setOnboardingComplete(Boolean(profile.onboarding_completed));
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profileToScholarshipProfile(profile)));
}

export async function hydrateSessionFromTokens({ access, refresh } = {}) {
  setTokens({ access, refresh });
  setOnboardingComplete(false);

  let destination = "/onboarding";
  try {
    const profile = await fetchProfile(access);
    setOnboardingComplete(Boolean(profile.onboarding_completed));
    destination = profile.onboarding_completed ? "/home" : "/onboarding";
  } catch {
    // Keep successful auth moving even if profile hydration fails.
  }

  return destination;
}

async function readResponseBody(res) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractApiMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const firstKey = Object.keys(data)[0];
    if (!firstKey) return fallback;
    const value = data[firstKey];
    return Array.isArray(value) ? value[0] : value;
  }
  return fallback;
}

export async function fetchProfile(token = getToken()) {
  const res = await fetchWithAuth(`${API_BASE_URL}/profile/`, {
    headers: { "Content-Type": "application/json" },
  }, token);

  if (res.status === 401) {
    clearSession();
    throw new Error("Session expired. Please log in again.");
  }

  const data = await readResponseBody(res);

  if (!res.ok) {
    throw new Error(extractApiMessage(data, "Unable to load your profile."));
  }

  if (!data || typeof data !== "object") {
    throw new Error("Unable to load your profile.");
  }

  hydrateProfile(data);
  return data;
}

export async function saveProfile(payload, token = getToken()) {
  const res = await fetchWithAuth(`${API_BASE_URL}/profile/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, token);

  if (res.status === 401) {
    clearSession();
    throw new Error("Session expired. Please log in again.");
  }

  const data = await readResponseBody(res);
  if (!res.ok) {
    throw new Error(extractApiMessage(data, "Unable to save your onboarding details."));
  }

  if (!data || typeof data !== "object") {
    throw new Error("Unable to save your onboarding details.");
  }

  hydrateProfile(data);
  return data;
}
