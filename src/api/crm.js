/**
 * src/api/crm.js
 * API utility for fetching and mapping Zoho CRM client data.
 */

"use strict";

/**
 * Determines the API base URL.
 * Falls back to window.location.origin if VITE_CRM_API_BASE is empty,
 * which is ideal for same-origin Zoho Catalyst deployments.
 */
function getApiBase() {
  const raw = (import.meta?.env?.VITE_CRM_API_BASE || "").trim();
  if (!raw) return window.location.origin; 
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

/**
 * Safely joins a base URL and a path, ensuring no double slashes.
 */
function joinUrl(base, path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Core HTTP client with specific handling for SPA "HTML Fallback" errors.
 */
async function httpGetJson(url) {
  const res = await fetch(url, {
    method: "GET",
    headers: { 
      "Accept": "application/json",
      "Cache-Control": "no-store" 
    },
  });

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();

  // Safeguard: SPAs often return index.html when a backend route is missing (404 fallback).
  // This detects that "Unexpected HTML response" error.
  const looksLikeHtml = contentType.includes("text/html") || /^\s*</.test(text);
  
  if (looksLikeHtml) {
    const err = new Error(
      "Unexpected HTML response. The frontend likely hit a non-existent API route and fell back to index.html."
    );
    err.name = "UnexpectedHtmlResponse";
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
    err.name = "HttpError";
    err.status = res.status;
    err.url = url;
    throw err;
  }

  return json;
}

/**
 * Transforms raw Zoho API items into a consistent, UI-friendly Client object.
 * Maps custom Zoho fields (e.g., Billing_Cycle_25th) to predictable keys.
 */
function mapApiItemToClient(item) {
  const safe = item || {};
  const raw = safe.raw || {};

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
      debitStatus,
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

/**
 * Fetches clients from the Catalyst CRM API.
 * Default path: /crm_api/api/clients
 */
export async function fetchZohoClients({ page = 1, perPage = 50 } = {}) {
  const base = getApiBase();

  // Construct absolute API path with query params
  const path = `/crm_api/api/clients?page=${encodeURIComponent(
    page
  )}&perPage=${encodeURIComponent(perPage)}`;

  const url = joinUrl(base, path);
  
  try {
    const data = await httpGetJson(url);

    // Expects backend to return: { ok: boolean, items: Array, count: number }
    const items = Array.isArray(data.items) ? data.items : [];

    return {
      ok: data.ok !== false,
      page: data.page || page,
      perPage: data.perPage || perPage,
      count: data.count ?? items.length,
      clients: items.map(mapApiItemToClient),
      raw: data,
      requestUrl: url,
    };
  } catch (error) {
    console.error(`[CRM API Error] ${error.name}: ${error.message}`, { url });
    throw error;
  }
}
