// src/api/invoices.js
"use strict";

import { request } from "./index";

/**
 * Expected backend shapes (recommended):
 * - List:   { ok: true, items: [ ... ], page, perPage, count }
 * - Single: { ok: true, invoice: { ... } }  OR just { ok: true, ...invoiceFields }
 *
 * We normalize into a UI-friendly invoice object.
 */

function safeStr(v) {
  return v == null ? "" : String(v);
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function cleanToken(token) {
  const t = String(token || "").trim();
  return t;
}

function withTokenQs(qs, token) {
  const t = cleanToken(token);
  if (!t) return qs;
  const joiner = qs ? "&" : "";
  return `${qs}${joiner}token=${encodeURIComponent(t)}`;
}

function mapBooksInvoiceToUi(inv) {
  const raw = inv || {};
  const customerName =
    raw.customer_name ||
    raw.customer?.name ||
    raw.contact_name ||
    raw.customer ||
    raw.clientName ||
    "Customer";

  const customerEmail =
    raw.email ||
    raw.customer_email ||
    raw.customer?.email ||
    raw.contact_email ||
    "";

  const invoiceNo =
    raw.invoice_number ||
    raw.invoiceNo ||
    raw.number ||
    raw.invoice_no ||
    raw.id ||
    "";

  const invoiceId =
    raw.invoice_id ||
    raw.invoiceId ||
    raw.id ||
    raw.invoice_number ||
    "";

  // Zoho Books often uses:
  // - date
  // - due_date
  // - status
  const issuedDate = safeStr(raw.date || raw.issuedDate || raw.issue_date || "");
  const dueDate = safeStr(raw.due_date || raw.dueDate || raw.due_date_iso || "");

  const status = safeStr(raw.status || raw.invoice_status || "Unknown");

  // Totals
  const subtotal =
    safeNum(raw.sub_total) ||
    safeNum(raw.subtotal) ||
    safeNum(raw.subtotalZar) ||
    0;

  const vat =
    safeNum(raw.tax_total) ||
    safeNum(raw.vat) ||
    safeNum(raw.vatZar) ||
    0;

  const total =
    safeNum(raw.total) ||
    safeNum(raw.totalZar) ||
    safeNum(raw.amount) ||
    0;

  // Line items (Zoho: line_items[])
  const itemsRaw = Array.isArray(raw.line_items)
    ? raw.line_items
    : Array.isArray(raw.items)
      ? raw.items
      : [];

  const items = itemsRaw.map((it) => ({
    description: safeStr(it.name || it.item_name || it.description || it.item || "Item"),
    qty: safeNum(it.quantity || it.qty || 1),
    unitPrice: safeNum(it.rate || it.unit_price || it.unitPrice || 0),
    amountZar: safeNum(it.amount || it.total || it.amountZar || 0),
    itemId: safeStr(it.item_id || it.itemId || it.code || ""),
  }));

  // If backend is cross-reffing debit order transaction amount, it can send:
  // - payment_made
  // - amount_paid
  // - transaction_amount
  // We normalize it into paymentMade (ZAR).
  const paymentMade =
    safeNum(raw.amount_paid) ||
    safeNum(raw.payment_made) ||
    safeNum(raw.paymentMade) ||
    safeNum(raw.transaction_amount) ||
    0;

  const balance =
    safeNum(raw.balance) ||
    safeNum(raw.balance_due) ||
    safeNum(raw.balanceDue) ||
    Math.max(total - paymentMade, 0);

  // Links / references
  const booksInvoiceId = safeStr(raw.invoice_id || raw.booksInvoiceId || "");
  const debitOrderId = safeStr(raw.debit_order_id || raw.debitOrderId || "");
  const clientId = safeStr(raw.client_id || raw.clientId || "");

  return {
    id: invoiceId,
    invoiceNo,
    booksInvoiceId,

    status,
    issuedDate,
    dueDate,

    customer: customerName,
    customerEmail,

    currency: safeStr(raw.currency_code || raw.currency || "ZAR"),

    items,

    totals: {
      subtotalZar: subtotal,
      vatZar: vat,
      totalZar: total,
      paymentMadeZar: paymentMade,
      balanceZar: balance,
    },

    refs: {
      clientId,
      debitOrderId,
    },

    raw,
  };
}

/**
 * Fetch invoices list (admin or portal).
 * If token is provided, it is appended as ?token=...
 */
export async function fetchInvoices({ page = 1, perPage = 50, token = "" } = {}) {
  let qs = `page=${encodeURIComponent(page)}&perPage=${encodeURIComponent(perPage)}`;
  qs = withTokenQs(qs, token);

  // GET /api/invoices?page=1&perPage=50[&token=...]
  const data = await request(`/api/invoices?${qs}`, { method: "GET" });

  const items = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.data)
      ? data.data
      : [];

  const mapped = items.map(mapBooksInvoiceToUi);

  return {
    ok: data.ok !== false,
    page: data.page || page,
    perPage: data.perPage || perPage,
    count: data.count ?? mapped.length,
    invoices: mapped,
    raw: data,
  };
}

/**
 * Fetch a single invoice (admin or portal).
 * If token is provided, it is appended as ?token=...
 */
export async function fetchInvoiceById(invoiceId, token = "") {
  const id = encodeURIComponent(String(invoiceId || ""));
  let qs = "";
  qs = withTokenQs(qs, token);

  // GET /api/invoices/:id[?token=...]
  const path = qs ? `/api/invoices/${id}?${qs}` : `/api/invoices/${id}`;
  const data = await request(path, { method: "GET" });

  // Support both shapes:
  const inv = data.invoice || data.data || data;
  return mapBooksInvoiceToUi(inv);
}
