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

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const resp = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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

  // If you ever see HTML here, your base URL is pointing to the wrong host.
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

export { API_BASE, request };
