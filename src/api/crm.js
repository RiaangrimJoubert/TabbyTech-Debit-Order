// src/api/crm.js
"use strict";

/**
 * CRM API client for TabbyTech Debit Orders
 * Key points:
 * - Always bypass browser/proxy caching (prevents 304 with empty body)
 * - Robust JSON parsing (handles empty/HTML)
 * - Accepts { items: [...] } response shape from /crm_api/api/clients
 */

function getBaseUrl() {
  // In Vite, this is injected at build time. If undefined, fall back to same-origin.
  const injected =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_CRM_API_BASE) ||
    "";

  const base = String(injected || "").trim();

  // If base is present, ensure no trailing slash
  if (base) return base.replace(/\/+$/, "");
  return "";
}

function buildUrl(pathWithQuery) {
  const base = getBaseUrl();
  // If no base, return path as-is (same-origin)
  if (!base) return pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  // If base exists, join
  const p = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  return `${base}${p}`;
}

function looksLikeHtml(text) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return false;
  return t.startsWith("<!doctype html") || t.startsWith("<html") || t.includes("<head") || t.includes("<body");
}

async function httpGetJson(url, { retryOn304 = true } = {}) {
  const fetchOnce = async (u) => {
    const res = await fetch(u, {
      method: "GET",
      headers: {
        Accept: "application/json",
        // Defensive headers to avoid 304 / cached empty body scenarios
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      cache: "no-store",
      credentials: "same-origin",
    });

    const text = await res.text();

    // If we got HTML, the request hit a frontend route or wrong host/path
    if (looksLikeHtml(text)) {
      const hint = `Unexpected HTML response. Wrong API path or base URL. Expected JSON from /crm_api/api/clients. URL hit: ${u}`;
      const err = new Error(hint);
      err.name = "UnexpectedHtmlResponse";
      err.status = res.status;
      err.raw = text.slice(0, 220);
      throw err;
    }

    // Handle 304 explicitly (often no body)
    if (res.status === 304) {
      const err = new Error(`Received 304 Not Modified from API (empty body likely). URL: ${u}`);
      err.name = "NotModified";
      err.status = 304;
      err.raw = text;
      throw err;
    }

    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      const msg = json?.error || json?.message || text || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.payload = json;
      throw err;
    }

    if (!json || typeof json !== "object") {
      const err = new Error(`Empty or invalid JSON response. URL: ${u}`);
      err.name = "InvalidJson";
      err.status = res.status;
      err.raw = text;
      throw err;
    }

    return json;
  };

  try {
    return await fetchOnce(url);
  } catch (e) {
    // Retry once if 304 or empty/invalid response by adding a cache buster
    const is304 = e && (e.name === "NotModified" || e.status === 304);
    const isInvalid = e && (e.name === "InvalidJson" || /Empty or invalid JSON/i.test(e.message || ""));
    if (retryOn304 && (is304 || isInvalid)) {
      const u = new URL(url, window.location.origin);
      u.searchParams.set("_ts", String(Date.now()));
      return await fetchOnce(u.toString());
    }
    throw e;
  }
}

function mapApiItemToClient(item) {
  // item is your backend normalized shape:
  // { id, clientName, name, status, billingCycle, nextChargeDate, amount, email, secondaryEmail, ... , raw }
  const safe = item || {};
  const raw = safe.raw || {};

  const ownerName =
    raw?.Owner && typeof raw.Owner === "object" ? (raw.Owner.name || "") : "";

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

    // Derive UI friendly status from debitStatus
    status:
      debitStatus === "Scheduled"
        ? "Active"
        : debitStatus === "Failed"
        ? "Risk"
        : debitStatus === "Notified"
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

    updatedAt:
      safe.updated ||
      raw.Modified_Time ||
      raw.Created_Time ||
      new Date().toISOString(),
    notes: raw.Notes || "",
  };
}

export async function fetchZohoClients({ page = 1, perPage = 50 } = {}) {
  const path = `/crm_api/api/clients?page=${encodeURIComponent(
    page
  )}&perPage=${encodeURIComponent(perPage)}`;

  const url = buildUrl(path);
  const data = await httpGetJson(url);

  // Your backend returns: { ok, page, perPage, count, items: [] }
  const items = Array.isArray(data.items) ? data.items : [];

  return {
    page: data.page || page,
    perPage: data.perPage || perPage,
    count: data.count ?? items.length,
    clients: items.map(mapApiItemToClient),
    raw: data,
  };
}
