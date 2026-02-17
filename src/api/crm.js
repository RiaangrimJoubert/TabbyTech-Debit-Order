// src/api/crm.js
"use strict";

/**
 * IMPORTANT:
 * If your frontend is hosted on a different domain than the Catalyst serverless app,
 * you must set VITE_CRM_API_BASE to the Catalyst serverless origin, for example:
 *
 * VITE_CRM_API_BASE=https://tabbytechdebitorder-913617844.development.catalystserverless.com
 *
 * Do NOT include a trailing slash.
 */
const API_BASE = String(import.meta?.env?.VITE_CRM_API_BASE || "").trim().replace(/\/+$/, "");

function buildUrl(path) {
  // path should start with "/"
  if (!path.startsWith("/")) path = "/" + path;

  // If API_BASE is set, we call cross-origin to the serverless host.
  // If not set, we fall back to same-origin.
  return API_BASE ? `${API_BASE}${path}` : path;
}

async function httpGetJson(url, { signal } = {}) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
    // If cross-origin is used, credentials usually do nothing unless server sets proper CORS.
    // Keeping include is safe for same-origin and future auth.
    credentials: "include",
  });

  const text = await res.text();

  // If the server returns HTML (like index.html), JSON.parse will fail.
  // We keep a small slice for debuggability.
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.url = url;
    err.payload = json;
    throw err;
  }

  return json;
}

function extractItems(data) {
  if (!data) return [];

  // Some APIs return array directly
  if (Array.isArray(data)) return data;

  // Expected backend shape: { ok, page, perPage, count, items: [...] }
  if (Array.isArray(data.items)) return data.items;

  // Other common shapes
  if (Array.isArray(data.clients)) return data.clients;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.records)) return data.records;

  // Nested wrappers
  if (data.result && typeof data.result === "object") {
    if (Array.isArray(data.result.items)) return data.result.items;
    if (Array.isArray(data.result.clients)) return data.result.clients;
    if (Array.isArray(data.result.data)) return data.result.data;
    if (Array.isArray(data.result.records)) return data.result.records;
  }

  return [];
}

function mapApiItemToClient(item) {
  // item is your backend normalized shape:
  // { id, clientName, name, status, billingCycle, nextChargeDate, amount, email, secondaryEmail, ... , raw }
  const safe = item || {};
  const raw = safe.raw || {};

  const ownerName = raw?.Owner && typeof raw.Owner === "object" ? raw.Owner.name || "" : "";
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

    // UI-friendly status
    status: debitStatus === "Scheduled" ? "Active" : debitStatus === "Failed" ? "Risk" : "Active",

    debit: {
      billingCycle: safe.billingCycle || raw.Billing_Cycle_25th_retry_1st || raw.Billing_Cycle || "",
      nextChargeDate: safe.nextChargeDate || raw.Next_Charge_Date || "",
      amountZar: Number(safe.amount ?? raw.Amount ?? 0),
      debitStatus: debitStatus,
      paystackCustomerCode: raw.Paystack_Customer_Code || "",
      paystackAuthorizationCode: raw.Paystack_Authorization_Code || "",
      booksInvoiceId: raw.Books_Invoice_ID || "",
      retryCount: raw.Retry_Count ?? 0,
      debitRunBatchId: raw.Debit_Run_Batch_ID || "",
      lastAttemptDate: safe.lastAttemptDate || raw.Last_Attempt_Date || "",
      lastTransactionReference: safe.lastTransactionReference || raw.Last_Transaction_Reference || "",
      failureReason: safe.failureReason || raw.Failure_Reason || "",
    },

    updatedAt: safe.updated || raw.Modified_Time || raw.Created_Time || new Date().toISOString(),
    notes: raw.Notes || "",
  };
}

export async function fetchZohoClients({ page = 1, perPage = 50, signal } = {}) {
  // Prefer the deployed route style that you confirmed is working
  const url = buildUrl(`/crm_api/api/clients?page=${encodeURIComponent(page)}&perPage=${encodeURIComponent(perPage)}`);
  const data = await httpGetJson(url, { signal });

  const items = extractItems(data);

  // If we got non-JSON (index.html), surface a professional error
  if (!items.length && data && typeof data === "object" && typeof data.raw === "string") {
    const rawText = data.raw.slice(0, 140).replace(/\s+/g, " ").trim();
    throw new Error(
      `Clients API returned non-JSON content. This usually means the frontend is calling the wrong host or a missing proxy route. First bytes: ${rawText}`
    );
  }

  return {
    page: data.page || page,
    perPage: data.perPage || perPage,
    count: data.count ?? items.length,
    clients: items.map(mapApiItemToClient),
    raw: data,
    meta: { usedUrl: url, apiBase: API_BASE || "same-origin" },
  };
}
