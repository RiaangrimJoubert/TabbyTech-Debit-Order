// src/api/crm.js
"use strict";

async function httpGetJson(url, { signal } = {}) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
    credentials: "include",
  });

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
    err.url = url;
    err.payload = json;
    throw err;
  }

  return json;
}

function extractItems(data) {
  if (!data) return [];

  // Some backends return the array directly
  if (Array.isArray(data)) return data;

  // Common shapes
  const keys = ["items", "clients", "data", "records"];
  for (const k of keys) {
    const v = data[k];
    if (Array.isArray(v)) return v;

    // Nested common patterns: { result: { items: [...] } } etc
    if (v && typeof v === "object") {
      if (Array.isArray(v.items)) return v.items;
      if (Array.isArray(v.clients)) return v.clients;
      if (Array.isArray(v.data)) return v.data;
      if (Array.isArray(v.records)) return v.records;
    }
  }

  // Sometimes wrapped under "result"
  if (data.result && typeof data.result === "object") {
    const r = data.result;
    if (Array.isArray(r.items)) return r.items;
    if (Array.isArray(r.clients)) return r.clients;
    if (Array.isArray(r.data)) return r.data;
    if (Array.isArray(r.records)) return r.records;
  }

  return [];
}

function mapApiItemToClient(item) {
  // Supports both:
  // 1) normalized: { id, name/clientName, status, billingCycle, nextChargeDate, amount, email, secondaryEmail, updated, raw }
  // 2) raw Zoho-like fields directly in the object
  const safe = item || {};
  const raw = safe.raw || safe || {};

  const ownerName =
    raw?.Owner && typeof raw.Owner === "object" ? raw.Owner.name || raw.Owner.full_name || "" : "";

  const debitStatus = safe.status || safe.debitStatus || raw.Status || raw.Debit_Status || "Unknown";

  return {
    id: safe.id || raw.id || `ZOHO-${Math.random().toString(16).slice(2)}`,
    source: (safe.source || "zoho").toLowerCase() === "manual" ? "manual" : "zoho",

    zohoClientId: safe.zohoClientId || raw?.Client?.id || raw.Client_ID || raw.ClientId || "",
    zohoDebitOrderId: safe.zohoDebitOrderId || safe.id || raw.id || "",

    name: safe.name || raw.Name || safe.clientName || raw.Client_Name || "Client",
    primaryEmail: safe.email || safe.primaryEmail || raw.Email || raw.Primary_Email || "",
    secondaryEmail: safe.secondaryEmail || raw.Secondary_Email || raw.SecondaryEmail || "",
    emailOptOut: !!(safe.emailOptOut ?? raw.Email_Opt_Out),

    owner: safe.owner || ownerName || "Ops",
    phone: safe.phone || raw.Phone || "",
    industry: safe.industry || raw.Industry || "",
    risk: safe.risk || raw.Risk || "Low",

    // UI-friendly status
    status: safe.uiStatus
      ? safe.uiStatus
      : debitStatus === "Scheduled"
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
      amountZar: Number(safe.amount ?? safe.amountZar ?? raw.Amount ?? 0),
      debitStatus: debitStatus,
      paystackCustomerCode: safe.paystackCustomerCode || raw.Paystack_Customer_Code || "",
      paystackAuthorizationCode: safe.paystackAuthorizationCode || raw.Paystack_Authorization_Code || "",
      booksInvoiceId: safe.booksInvoiceId || raw.Books_Invoice_ID || "",
      retryCount: safe.retryCount ?? raw.Retry_Count ?? 0,
      debitRunBatchId: safe.debitRunBatchId || raw.Debit_Run_Batch_ID || "",
      lastAttemptDate: safe.lastAttemptDate || raw.Last_Attempt_Date || "",
      lastTransactionReference: safe.lastTransactionReference || raw.Last_Transaction_Reference || "",
      failureReason: safe.failureReason || raw.Failure_Reason || "",
    },

    updatedAt: safe.updatedAt || safe.updated || raw.Modified_Time || raw.Created_Time || new Date().toISOString(),
    notes: safe.notes || raw.Notes || "",
  };
}

async function fetchClientsFromAnyEndpoint({ page, perPage, signal } = {}) {
  const candidates = [
    `/api/clients?page=${encodeURIComponent(page)}&perPage=${encodeURIComponent(perPage)}`,
    `/crm_api/api/clients?page=${encodeURIComponent(page)}&perPage=${encodeURIComponent(perPage)}`,
  ];

  let last = null;

  for (const url of candidates) {
    const data = await httpGetJson(url, { signal });
    last = { url, data };

    const items = extractItems(data);
    const mapped = items.map(mapApiItemToClient);

    // Return immediately if we got records
    if (mapped.length > 0) {
      return { url, data, items, mapped };
    }

    // If backend explicitly says count 0, do not continue guessing
    if (typeof data?.count === "number" && data.count === 0) {
      return { url, data, items: [], mapped: [] };
    }
  }

  // No records found in either endpoint
  return {
    url: last?.url || candidates[candidates.length - 1],
    data: last?.data || null,
    items: [],
    mapped: [],
  };
}

export async function fetchZohoClients({ page = 1, perPage = 50, signal } = {}) {
  const result = await fetchClientsFromAnyEndpoint({ page, perPage, signal });

  // Use best effort pagination metadata if present
  const data = result.data || {};
  const items = result.items || [];

  return {
    page: data.page || page,
    perPage: data.perPage || perPage,
    count: data.count ?? items.length,
    clients: result.mapped,
    raw: data,
    meta: { usedUrl: result.url },
  };
}
