// src/lib/apiBase.js
export function getApiBaseUrl() {
  const base = (import.meta.env.VITE_API_BASE_URL || "").trim();
  return base.replace(/\/+$/, ""); // remove trailing slash
}
