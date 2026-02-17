// src/api/crm.js
"use strict";

/**
 * Catalyst-safe CRM API client
 * - In production on Catalyst: ALWAYS use relative path (/crm_api/...) to avoid CORS + wrong-host issues.
 * - In local dev: you may set VITE_CRM_API_BASE to point at your Catalyst domain.
 */

function runningOnCatalystHost() {
  if (typeof window === "undefined") return false;
  const h = String(window.location.hostname || "").toLowerCase();
  return h.includes("catalystserverless.com");
}

function getInjectedBaseUrl() {
  const injected =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_CRM_API_BASE) ||
    "";

  const base = String(injected || "").trim();
  return base ? base.replace(/\/+$/, "") : "";
}

function buildUrl(pathWithQuery) {
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;

  // If we are already hosted on Catalyst, do NOT use an absolute base
  // This guarantees same-origin requests and avoids CORS or routing mistakes.
  if (runningOnCatalystHost()) return path;

  // Otherwise (local dev etc), use injected base if present
  const base = getInjectedBaseUrl();
  if (!base) return path;

  return `${base}${path}`;
}

function looksLikeHtml(text) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return false;
  return t.startsWith("<!doctype html") || t.startsWith("<html") || t.includes("<head") || t.includes("<body");
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

  // Read body as text first so we can detect HTML and handle empty bodies
  const text = await res.text();

  if (looksLikeHtml(text)) {
    throw new Error(
      `Unexpected HTML response. Wrong API path or base URL. Expected JSON from /crm_api/api/clients. URL hit: ${url}`
    );
  }

  // Handle 304 explicitly (can have empty body)
  if (res.status === 304) {
    // Retry once with cache buster
    const u = new URL(url, window.location.origin);
    u.searchParams.set("_ts", String(Date.now()));
    const r2 = await fetch(u.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      cache: "no-store",
      credentials: "same-origin",
    });

    const t2 = await r2.text();
    let j2;
    try {
      j2 = t2 ? JSON.parse(t2) : null;
    } catch {
      j2 = { raw: t2 };
    }

    if (!r2.ok) {
      const msg = j2?.error || j2?.message || t2 || `HTTP ${r2.status}`;
      throw new Error(msg);
    }

    if (!j2 || typeof j2 !== "object") {
      throw new Error(`Empty or invalid JSON after retry. URL: ${u.toString()}`);
    }

    return j2;
  }

  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (!json || typeof json !== "object") {
    throw new Error(`Empty or invalid JSON response. URL: ${url}`);
  }

  return json;
}

function mapApiItemToClient(item) {
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

  const items = Array.isArray(data.items) ? data.items : [];

  return {
    page: data.page || page,
    perPage: data.perPage || perPage,
    count: data.count ?? items.length,
    clients: items.map(mapApiItemToClient),
    raw: data,
  };
}
