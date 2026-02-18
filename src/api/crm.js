// src/api/crm.js
"use strict";

/**
 * CRM API base
 * Goal: ALWAYS call same-origin from the onslate domain to avoid CORS.
 *
 * - Default base is "" which makes requests go to /crm_api/... on the current host.
 * - Only allow VITE_CRM_API_BASE if it is a RELATIVE base that starts with "/"
 *   (example: "/crm_api"). Any absolute URL will be ignored to prevent CORS issues.
 */
const RAW_BASE = (import.meta?.env?.VITE_CRM_API_BASE || "").trim();

// Allow only relative bases like "/crm_api" or "/crm_api/v1"
const SAFE_RELATIVE_BASE =
  RAW_BASE.startsWith("/") && !RAW_BASE.startsWith("//")
    ? RAW_BASE.replace(/\/+$/, "")
    : "";

// If someone set an absolute URL by mistake, we force same-origin anyway.
const CRM_BASE = SAFE_RELATIVE_BASE || "";

/**
 * Joins a base + path safely without double slashes.
 * - If base is empty, returns an absolute path like "/crm_api/api/clients..."
 */
function joinUrl(base, path) {
  if (!path) return base || "";
  if (!base) return path.startsWith("/") ? path : `/${path}`;
  if (path.startsWith("/")) return `${base}${path}`;
  return `${base}/${path}`;
}

async function httpGetJson(pathOrUrl) {
  const res = await fetch(pathOrUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
    credentials: "same-origin",
  });

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();

  // Detect common SPA/index.html fallbacks or wrong routes
  const trimmed = (text || "").trim();
  const looksHtml =
    contentType.includes("text/html") ||
    trimmed.toLowerCase().startsWith("<!doctype html") ||
    trimmed.toLowerCase().startsWith("<html") ||
    trimmed.toLowerCase().includes("<head") ||
    trimmed.toLowerCase().includes("<body");

  if (looksHtml) {
    throw new Error(
      `Unexpected HTML response. Wrong API path used: ${pathOrUrl}`
    );
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json;
}

function mapApiItemToClient(item) {
  const safe = item || {};
  const raw = safe.raw || safe; // allow backend to return either {raw:{...}} or a flat CRM record

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
  const path = `/crm_api/api/clients?page=${encodeURIComponent(page)}&perPage=${encodeURIComponent(perPage)}`;
  const url = joinUrl(CRM_BASE, path);

  const data = await httpGetJson(url);

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
    page: data.page || page,
    perPage: data.perPage || perPage,
    count: data.count ?? items.length,
    clients: items.map(mapApiItemToClient),
    raw: data,
  };
}
