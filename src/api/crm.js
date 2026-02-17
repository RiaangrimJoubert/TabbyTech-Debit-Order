// src/api/crm.js
"use strict";

async function httpGetJson(url) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
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
    throw new Error(msg);
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

    // You can later map this from a field. For now we derive a UI friendly status.
    status: debitStatus === "Scheduled" ? "Active" : debitStatus === "Failed" ? "Risk" : "Active",

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
      lastTransactionReference: safe.lastTransactionReference || raw.Last_Transaction_Reference || "",
      failureReason: safe.failureReason || raw.Failure_Reason || "",
    },

    updatedAt: safe.updated || raw.Modified_Time || raw.Created_Time || new Date().toISOString(),
    notes: raw.Notes || "",
  };
}

export async function fetchZohoClients({ page = 1, perPage = 50 } = {}) {
  // This matches your deployed path style: https://<domain>/crm_api/api/clients
  const url = `/crm_api/api/clients?page=${encodeURIComponent(page)}&perPage=${encodeURIComponent(perPage)}`;
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
