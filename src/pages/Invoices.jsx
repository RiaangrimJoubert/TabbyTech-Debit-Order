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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M2.2 12s3.7-7 9.8-7 9.8 7 9.8 7-3.7 7-9.8 7S2.2 12 2.2 12Z"
        stroke="currentColor"
        strokeWidth="2"
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 8V4h10v4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M7 14h10v6H7v-6Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function SvgDownload({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3v10" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11l4 4 4-4" stroke="currentColor" strokeWidth="2" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function Invoices() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [openInvoiceId, setOpenInvoiceId] = useState("");

  const filteredInvoices = useMemo(() => {
    const query = normalizeKey(q);

    return (INVOICES || [])

      // 🔴 HARD FILTER FOR TESTING (removes the duplicate rows)
      .filter(
        (inv) =>
          String(inv?.id || "").trim() !== "5156553000013659005" &&
          String(inv?.id || "").trim() !== "5156553000013645057"
      )

      .filter((inv) => {
        const matchesStatus =
          status === "All" ? true : String(inv.status) === String(status);
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
      .sort((a, b) =>
        String(b.dateIssued || "").localeCompare(String(a.dateIssued || ""))
      );
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

    const url = `${apiBase}/api/invoice-pdf/${encodeURIComponent(
      booksInvoiceId
    )}`;

    try {
      const resp = await fetch(url);
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
        Subtotal: totals.subtotal,
        VAT: totals.vat,
        Total: totals.total
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");

    XLSX.writeFile(wb, "TabbyTech_Invoices.xlsx");
  }

  return (
    <div className="tt-page">
      <div className="tt-surface">

        <div className="tt-header">
          <div className="tt-title">
            <h1>Invoices</h1>
          </div>

          <div className="tt-toolbar">

            <input
              className="tt-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search invoices"
            />

            <select
              className="tt-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Overdue">Overdue</option>
            </select>

            <button
              className="tt-btn tt-btn-primary"
              onClick={exportFilteredToExcel}
            >
              Export to Excel
            </button>

          </div>
        </div>

        <div className="tt-table-wrap">

          <table className="tt-table">

            <thead>
              <tr>
                <th>Invoice</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Issued</th>
                <th>Due</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredInvoices.map((inv) => {

                const totals = calcTotals(inv);
                const invId = String(inv?.id || "").trim();
                const isOpen = openInvoiceId === invId;
                const dotClass = statusDotClass(String(inv.status || ""));

                return (
                  <React.Fragment key={invId}>

                    <tr>

                      <td>{invId}</td>

                      <td>
                        <span className="tt-badge">
                          <span className={`tt-dot ${dotClass}`} />
                          {inv.status}
                        </span>
                      </td>

                      <td>
                        <strong>{inv.customer}</strong>
                      </td>

                      <td>{inv.dateIssued}</td>
                      <td>{inv.dueDate}</td>

                      <td style={{ textAlign: "right" }}>
                        {money(totals.total, inv.currency)}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <button
                          className="tt-btn tt-btn-primary"
                          onClick={() => toggleRow(invId)}
                        >
                          View
                        </button>
                      </td>

                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan={7}>

                          <button onClick={() => openInvoiceHtml(inv)}>
                            <SvgPrinter />
                          </button>

                          <button onClick={() => downloadInvoicePdf(inv)}>
                            <SvgDownload />
                          </button>

                          <button onClick={() => toggleRow(invId)}>
                            <SvgEye />
                          </button>

                        </td>
                      </tr>
                    )}

                  </React.Fragment>
                );
              })}

            </tbody>

          </table>

        </div>

      </div>
    </div>
  );
}
