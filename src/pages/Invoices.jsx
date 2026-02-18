// src/pages/Invoices.jsx
import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { INVOICES, money, calcTotals } from "../data/invoices.js";

export default function Invoices() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");

  const filteredInvoices = useMemo(() => {
    const query = q.trim().toLowerCase();
    return INVOICES.filter((inv) => {
      const matchesStatus = status === "All" ? true : inv.status === status;
      if (!matchesStatus) return false;

      if (!query) return true;
      const hay = [
        inv.id,
        inv.status,
        inv.customer,
        inv.customerEmail,
        inv.dateIssued,
        inv.dueDate
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(query);
    });
  }, [q, status]);

  function onView(invoiceId) {
    const url = `#/portal/${encodeURIComponent(invoiceId)}`;
    window.open(url, "_blank", "noopener,noreferrer");

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
            <p>View opens a portal style invoice page in a new tab for printing and Save as PDF.</p>
          </div>

          <div className="tt-toolbar">
            <input
              className="tt-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search invoices by ID, customer, email, date..."
              aria-label="Search invoices"
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
                const dotClass =
                  inv.status === "Paid"
                    ? "paid"
                    : inv.status === "Unpaid"
                    ? "unpaid"
                    : "overdue";

                return (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 700, letterSpacing: 0.2 }}>{inv.id}</td>
                    <td>
                      <span className="tt-badge">
                        <span className={`tt-dot ${dotClass}`} />
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontWeight: 600 }}>{inv.customer}</span>
                        <span style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>
                          {inv.customerEmail}
                        </span>
                      </div>
                    </td>
                    <td>{inv.dateIssued}</td>
                    <td>{inv.dueDate}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      {money(totals.total, inv.currency)}
                    </td>
                    <td>
                      <div className="tt-actions">
                        <button
                          type="button"
                          className="tt-linkbtn"
                          onClick={() => onView(inv.id)}
                          aria-label={`View invoice ${inv.id}`}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
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
          View opens a new tab with the invoice and a list of all invoices for that customer underneath.
        </div>
      </div>
    </div>
  );
}
