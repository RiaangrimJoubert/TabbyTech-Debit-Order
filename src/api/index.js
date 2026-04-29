// src/api/index.js
"use strict";

/**
 * Default API base for request()
 * - If VITE_API_BASE_URL is empty, uses same-origin relative paths.
 * - Always strips trailing slashes.
 */
function normalizeBase(v) {
  const s = (v || "").trim();
  return s ? s.replace(/\/+$/, "") : "";
}

const API_BASE = normalizeBase(import.meta.env.VITE_API_BASE_URL);

function getAuthHeaders() {
  const headers = {};
  try {
    const raw = localStorage.getItem("tt_user");
    if (raw) {
      const u = JSON.parse(raw);
      if (u.role) headers["X-Tabby-Role"] = u.role;
      if (u.tenantId) headers["X-Tabby-Tenant-Id"] = u.tenantId;
    }
  } catch (e) {
    // ignore
  }
  return headers;
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const authHeaders = getAuthHeaders();

  const resp = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options.headers || {}),
    },
  });

  const text = await resp.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (json && typeof json.raw === "string") {
    const t = json.raw.trim().toLowerCase();
    if (t.startsWith("<!doctype html") || t.startsWith("<html")) {
      throw new Error(`Unexpected HTML response. Check VITE_API_BASE_URL. URL: ${url}`);
    }
  }

  if (!resp.ok) {
    const msg = json?.error || json?.message || `Request failed (${resp.status})`;
    throw new Error(msg);
  }

  return json;
}

async function requestBlob(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const authHeaders = getAuthHeaders();

  const resp = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers || {}),
    },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    let msg = `Request failed (${resp.status})`;
    try {
      const j = JSON.parse(text);
      msg = j.error || j.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return resp.blob();
}

export { API_BASE, request, requestBlob, getAuthHeaders };
