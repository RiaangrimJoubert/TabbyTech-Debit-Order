// src/api/index.js

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || ""; 
// If empty, it will call relative paths (same domain).

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

  if (!resp.ok) {
    const msg = json?.error || json?.message || `Request failed (${resp.status})`;
    throw new Error(msg);
  }

  return json;
}

export { API_BASE, request };
