// src/api/crm.js
"use strict";

/**
 * TabbyTech CRM API client
 *
 * Correct public endpoint (confirmed working):
 *   https://tabbytechdebitorder-913617844.development.catalystserverless.com/crm_api/api/clients?page=1&perPage=200
 *
 * Key requirements:
 * - Always call CRM API via the Catalyst serverless host (NOT onslate same-origin paths)
 * - Parse response.items (array)
 * - Keep request headers simple to avoid unnecessary preflight/CORS noise
 */

const FALLBACK_HOST =
  "https://tabbytechdebitorder-913617844.development.catalystserverless.com";

const RAW_BASE = (import.meta?.env?.VITE_CRM_API_BASE || "").trim();

/**
 * Normalize to an origin host only.
 * If someone mistakenly provides a full path (like /server/crm_api), we strip it.
 */
function normalizeHost(input) {
  const s = (input || "").trim().replace(/\/+$/, "");
  if (!s) return FALLBACK_HOST;

  try {
    const u = new URL(s);
    return u.origin;
  } catch {
    return FALLBACK_HOST;
  }
}

const HOST = normalizeHost(RAW_BASE);

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

  // Catalyst sometimes returns 200 with a failure payload
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

    // Your record status is "Scheduled" and UI expects "Active" / "Risk" / "Paused" / "New"
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
  const qs = `page=${encodeURIComponent(page)}&perPage=${encodeURIComponent(
    perPage
  )}`;

  // Confirmed correct gateway path
  const requestUrl = joinUrl(HOST, `/crm_api/api/clients?${qs}`);

  const data = await httpGetJson(requestUrl);

  // Backend response structure: { ok, page, perPage, count, items: [...] }
  const items = Array.isArray(data.items) ? data.items : [];

  if (!Array.isArray(items)) {
    throw new Error("API response did not include items array.");
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
