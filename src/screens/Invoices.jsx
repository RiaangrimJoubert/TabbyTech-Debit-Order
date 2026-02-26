// src/screens/Invoices.jsx
import React, { useMemo, useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { INVOICES, money, calcTotals } from "../data/invoices.js";
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

function IconButton({ title, variant, onClick, children }) {
  return (
    <button
      type="button"
      className={`tt-iconbtn ${variant}`}
      onClick={onClick}
      aria-label={title}
      title={title}
    >
      {children}
    </button>
  );
}

export default function Invoices() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");

  const [selectedClientKey, setSelectedClientKey] = useState("");

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [q, status, pageSize]);

  const filteredInvoices = useMemo(() => {
    const query = normalizeKey(q);

    return (INVOICES || [])
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
  }, [q, status]);

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
        <div className="tt-header">
          <div className="tt-title">
            <h1>Invoices</h1>
            <p>Use View to load a client panel, then Print or Download from the right.</p>
          </div>

          <div className="tt-toolbar">
            <input
              className="tt-input tt-input-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search invoices by ID, customer, email, status, date..."
              aria-label="Search invoices"
            />

            <select
              className="tt-select tt-select-premium"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="All">All statuses</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Overdue">Overdue</option>
            </select>

            <button
              type="button"
              className="tt-btn tt-btn-primary tt-btn-sm"
              onClick={exportFilteredToExcel}
              aria-label="Export filtered invoices to Excel"
              title="Exports exactly what is currently filtered in the table"
            >
              Export to Excel
            </button>
          </div>
        </div>

        <div className="tt-table-wrap">
          <table className="tt-table" role="table" aria-label="Invoices table">
            <thead>
              <tr>
                <th style={{ width: 160 }}>Invoice</th>
                <th style={{ width: 140 }}>Status</th>
                <th>Customer</th>
                <th style={{ width: 170 }}>Issued</th>
                <th style={{ width: 170 }}>Due</th>
                <th style={{ width: 160, textAlign: "right" }}>Total</th>
                <th style={{ width: 140, textAlign: "right" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {pagedInvoices.map((inv) => {
                const totals = calcTotals(inv);
                const invId = String(inv?.id || "").trim();
                const dotClass = statusDotClass(String(inv.status || "Overdue"));

                return (
                  <tr key={invId || Math.random()}>
                    <td style={{ fontWeight: 900, letterSpacing: 0.2 }}>{invId}</td>

                    <td>
                      <span className="tt-badge">
                        <span className={`tt-dot ${dotClass}`} />
                        {inv.status}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontWeight: 800 }}>{inv.customer}</span>
                        <span style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>
                          {inv.customerEmail}
                        </span>
                      </div>
                    </td>

                    <td>{inv.dateIssued}</td>
                    <td>{inv.dueDate}</td>

                    <td style={{ textAlign: "right" }}>
                      <span className="tt-money">{money(totals.total, inv.currency)}</span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <button type="button" className="tt-viewbtn" onClick={() => onView(inv)}>
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}

              {pagedInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 18, color: "rgba(255,255,255,0.70)" }}>
                    No invoices match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="tt-pagination">
            <div className="tt-label">Records</div>

            <select
              className="tt-select tt-select-premium"
              value={String(pageSize)}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Records per page"
              style={{ width: 140 }}
            >
              <option value="10">10 records</option>
              <option value="20">20 records</option>
              <option value="50">50 records</option>
              <option value="100">100 records</option>
            </select>

            <button
              type="button"
              className="tt-btn tt-btn-primary tt-btn-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!canPrev}
              style={{ opacity: canPrev ? 1 : 0.45 }}
            >
              Back
            </button>

            <button
              type="button"
              className="tt-btn tt-btn-primary tt-btn-xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={!canNext}
              style={{ opacity: canNext ? 1 : 0.45 }}
            >
              Next
            </button>
          </div>
        </div>

        <div className="tt-footer-note">
          View loads a premium client panel below. Print opens the HTML invoice. Download uses PDF when available.
        </div>

        {selectedClientKey && (
          <div id="tt-client-panel" className="tt-client-panel">
            <div className="tt-client-panel-head">
              <div className="tt-client-meta">
                <div className="name">Invoices for {selectedClientMeta.name || "Client"}</div>
                <div className="email">{selectedClientMeta.email || " "}</div>
              </div>

              <button
                type="button"
                className="tt-btn tt-btn-primary tt-btn-xs"
                onClick={closePanel}
              >
                Back
              </button>
            </div>

            <div style={{ padding: 14, overflowX: "auto" }}>
              <table className="tt-table" role="table" aria-label="Selected client invoices">
                <thead>
                  <tr>
                    <th style={{ width: 160 }}>Invoice</th>
                    <th style={{ width: 140 }}>Status</th>
                    <th style={{ width: 170 }}>Issued</th>
                    <th style={{ width: 170 }}>Due</th>
                    <th style={{ width: 160, textAlign: "right" }}>Total</th>
                    <th style={{ width: 220, textAlign: "right" }}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedClientInvoices.map((inv) => {
                    const totals = calcTotals(inv);
                    const invId = String(inv?.id || "").trim();
                    const dotClass = statusDotClass(String(inv.status || "Overdue"));

                    return (
                      <tr key={invId || Math.random()}>
                        <td style={{ fontWeight: 900 }}>{invId}</td>

                        <td>
                          <span className="tt-badge">
                            <span className={`tt-dot ${dotClass}`} />
                            {inv.status}
                          </span>
                        </td>

                        <td>{inv.dateIssued}</td>
                        <td>{inv.dueDate}</td>

                        <td style={{ textAlign: "right" }}>
                          <span className="tt-money">{money(totals.total, inv.currency)}</span>
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <div className="tt-iconrow">
                            <IconButton title="Print" variant="purple" onClick={() => openInvoiceHtml(inv)}>
                              <SvgPrinter />
                            </IconButton>

                            <IconButton
                              title="Download PDF"
                              variant="green"
                              onClick={() => downloadInvoicePdf(inv)}
                            >
                              <SvgDownload />
                            </IconButton>
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

              <div className="tt-note">
                Print opens the HTML invoice. Download uses PDF when available. If PDF is not available yet, it opens the HTML invoice so you can Save as PDF.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
