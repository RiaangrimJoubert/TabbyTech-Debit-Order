// src/api/crm.js
"use strict";

/**
 * CRM API client (robust public URL detection)
 *
 * We are calling the backend on catalystserverless (cross-origin) because onslate rewrites API paths to SPA HTML.
 *
 * Problem observed:
 * - Calling /server/crm_api/api/clients returned:
 *   { status:"failure", data:{ message:"Invalid API ...", error_code:"INVALID_URL" } }
 *
 * This means the public route is different than we assumed.
 *
 * Fix:
 * - Accept VITE_CRM_API_BASE as either:
 *    a) host only: https://<app>.catalystserverless.com
 *    b) host + path: https://<app>.catalystserverless.com/server/crm_api/
 * - Try multiple candidate paths and use the first that returns JSON with an items array.
 */

const FALLBACK_BASE = "https://tabbytechdebitorder-913617844.development.catalystserverless.com";

const RAW_BASE = (import.meta?.env?.VITE_CRM_API_BASE || "").trim() || FALLBACK_BASE;
const BASE = RAW_BASE.replace(/\/+$/, ""); // remove trailing slashes

function joinUrl(base, path) {
  if (!path) return base || "";
  if (!base) return path.startsWith("/") ? path : `/${path}`;
  if (path.startsWith("/")) return `${base}${path}`;
  return `${base}/${path}`;
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

function looksLikeCatalystInvalidUrl(json) {
  const msg = json?.data?.message || json?.message || "";
  const code = json?.data?.error_code || json?.error_code || "";
  return (
    (code && String(code).toUpperCase() === "INVALID_URL") ||
    (typeof msg === "string" && msg.toLowerCase().includes("invalid api"))
  );
}

async function httpGetJson(url) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (detectHtmlResponse(text, contentType)) {
    const err = new Error(`Unexpected HTML response. Wrong API path used: ${url}`);
    err.code = "HTML_RESPONSE";
    err.url = url;
    throw err;
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.url = url;
    err.status = res.status;
    throw err;
  }

  // Some Catalyst layers return 200 with an "INVALID_URL" payload.
  if (looksLikeCatalystInvalidUrl(json)) {
    const err = new Error(`Invalid public API route at: ${url}`);
    err.code = "INVALID_URL";
    err.url = url;
    throw err;
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

function extractOriginAndMaybeBasePath(fullBase) {
  // Accept:
  //  - https://host
  //  - https://host/server/crm_api
  //  - https://host/server/crm_api/
  // Return:
  //  { origin: "https://host", basePath: "/server/crm_api" | "" }
  try {
    const u = new URL(fullBase);
    const origin = u.origin;
    const p = (u.pathname || "").replace(/\/+$/, "");
    const basePath = p && p !== "/" ? p : "";
    return { origin, basePath };
  } catch {
    // If it's not a valid URL, treat it as origin-less (should not happen in prod)
    return { origin: fullBase.replace(/\/+$/, ""), basePath: "" };
  }
}

async function fetchFirstWorkingJson(urls) {
  const errors = [];
  for (const u of urls) {
    try {
      const data = await httpGetJson(u);
      // Ensure it actually looks like our API payload
      const items = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.clients)
          ? data.clients
          : Array.isArray(data.data)
            ? data.data
            : null;

      if (Array.isArray(items)) {
        return { data, requestUrl: u };
      }

      errors.push(`No items array at: ${u}`);
    } catch (e) {
      errors.push(`${u} -> ${e?.message || String(e)}`);
    }
  }

  const err = new Error(`All CRM API URL candidates failed. ${errors.join(" | ")}`);
  err.code = "ALL_CANDIDATES_FAILED";
  throw err;
}

export async function fetchZohoClients({ page = 1, perPage = 50 } = {}) {
  const qs = `page=${encodeURIComponent(page)}&perPage=${encodeURIComponent(perPage)}`;
  const { origin, basePath } = extractOriginAndMaybeBasePath(BASE);

  // Candidate construction rules:
  // If BASE already contains "/server/crm_api", append "/api/clients"
  // Otherwise try standard mounts from the origin.
  const candidates = [];

  if (basePath) {
    candidates.push(joinUrl(origin + basePath, `/api/clients?${qs}`));
  }

  // Common function mount patterns
  candidates.push(joinUrl(origin, `/server/crm_api/api/clients?${qs}`));
  candidates.push(joinUrl(origin, `/crm_api/api/clients?${qs}`));

  // If someone mounted the express app directly
  candidates.push(joinUrl(origin, `/api/clients?${qs}`));

  const { data, requestUrl } = await fetchFirstWorkingJson(candidates);

  const items = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.clients)
      ? data.clients
      : Array.isArray(data.data)
        ? data.data
        : [];

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
