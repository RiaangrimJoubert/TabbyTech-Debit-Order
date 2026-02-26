// src/screens/Invoices.jsx
import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { INVOICES, money, calcTotals } from "../data/invoices.js";

function getApiBase() {
  const base = String(import.meta?.env?.VITE_API_BASE_URL || "").trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function normalizeKey(s) {
  return String(s || "").toLowerCase().trim();
}

function statusDotClass(status) {
  if (status === "Paid") return "paid";
  if (status === "Unpaid") return "unpaid";
  return "overdue";
}

function safeInvoiceLabel(inv) {
  return String(inv?.id || "Invoice").trim();
}

function SvgEye({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.2 12s3.7-7 9.8-7 9.8 7 9.8 7-3.7 7-9.8 7S2.2 12 2.2 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.2A3.2 3.2 0 1 0 12 8.8a3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function SvgPrinter({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 8V4h10v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M7 14h10v6H7v-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SvgDownload({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3v10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 11l4 4 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M4 20h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Invoices() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");

  // which invoice row is expanded
  const [openInvoiceId, setOpenInvoiceId] = useState("");

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

  function toggleRow(invoiceId) {
    const id = String(invoiceId || "").trim();
    if (!id) return;
    setOpenInvoiceId((prev) => (prev === id ? "" : id));
  }

  function openInvoiceHtml(inv) {
    const apiBase = getApiBase();
    if (!apiBase) {
      alert("Missing VITE_API_BASE_URL");
      return;
    }

    const booksInvoiceId = String(inv?.booksInvoiceId || "").trim();
    const fallback = String(inv?.id || "").trim();

    // Prefer Books invoice id if mapped, else fallback to invoice id
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

    // If not mapped yet, fallback to HTML (user can Save as PDF)
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

  return (
    <div className="tt-page">
      <div className="tt-surface">
        <div className="tt-header">
          <div className="tt-title">
            <h1>Invoices</h1>
            <p>Desktop-first view. Use View for the standalone printable invoice route.</p>
          </div>

          <div className="tt-toolbar" style={{ justifyContent: "flex-end" }}>
            <input
              className="tt-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search invoices by ID, customer, email, status, date..."
              aria-label="Search invoices"
              style={{ maxWidth: 520 }}
            />

            <select
              className="tt-select"
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
              className="tt-btn tt-btn-primary"
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
              {filteredInvoices.map((inv) => {
                const totals = calcTotals(inv);
                const invId = String(inv?.id || "").trim();
                const isOpen = openInvoiceId === invId;

                const dotClass = statusDotClass(String(inv.status || "Overdue"));

                return (
                  <React.Fragment key={invId || Math.random()}>
                    <tr>
                      <td style={{ fontWeight: 800, letterSpacing: 0.2 }}>{invId}</td>

                      <td>
                        <span className="tt-badge">
                          <span className={`tt-dot ${dotClass}`} />
                          {inv.status}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontWeight: 700 }}>{inv.customer}</span>
                          <span style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>
                            {inv.customerEmail}
                          </span>
                        </div>
                      </td>

                      <td>{inv.dateIssued}</td>
                      <td>{inv.dueDate}</td>

                      <td style={{ textAlign: "right", fontWeight: 800 }}>
                        {money(totals.total, inv.currency)}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="tt-btn tt-btn-primary"
                          onClick={() => toggleRow(invId)}
                          aria-label={`View invoice actions for ${invId}`}
                          style={{
                            padding: "10px 16px",
                            borderRadius: 12,
                            fontWeight: 800,
                            minWidth: 84
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan={7} style={{ paddingTop: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              padding: "14px 18px 18px",
                              gap: 10
                            }}
                          >
                            {/* Round icon buttons, premium feel */}
                            <button
                              type="button"
                              onClick={() => openInvoiceHtml(inv)}
                              aria-label={`Print invoice ${invId}`}
                              title="Print (opens HTML in a new tab)"
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 999,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid rgba(124,58,237,0.45)",
                                background: "rgba(124,58,237,0.12)",
                                color: "rgba(216, 196, 255, 0.95)",
                                boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
                                cursor: "pointer"
                              }}
                            >
                              <SvgPrinter />
                            </button>

                            <button
                              type="button"
                              onClick={() => downloadInvoicePdf(inv)}
                              aria-label={`Download invoice ${invId}`}
                              title="Download PDF (falls back to HTML if PDF route is not ready)"
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 999,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid rgba(34,197,94,0.35)",
                                background: "rgba(34,197,94,0.12)",
                                color: "rgba(180,255,210,0.95)",
                                boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
                                cursor: "pointer"
                              }}
                            >
                              <SvgDownload />
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleRow(invId)}
                              aria-label={`Close actions for invoice ${invId}`}
                              title="Close"
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 999,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid rgba(255,255,255,0.12)",
                                background: "rgba(255,255,255,0.06)",
                                color: "rgba(255,255,255,0.75)",
                                boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
                                cursor: "pointer"
                              }}
                            >
                              <SvgEye />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 18, color: "rgba(255,255,255,0.70)" }}>
                    No invoices match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="tt-footer-note">
          View expands the row. Print opens the HTML invoice in a new tab. Download uses PDF once the backend route exists.
        </div>
      </div>
    </div>
  );
}
