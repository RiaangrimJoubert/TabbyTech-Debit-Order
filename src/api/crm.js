// src/api/crm.js
"use strict";

/**
 * Robust API URL builder for Catalyst + Vite.
 *
 * - If VITE_CRM_API_BASE is set at build time, we call the API as an absolute URL:
 *     ${VITE_CRM_API_BASE}/crm_api/api/clients
 *
 * - Otherwise we fall back to same-origin absolute path:
 *     /crm_api/api/clients
 *
 * This avoids SPA route fallbacks returning index.html.
 */

function getApiBase() {
  // Vite injects VITE_* at build time. If not injected, this will be undefined.
  try {
    const v = import.meta?.env?.VITE_CRM_API_BASE;
    if (v && typeof v === "string" && v.trim()) return v.trim();
  } catch {
    // ignore
  }
  return "";
}

function joinUrl(base, path) {
  const b = (base || "").trim();
  const p = (path || "").trim();

  if (!b) return p.startsWith("/") ? p : `/${p}`;

  const b2 = b.endsWith("/") ? b.slice(0, -1) : b;
  const p2 = p.startsWith("/") ? p : `/${p}`;
  return `${b2}${p2}`;
}

async function httpGetJson(url) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();

  // SPA fallback returns HTML (index.html). Detect deterministically.
  const looksLikeHtml = contentType.includes("text/html") || /^\s*</.test(text);
  if (looksLikeHtml) {
    const err = new Error(
      `Unexpected HTML response. API call resolved to HTML (likely routed to frontend). URL: ${url}`
    );
    err.name = "UnexpectedHtmlResponse";
    err.url = url;
    err.contentType = contentType;
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

function mapApiItemToClient(item) {
  // item is your backend normalized shape:
  // { id, clientName, name, status, billingCycle, nextChargeDate, amount, email, secondaryEmail, ... }
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

    // Derive UI status from debit status
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

export async function fetchZohoClients({ page = 1, perPage = 50 } = {}) {
  const base = getApiBase();

  // Always call the gateway route
  const path = `/crm_api/api/clients?page=${encodeURIComponent(
    page
  )}&perPage=${encodeURIComponent(perPage)}`;

  const url = joinUrl(base, path);

  const data = await httpGetJson(url);

  const items = Array.isArray(data.items) ? data.items : [];

  return {
    ok: data.ok !== false,
    page: data.page || page,
    perPage: data.perPage || perPage,
    count: data.count ?? items.length,
    clients: items.map(mapApiItemToClient),
    raw: data,
    requestUrl: url,
    usingBase: !!base,
  };
}
