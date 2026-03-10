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

async function fetchWithAuth(url, options = {}, accessTokenOverride) {
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
  return {
    ...DEFAULT_PROFILE,
    degree_type: profile.degree_type || DEFAULT_PROFILE.degree_type,
    citizenship: profile.citizenship_status || DEFAULT_PROFILE.citizenship,
    campus: profile.campus || DEFAULT_PROFILE.campus,
  };
}

export function hydrateProfile(profile = {}) {
  setOnboardingComplete(Boolean(profile.onboarding_completed));
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profileToScholarshipProfile(profile)));
}

export async function fetchProfile(token = getToken()) {
  const res = await fetchWithAuth(`${API_BASE_URL}/profile/`, {
    headers: { "Content-Type": "application/json" },
  }, token);

  if (res.status === 401) {
    clearSession();
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    throw new Error("Unable to load your profile.");
  }

  const data = await res.json();
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

  const data = await res.json();
  if (!res.ok) {
    const firstKey = typeof data === "object" ? Object.keys(data)[0] : null;
    const message = firstKey
      ? Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey]
      : "Unable to save your onboarding details.";
    throw new Error(message);
  }

  hydrateProfile(data);
  return data;
}
