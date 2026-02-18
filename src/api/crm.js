// src/api/crm.js
"use strict";

/**
 * CRM API client (locked to working Catalyst public route)
 *
 * Facts from your screenshots/tests:
 * - onslate returns SPA/404 for relative paths like "clients?...": NOT OK
 * - catalystserverless base you provided is the real backend host
 * - Catalyst gateway rejects /server/crm_api/api/clients (INVALID_URL)
 * - So we use the non-/api route: /server/crm_api/clients
 *
 * This file forces the request to catalystserverless so we stop looping.
 */

const FALLBACK_BASE =
  "https://tabbytechdebitorder-913617844.development.catalystserverless.com/server/crm_api";

const RAW_BASE = (import.meta?.env?.VITE_CRM_API_BASE || "").trim();

// Accept either:
// - host-only: https://...catalystserverless.com
// - full base: https://...catalystserverless.com/server/crm_api
function normalizeBase(input) {
  const s = (input || "").trim().replace(/\/+$/, "");
  if (!s) return FALLBACK_BASE;

  // If someone sets host-only, append the known mount path.
  // We detect host-only by checking if pathname is empty or "/".
  try {
    const u = new URL(s);
    const path = (u.pathname || "").replace(/\/+$/, "");
    if (!path || path === "/") {
      return `${u.origin}/server/crm_api`;
    }
    return `${u.origin}${path}`;
  } catch {
    // Not a URL, fall back safely
    return FALLBACK_BASE;
  }
}

const BASE = normalizeBase(RAW_BASE);

function joinUrl(base, path) {
  const b = (base || "").replace(/\/+$/, "");
  const p = (path || "").startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function detectHtmlResponse(text, contentType) {
  const ct = (contentType || "").toLowerCase();
  const trimmed = (text || "").trim().toLowerCase();

  if (ct.includes("text/html")) return true;

  return (
    trimmed.startsWith("<!doctype html") ||
    trimmed.startsWith("<html") ||
    trimmed.includes("<head") ||
    trimmed.includes("<body")
  );
}

async function httpGetJson(url) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      // Keep headers SIMPLE to avoid preflight and reduce CORS friction
      Accept: "application/json",
    },
    credentials: "omit",
  });

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (detectHtmlResponse(text, contentType)) {
    throw new Error(`Unexpected HTML response. Wrong API path used: ${url}`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  // Catalyst sometimes returns 200 with {status:"failure"...}
  if (json && json.status === "failure") {
    const msg = json?.data?.message || json?.message || "Catalyst API failure";
    throw new Error(msg);
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json;
}

function mapApiItemToClient(item) {
  const safe = item || {};
  const raw = safe.raw || safe;

  const ownerName =
    raw?.Owner && typeof raw.Owner === "object" ? raw.Owner.name || "" : "";

  const debitStatus = safe.status || raw.Status || "Unknown";

  return {
    id: safe.id || raw.id || `ZOHO-${Math.random().toString(16).slice(2)}`,
    source: "zoho",

    zohoClientId: raw?.Client?.id || "",
    zohoDebitOrderId: safe.id || raw.id || "",

    name: safe.name || raw.Name || safe.clientName || "Client",
    primaryEmail: safe.email || raw.Email || "",
    secondaryEmail: safe.secondaryEmail || raw.Secondary_Email || "",
    emailOptOut: !!raw.Email_Opt_Out,

    owner: ownerName || "Ops",
    phone: raw.Phone || "",
    industry: raw.Industry || "",
    risk: raw.Risk || "Low",

    status:
      debitStatus === "Scheduled"
        ? "Active"
        : debitStatus === "Failed"
          ? "Risk"
          : "Active",

    debit: {
      billingCycle:
        safe.billingCycle ||
        raw.Billing_Cycle_25th_retry_1st ||
        raw.Billing_Cycle ||
        "",
      nextChargeDate: safe.nextChargeDate || raw.Next_Charge_Date || "",
      amountZar: Number(safe.amount ?? raw.Amount ?? 0),
      debitStatus: debitStatus,
      paystackCustomerCode: raw.Paystack_Customer_Code || "",
      paystackAuthorizationCode: raw.Paystack_Authorization_Code || "",
      booksInvoiceId: raw.Books_Invoice_ID || "",
      retryCount: raw.Retry_Count ?? 0,
      debitRunBatchId: raw.Debit_Run_Batch_ID || "",
      lastAttemptDate: safe.lastAttemptDate || raw.Last_Attempt_Date || "",
      lastTransactionReference:
        safe.lastTransactionReference || raw.Last_Transaction_Reference || "",
      failureReason: safe.failureReason || raw.Failure_Reason || "",
    },

    updatedAt:
      safe.updated ||
      raw.Modified_Time ||
      raw.Created_Time ||
      new Date().toISOString(),
    notes: raw.Notes || "",
  };
}

export async function fetchZohoClients({ page = 1, perPage = 50 } = {}) {
  const qs = `page=${encodeURIComponent(page)}&perPage=${encodeURIComponent(perPage)}`;

  // IMPORTANT: use /clients (not /api/clients) to avoid Catalyst INVALID_URL.
  const requestUrl = joinUrl(BASE, `/clients?${qs}`);

  const data = await httpGetJson(requestUrl);

  const items = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.clients)
      ? data.clients
      : Array.isArray(data.data)
        ? data.data
        : [];

  if (!Array.isArray(items)) {
    throw new Error(
      "API response did not include an array under items, clients, or data."
    );
  }

  return {
    ok: data.ok !== false,
    page: data.page || page,
    perPage: data.perPage || perPage,
    count: data.count ?? items.length,
    clients: items.map(mapApiItemToClient),
    raw: data,
    requestUrl,
  };
}
