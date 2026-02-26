// src/screens/Invoices.jsx
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { money, calcTotals } from "../data/invoices.js";
import "../styles/invoice.css";

function getApiBase() {
  const base = String(import.meta?.env?.VITE_API_BASE_URL || "").trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function normalizeKey(s) {
  return String(s || "").toLowerCase().trim();
}

function makeClientKeyFromInvoice(inv) {
  const email = normalizeKey(inv?.customerEmail);
  const name = normalizeKey(inv?.customer);
  return email || name || normalizeKey(inv?.id);
}

function statusDotClass(status) {
  if (status === "Paid") return "paid";
  if (status === "Unpaid") return "unpaid";
  return "overdue";
}

function safeInvoiceLabel(inv) {
  return String(inv?.id || "Invoice").trim();
}

/**
 * Normalise API invoice payload into the SAME SHAPE your UI already uses.
 * This is what prevents breakage.
 */
function normalizeInvoice(inv) {
  const raw = inv || {};

  const id =
    String(raw.id || raw.invoiceNo || raw.invoice_number || raw.invoice_id || "").trim() ||
    `INV-${Math.random().toString(16).slice(2)}`;

  const customer =
    String(raw.customer || raw.customerName || raw.customer_name || raw.contact_name || "").trim() ||
    "Customer";

  const customerEmail =
    String(raw.customerEmail || raw.customer_email || raw.contact_email || raw.email || "").trim();

  const status = String(raw.status || raw.invoice_status || "Unpaid").trim();

  const dateIssued = String(raw.dateIssued || raw.date || raw.issuedDate || "").trim();
  const dueDate = String(raw.dueDate || raw.due_date || raw.dueDate || "").trim();

  const currency = String(raw.currency || raw.currency_code || "ZAR").trim() || "ZAR";

  const booksInvoiceId = String(raw.booksInvoiceId || raw.invoice_id || "").trim();
  const debitOrderId = String(raw.debitOrderId || raw.debit_order_id || "").trim();

  const itemsRaw = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.line_items)
      ? raw.line_items
      : [];

  const items = itemsRaw.map((it) => {
    const description = String(it.description || it.name || it.item_name || it.item || "Item");
    const qty = Number(it.qty ?? it.quantity ?? 1);
    const unitPrice = Number(it.unitPrice ?? it.rate ?? it.unit_price ?? 0);

    return {
      description,
      qty: Number.isFinite(qty) ? qty : 1,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0
    };
  });

  // If your API already gives totals, we still keep calcTotals as the source of truth for UI
  // to avoid changing your existing logic.
  return {
    id,
    status,
    customer,
    customerEmail,
    dateIssued,
    dueDate,
    currency,
    items,
    booksInvoiceId,
    debitOrderId
  };
}

async function fetchInvoicesFromApi() {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error("Missing VITE_API_BASE_URL");

  // Your backend should expose:
  // GET {API_BASE}/api/invoices
  const url = `${apiBase}/api/invoices?page=1&perPage=200`;

  const resp = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" }
  });

  const text = await resp.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!resp.ok) {
    const msg = json?.error || json?.message || `Request failed (${resp.status})`;
    throw new Error(msg);
  }

  if (json && json.status === "failure") {
    const msg = json?.data?.message || json?.message || "API failure";
    throw new Error(msg);
  }

  const items = Array.isArray(json.items)
    ? json.items
    : Array.isArray(json.invoices)
      ? json.invoices
      : Array.isArray(json.data)
        ? json.data
        : [];

  return items.map(normalizeInvoice);
}

