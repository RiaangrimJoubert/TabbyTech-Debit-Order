// src/api/crm.js
"use strict";

/**
 * TabbyTech CRM API client (same-origin only)
 *
 * We will NOT use any absolute base URL here to avoid CORS.
 * We also will NOT prepend VITE_CRM_API_BASE to these routes, because it can cause
 * doubled paths like "/crm_api/crm_api/api/clients" which returns the SPA HTML.
 *
 * Strategy:
 * 1) Try the intended proxy route:  /crm_api/api/clients
 * 2) If we receive HTML (SPA), fall back to Catalyst route: /server/crm_api/api/clients
 */

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

  if (detectHtmlResponse(text, contentType)) {
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

  // Do NOT prepend any base. These are absolute same-origin paths by design.
  const preferredUrl = `/crm_api/api/clients?${qs}`;
  const fallbackUrl = `/server/crm_api/api/clients?${qs}`;

  const { json: data, url: requestUrl } = await httpGetJsonWithFallback(
    preferredUrl,
    fallbackUrl
  );

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
    ok: data.ok !== false,
    page: data.page || page,
    perPage: data.perPage || perPage,
    count: data.count ?? items.length,
    clients: items.map(mapApiItemToClient),
    raw: data,
    requestUrl,
  };
}
