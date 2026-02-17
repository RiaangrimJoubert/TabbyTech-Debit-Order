const CRM_API_BASE =
  "https://tabbytechdebitorder-913617844.development.catalystserverless.com/crm_api";

export async function fetchClients({ page = 1, perPage = 10 } = {}) {
  const url = `${CRM_API_BASE}/api/clients?page=${page}&perPage=${perPage}`;
  const res = await fetch(url);

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(text);
  }

  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }

  return json; // { ok, items, ... }
}
