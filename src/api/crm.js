// src/api/crm.js
"use strict";

/**
 * CRM API routing rules (same-origin only)
 *
 * We want to avoid CORS completely, so we never use an absolute URL here.
 *
 * Preferred route (your stated intent):
 *   /crm_api/api/clients
 *
 * Catalyst commonly exposes functions behind:
 *   /server/crm_api/api/clients
 *
 * Problem observed in your UI: /crm_api/... returns HTML (SPA), not JSON.
 * Fix: Try /crm_api/... first, and if we detect HTML, fall back to /server/crm_api/...
 */

// Only allow a RELATIVE base if provided (example: "/crm_api"). Ignore any absolute URL to prevent CORS.
const RAW_BASE = (import.meta?.env?.VITE_CRM_API_BASE || "").trim();
const SAFE_RELATIVE_BASE =
  RAW_BASE.startsWith("/") && !RAW_BASE.startsWith("//")
    ? RAW_BASE.replace(/\/+$/, "")
    : "";

// If env is empty or invalid, we use "" (same-origin absolute path when joined).
const CRM_BASE = SAFE_RELATIVE_BASE || "";

/**
 * Join base + path without double slashes.
 * If base is empty, returns an absolute path like "/crm_api/api/clients..."
 */
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

async function httpGetJson(url) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
    credentials: "same-origin",
  });

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  const isHtml = detectHtmlResponse(text, contentType);
  if (isHtml) {
    const err = new Error(`Unexpected HTML response. Wrong API path used: ${url}`);
    err.code = "HTML_RESPONSE";
    err.url = url;
    err.status = res.status;
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

  return { json, url };
}

/**
 * Try the preferred route first, then fall back to Catalyst's /server/ route if needed.
 */
async function httpGetJsonWithFallback(primaryUrl, fallbackUrl) {
  try {
    return await httpGetJson(primaryUrl);
  } catch (e) {
    if (e && e.code === "HTML_RESPONSE" && fallbackUrl) {
      return await httpGetJson(fallbackUrl);
    }
    throw e;
  }
}

function mapApiItemToClient(item) {
  const safe = item || {};
  const raw = safe.raw || safe; // allow backend to return either {raw:{...}} or a flat record

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

  // Preferred route (as you requested)
  const preferredPath = `/crm_api/api/clients?${qs}`;

  // Catalyst common route (your backend logs show /server/crm_api/api/clients returning 200)
  const catalystPath = `/server/crm_api/api/clients?${qs}`;

  // Apply optional RELATIVE base (if you set VITE_CRM_API_BASE="/crm_api", preferred becomes "/crm_api/crm_api/.."
  // so we only apply CRM_BASE when it makes sense (and never for /server).
  const preferredUrl = CRM_BASE ? joinUrl(CRM_BASE, preferredPath) : preferredPath;
  const fallbackUrl = catalystPath;

  const { json: data, url: requestUrl } = await httpGetJsonWithFallback(preferredUrl, fallbackUrl);

  // Backend returns: { ok, page, perPage, count, items: [...] }
  const items = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.clients)
      ? data.clients
      : Array.isArray(data.data)
        ? data.data
        : [];

  if (!Array.isArray(items)) {
    throw new Error(
      "API response did not include an array under items, clients, or data. Inspect the Network response JSON keys."
    );
  }

  return {
    ok: data.ok !== false, // treat missing ok as success
    page: data.page || page,
    perPage: data.perPage || perPage,
    count: data.count ?? items.length,
    clients: items.map(mapApiItemToClient),
    raw: data,
    requestUrl,
  };
}
