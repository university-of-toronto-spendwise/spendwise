export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const TOKEN_KEY = "userToken";
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
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function isOnboardingComplete() {
  return sessionStorage.getItem(ONBOARDING_KEY) === "true";
}

export function setOnboardingComplete(value) {
  sessionStorage.setItem(ONBOARDING_KEY, value ? "true" : "false");
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ONBOARDING_KEY);
}

export function authHeaders(token = getToken()) {
  return token ? { Authorization: `Bearer ${token}` } : {};
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
  const res = await fetch(`${API_BASE_URL}/profile/`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
  });

  if (!res.ok) {
    throw new Error("Unable to load your profile.");
  }

  const data = await res.json();
  hydrateProfile(data);
  return data;
}

export async function saveProfile(payload, token = getToken()) {
  const res = await fetch(`${API_BASE_URL}/profile/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

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