function SvgPrinter({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 8V4h10v4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path
        d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M7 14h10v6H7v-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function SvgDownload({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 11l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SvgEye({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Invoices() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");

  const [selectedClientKey, setSelectedClientKey] = useState("");

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // API-driven invoices, same shape as before
  const [invoices, setInvoices] = useState([]);
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setLoadErr("");
      try {
        const items = await fetchInvoicesFromApi();
        if (!alive) return;
        setInvoices(items || []);
      } catch (e) {
        if (!alive) return;
        setInvoices([]);
        setLoadErr(e?.message || "Failed to load invoices");
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, status, pageSize]);

  const filteredInvoices = useMemo(() => {
    const query = normalizeKey(q);

    return (invoices || [])
      .filter((inv) => {
        const matchesStatus = status === "All" ? true : String(inv.status) === String(status);
        if (!matchesStatus) return false;

        if (!query) return true;

        const hay = [
          inv.id,
          inv.status,
          inv.customer,
          inv.customerEmail,
          inv.dateIssued,
          inv.dueDate,
          inv.booksInvoiceId,
          inv.debitOrderId
        ]
          .filter(Boolean)
          .join(" ");

        return normalizeKey(hay).includes(query);
      })
      .sort((a, b) => String(b.dateIssued || "").localeCompare(String(a.dateIssued || "")));
  }, [q, status, invoices]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredInvoices.length / Math.max(1, pageSize)));
  }, [filteredInvoices.length, pageSize]);

  const pagedInvoices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, page, pageSize]);

  const selectedClientInvoices = useMemo(() => {
    if (!selectedClientKey) return [];
    const key = normalizeKey(selectedClientKey);

    return filteredInvoices
      .filter((inv) => makeClientKeyFromInvoice(inv) === key)
      .sort((a, b) => String(b.dateIssued || "").localeCompare(String(a.dateIssued || "")));
  }, [filteredInvoices, selectedClientKey]);

  const selectedClientMeta = useMemo(() => {
    const first = selectedClientInvoices[0];
    return {
      name: String(first?.customer || "").trim(),
      email: String(first?.customerEmail || "").trim()
    };
  }, [selectedClientInvoices]);

  function onView(inv) {
    setSelectedClientKey(makeClientKeyFromInvoice(inv));
    setTimeout(() => {
      const el = document.getElementById("tt-client-panel");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function closePanel() {
    setSelectedClientKey("");
  }

  function openInvoiceHtml(inv) {
    const apiBase = getApiBase();
    if (!apiBase) {
      alert("Missing VITE_API_BASE_URL");
      return;
    }

    const booksInvoiceId = String(inv?.booksInvoiceId || "").trim();
    const fallback = String(inv?.id || "").trim();
    const id = booksInvoiceId || fallback;

    const url = `${apiBase}/api/invoice-html/${encodeURIComponent(id)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function downloadInvoicePdf(inv) {
    const apiBase = getApiBase();
    if (!apiBase) {
      alert("Missing VITE_API_BASE_URL");
      return;
    }

    const booksInvoiceId = String(inv?.booksInvoiceId || "").trim();
    if (!booksInvoiceId) {
      openInvoiceHtml(inv);
      return;
    }

    const url = `${apiBase}/api/invoice-pdf/${encodeURIComponent(booksInvoiceId)}`;

    try {
      const resp = await fetch(url, { method: "GET" });
      if (!resp.ok) {
        openInvoiceHtml(inv);
        return;
      }

      const blob = await resp.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${safeInvoiceLabel(inv)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(objectUrl);
    } catch {
      openInvoiceHtml(inv);
    }
  }

  function exportFilteredToExcel() {
    const rows = filteredInvoices.map((inv) => {
      const totals = calcTotals(inv);
      return {
        "Invoice ID": inv.id,
        Status: inv.status,
        Customer: inv.customer,
        "Customer Email": inv.customerEmail,
        "Date Issued": inv.dateIssued,
        "Due Date": inv.dueDate,
        Currency: inv.currency || "ZAR",
        Subtotal: Number(totals.subtotal.toFixed(2)),
        VAT: Number(totals.vat.toFixed(2)),
        Total: Number(totals.total.toFixed(2))
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 14 },
      { wch: 10 },
      { wch: 28 },
      { wch: 30 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");

    const stamp = new Date();
    const yyyy = String(stamp.getFullYear());
    const mm = String(stamp.getMonth() + 1).padStart(2, "0");
    const dd = String(stamp.getDate()).padStart(2, "0");
    const filename = `TabbyTech_Invoices_${yyyy}-${mm}-${dd}.xlsx`;

    XLSX.writeFile(wb, filename, { bookType: "xlsx", compression: true });
  }

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="tt-page tt-invoices">
      <div className="tt-surface">
        <div className="tt-header tt-invoices-header">
          <div className="tt-title">
            <h1>Invoices</h1>
          </div>

          <div className="tt-toolbar tt-invoices-toolbar">
            <div className="tt-toolbar-left">
              <div className="tt-search-wrap">
                <input
                  type="text"
                  className="tt-input tt-invoices-search tt-search-premium"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search invoices"
                  aria-label="Search invoices"
                />
              </div>

              <div className="tt-select-wrap">
                <select
                  className="tt-select tt-invoices-status tt-select-premium"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="All">All statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              className="tt-btn tt-btn-primary tt-btn-export"
              onClick={exportFilteredToExcel}
              aria-label="Export filtered invoices to Excel"
            >
              Export to Excel
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ padding: 12, color: "rgba(255,255,255,0.70)" }}>
            Loading invoices...
          </div>
        )}

        {!loading && loadErr && (
          <div style={{ padding: 12, color: "rgba(255,255,255,0.70)" }}>
            {loadErr}
          </div>
        )}

        <div className="tt-table-wrap">
          <table className="tt-table tt-table-invoices" role="table" aria-label="Invoices table">
            <thead>
              <tr>
                <th className="tt-th-invoice">Invoice</th>
                <th className="tt-th-status">Status</th>
                <th className="tt-th-customer">Customer</th>
                <th className="tt-th-issued">Issued</th>
                <th className="tt-th-due">Due</th>
                <th className="tt-th-right tt-th-total">Total</th>
                <th className="tt-th-right tt-th-action">Action</th>
              </tr>
            </thead>

            <tbody>
              {pagedInvoices.map((inv) => {
                const totals = calcTotals(inv);
                const invId = String(inv?.id || "").trim();
                const dotClass = statusDotClass(String(inv.status || "Overdue"));

                return (
                  <tr key={invId}>
                    <td className="tt-cell-strong">{invId}</td>

                    <td>
                      <span className="tt-badge">
                        <span className={`tt-dot ${dotClass}`} />
                        <span className="tt-badge-text">{inv.status}</span>
                      </span>
                    </td>

                    <td>
                      <div className="tt-customer">
                        <span className="tt-customer-name">{inv.customer}</span>
                        <span className="tt-customer-email">{inv.customerEmail}</span>
                      </div>
                    </td>

                    <td>{inv.dateIssued}</td>
                    <td>{inv.dueDate}</td>

                    <td className="tt-td-right tt-cell-strong">{money(totals.total, inv.currency)}</td>

                    <td className="tt-td-right">
                      <button
                        type="button"
                        className="tt-iconbtn tt-iconbtn-view"
                        onClick={() => onView(inv)}
                        aria-label={`View invoices for ${inv.customer}`}
                        title="View client invoices"
                      >
                        <SvgEye />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {pagedInvoices.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} style={{ padding: 18, color: "rgba(255,255,255,0.70)" }}>
                    No invoices match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="tt-pager tt-invoices-pager">
            <div className="tt-pager-left">
              <div className="tt-pager-label">Records</div>

              <div className="tt-select-wrap tt-select-wrap-small">
                <select
                  className="tt-select tt-select-compact tt-select-premium"
                  value={String(pageSize)}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  aria-label="Records per page"
                >
                  <option value="10">10 records</option>
                  <option value="20">20 records</option>
                  <option value="50">50 records</option>
                  <option value="100">100 records</option>
                </select>
              </div>
            </div>

            <div className="tt-pager-right">
              <div className="tt-pager-meta">
                Page {page} of {totalPages}
              </div>

              <button
                type="button"
                className="tt-btn tt-btn-pager"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev}
              >
                Back
              </button>

              <button
                type="button"
                className="tt-btn tt-btn-pager"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!canNext}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {selectedClientKey && (
          <div id="tt-client-panel" className="tt-clientpanel">
            <div className="tt-clientpanel-head">
              <div className="tt-clientpanel-title">
                <div className="name">Invoices for {selectedClientMeta.name || "Client"}</div>
                <div className="email">{selectedClientMeta.email || " "}</div>
              </div>

              <button
                type="button"
                className="tt-btn tt-btn-back-small"
                onClick={closePanel}
                aria-label="Back to invoices list"
              >
                Back
              </button>
            </div>

            <div className="tt-clientpanel-body">
              <table className="tt-table tt-table-client" role="table" aria-label="Selected client invoices">
                <thead>
                  <tr>
                    <th className="tt-th-invoice">Invoice</th>
                    <th className="tt-th-status">Status</th>
                    <th className="tt-th-issued">Issued</th>
                    <th className="tt-th-due">Due</th>
                    <th className="tt-th-right tt-th-total">Total</th>
                    <th className="tt-th-right tt-th-action">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedClientInvoices.map((inv) => {
                    const totals = calcTotals(inv);
                    const invId = String(inv?.id || "").trim();
                    const dotClass = statusDotClass(String(inv.status || "Overdue"));

                    return (
                      <tr key={invId}>
                        <td className="tt-cell-strong">{invId}</td>

                        <td>
                          <span className="tt-badge">
                            <span className={`tt-dot ${dotClass}`} />
                            <span className="tt-badge-text">{inv.status}</span>
                          </span>
                        </td>

                        <td>{inv.dateIssued}</td>
                        <td>{inv.dueDate}</td>

                        <td className="tt-td-right tt-cell-strong">{money(totals.total, inv.currency)}</td>

                        <td className="tt-td-right">
                          <div className="tt-iconrow">
                            <button
                              type="button"
                              className="tt-iconbtn tt-iconbtn-purple"
                              onClick={() => openInvoiceHtml(inv)}
                              aria-label={`Print invoice ${invId}`}
                              title="Print (opens HTML in a new tab)"
                            >
                              <SvgPrinter />
                            </button>

                            <button
                              type="button"
                              className="tt-iconbtn tt-iconbtn-purple"
                              onClick={() => downloadInvoicePdf(inv)}
                              aria-label={`Download invoice ${invId}`}
                              title="Download PDF (falls back to HTML if PDF is not ready)"
                            >
                              <SvgDownload />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {selectedClientInvoices.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: 18, color: "rgba(255,255,255,0.70)" }}>
                        No invoices found for this client.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
