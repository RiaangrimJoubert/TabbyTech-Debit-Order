// src/lib/invoicesApi.js
import { getApiBaseUrl } from "./apiBase";

function mustGetBase() {
  const base = getApiBaseUrl();
  if (!base) throw new Error("Missing VITE_API_BASE_URL");
  return base;
}

export async function fetchInvoices({ page = 1, perPage = 50, status = "", search = "" } = {}) {
  const base = mustGetBase();

  // Your API currently returns:
  // { ok:true, page, perPage, count, data:[{ id, invoiceNumber, reference, customerName, status, date, dueDate, total, balance, currencyCode }] }
  // If your backend ignores query params, this still works. We filter client side as backup.
  const url = new URL(`${base}/api/invoices`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("perPage", String(perPage));
  if (status) url.searchParams.set("status", status);
  if (search) url.searchParams.set("search", search);

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  const text = await resp.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!resp.ok || json?.ok !== true) {
    const msg = json?.error || json?.message || `Invoices request failed ${resp.status}`;
    throw new Error(msg);
  }

  const rows = Array.isArray(json.data) ? json.data : [];

  // Client-side filtering fallback (in case API does not filter)
  const s = String(search || "").trim().toLowerCase();
  const filtered = rows.filter((r) => {
    const matchesStatus = !status ? true : String(r.status || "").toLowerCase() === String(status).toLowerCase();
    if (!matchesStatus) return false;

    if (!s) return true;
    const hay = [
      r.invoiceNumber,
      r.reference,
      r.customerName,
      r.status,
      r.id,
    ]
      .map((x) => String(x || "").toLowerCase())
      .join(" ");
    return hay.includes(s);
  });

  return {
    page: Number(json.page || 1),
    perPage: Number(json.perPage || 50),
    count: Number(json.count || filtered.length || 0),
    data: filtered,
  };
}

export function invoiceHtmlUrl(invoiceId) {
  const base = mustGetBase();
  return `${base}/api/invoice-html/${encodeURIComponent(String(invoiceId || "").trim())}`;
}

export function invoicePdfUrl(invoiceId) {
  const base = mustGetBase();
  return `${base}/api/invoice-pdf/${encodeURIComponent(String(invoiceId || "").trim())}`;
}
