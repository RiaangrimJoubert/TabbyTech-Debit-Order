// src/api/crm.js
"use strict";

/**
 * Vite build-time env (Slate):
 * VITE_CRM_API_BASE=https://tabbytechdebitorder-913617844.development.catalystserverless.com
 */
const API_BASE = String(import.meta?.env?.VITE_CRM_API_BASE || "")
  .trim()
  .replace(/\/+$/, "");

function buildUrl(path) {
  if (!path.startsWith("/")) path = "/" + path;
  return API_BASE ? `${API_BASE}${path}` : path;
}

async function httpGetJson(url, { signal } = {}) {
  // Add a cache-buster to avoid 304 + empty body issues on some edge proxies
  const u = new URL(url, window.location.origin);
  u.searchParams.set("_ts", String(Date.now()));

  const res = await fetch(u.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
    signal,
    cache: "no-store",
    credentials: "include",
  });

  // If a proxy returns 304, we treat it as a hard error for API JSON reads.
  // 304 frequently has no body, which breaks JSON parsing.
  if (res.status === 304) {
    const err = new Error("Clients API returned 304 (Not Modified). API responses must not be cached.");
    err.status = 304;
    err.url = u.toString();
    throw err;
  }

  const text = await res.text();
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
    err.url = u.toString();
    err.payload = json;
    throw err;
  }

  return json;
}

function extractItems(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.clients)) return data.clients;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.records)) return data.records;
  if (data.result && typeof data.result === "object") {
    if (Array.isArray(data.result.items)) return data.result.items;
    if (Array.isArray(data.result.clients)) return data.result.clients;
    if (Array.isArray(data.result.data)) return data.result.data;
    if (Array.isArray(data.result.records)) return data.result.records;
  }
  return [];
}

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
      safe.updated || raw.Modified_Time || raw.Created_Time || new Date().toISOString(),
    notes: raw.Notes || "",
  };
}

export async function fetchZohoClients({ page = 1, perPage = 50, signal } = {}) {
  const url = buildUrl(
    `/crm_api/api/clients?page=${encodeURIComponent(page)}&perPage=${encodeURIComponent(perPage)}`
  );

  const data = await httpGetJson(url, { signal });

  const items = extractItems(data);

  if (!items.length) {
    // Give a clean, useful error if backend returned ok but nothing usable
    const keys = data && typeof data === "object" ? Object.keys(data).join(", ") : "n/a";
    throw new Error(
      `Clients API returned no items array. Keys received: ${keys}`
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
