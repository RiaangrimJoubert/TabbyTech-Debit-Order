// src/api/crm.js
"use strict";

/**
 * CRM API base resolution
 * - If VITE_CRM_API_BASE is set, use it (supports absolute Catalyst domain)
 * - Otherwise fall back to same-origin relative calls
 *
 * Expected working endpoint:
 *   <BASE>/crm_api/api/clients
 *
 * Notes:
 * - BASE should be like:
 *   https://tabbytechdebitorder-913617844.development.catalystserverless.com
 *   (no trailing slash required)
 */
function resolveBase() {
  const envBase = (import.meta?.env?.VITE_CRM_API_BASE || "").trim();
  if (!envBase) return "";
  return envBase.replace(/\/+$/, "");
}

function buildUrl(pathWithLeadingSlash) {
  const base = resolveBase();
  if (!base) return pathWithLeadingSlash;
  return `${base}${pathWithLeadingSlash}`;
}

async function httpGetJson(url) {
  // Prevent cached 304/HTML edge cases while debugging
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    // If we end up here, we almost certainly hit a 404 HTML or non-JSON payload
    json = { raw: text };
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // Some proxies can return 200 with HTML. Protect against that.
  if (json && typeof json === "object" && "raw" in json && typeof json.raw === "string") {
    const raw = json.raw.toLowerCase();
    if (raw.includes("<html") || raw.includes("<!doctype")) {
      throw new Error("Unexpected HTML response. Frontend likely hit the wrong CRM API URL.");
    }
  }

  return json;
}

function mapApiItemToClient(item) {
  // item is your backend normalized shape:
  // { id, clientName, name, status, billingCycle, nextChargeDate, amount, email, secondaryEmail, ... }
  const safe = item || {};
  const raw = safe.raw || {};

  const ownerName =
    raw?.Owner && typeof raw.Owner === "object" ? (raw.Owner.name || "") : "";

  const debitStatus = safe.status || raw.Status || "Unknown";

  return {
    id: safe.id || raw.id || `ZOHO-${Math.random().toString(16).slice(2)}`,
    source: "zoho",

    // Best effort: if your CRM has these fields later, we can wire properly.
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

    // UI status mapping
    status:
      debitStatus === "Scheduled"
        ? "Active"
        : debitStatus === "Failed"
          ? "Risk"
          : debitStatus === "Paused"
            ? "Paused"
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

    updatedAt: safe.updated || raw.Modified_Time || raw.Created_Time || new Date().toISOString(),
    notes: raw.Notes || "",
  };
}

export async function fetchZohoClients({ page = 1, perPage = 50 } = {}) {
  // Always call the API the same way you tested in the browser:
  // <BASE>/crm_api/api/clients?page=1&perPage=10
  const url = buildUrl(
    `/crm_api/api/clients?page=${encodeURIComponent(page)}&perPage=${encodeURIComponent(perPage)}`
  );

  const data = await httpGetJson(url);

  // Your backend returns items under `items`
  // { ok, page, perPage, count, items: [...] }
  const items = Array.isArray(data.items) ? data.items : [];

  return {
    page: data.page || page,
    perPage: data.perPage || perPage,
    count: data.count ?? items.length,
    clients: items.map(mapApiItemToClient),
    raw: data,
    _requestUrl: url,
  };
}
