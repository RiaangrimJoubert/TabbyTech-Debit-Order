// src/screens/Invoices.jsx
import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { INVOICES, money, calcTotals } from "../data/invoices.js";

function getApiBase() {
  const base = String(import.meta?.env?.VITE_API_BASE_URL || "").trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

async function postJson(url, body) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });

  const text = await resp.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!resp.ok) {
    const msg = (json && (json.error || json.message)) || `Request failed with status ${resp.status}`;
    throw new Error(msg);
  }

  return json;
}

function normalizeKey(s) {
  return String(s || "").toLowerCase().trim();
}

function makeClientKey(inv) {
  const email = normalizeKey(inv?.customerEmail);
  const name = normalizeKey(inv?.customer);
  return email || name || normalizeKey(inv?.id);
}

function IconEye({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconPrint({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 8V4h10v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7 18h10v2H7v-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M6 10h12a2 2 0 0 1 2 2v4h-3v-3H7v3H4v-4a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDownload({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 11l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M5 20h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSync({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 7h-5V2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M20 7a8 8 0 1 0 2 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Invoices() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");

  // Selected client panel (the "green" behavior)
  const [selectedClientKey, setSelectedClientKey] = useState("");

  // Per-invoice Books sync status
  const [booksState, setBooksState] = useState({});

  const filteredInvoices = useMemo(() => {
    const query = q.trim().toLowerCase();

    return INVOICES.filter((inv) => {
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
        inv.debitOrderId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(query);
    }).sort((a, b) => String(b.dateIssued || "").localeCompare(String(a.dateIssued || "")));
  }, [q, status]);

  const selectedClient = useMemo(() => {
    if (!selectedClientKey) return null;

    // Find a representative invoice for display name/email
    const first = filteredInvoices.find((x) => makeClientKey(x) === selectedClientKey) || null;
    if (!first) return null;

    const name = String(first.customer || "").trim() || "Client";
    const email = String(first.customerEmail || "").trim();

    const invoices = filteredInvoices
      .filter((x) => makeClientKey(x) === selectedClientKey)
      .sort((a, b) => String(b.dateIssued || "").localeCompare(String(a.dateIssued || "")));

    return { name, email, invoices };
  }, [selectedClientKey, filteredInvoices]);

  function openClientInvoices(inv) {
    const key = makeClientKey(inv);
    setSelectedClientKey(key);
  }

  function closeClientInvoices() {
    setSelectedClientKey("");
  }

  function openInvoiceHtml(inv) {
    // Use your PUBLIC route so it does not touch AppShell/login
    const url = `/#/invoice/${encodeURIComponent(String(inv?.id || ""))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function downloadInvoicePdf(inv) {
    const apiBase = getApiBase();
    if (!apiBase) {
      // Fallback: user can still Save as PDF from browser
      openInvoiceHtml(inv);
      return;
    }

    const booksInvoiceId = String(inv?.booksInvoiceId || "").trim();

    // If not yet mapped, fallback to HTML (user can Save as PDF)
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
      a.download = `${String(inv?.id || "invoice")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(objectUrl);
    } catch {
      openInvoiceHtml(inv);
    }
  }

  async function onSyncToBooks(inv) {
    const invoiceId = String(inv?.id || "");
    const debitOrderId = inv?.debitOrderId ? String(inv.debitOrderId) : "";

    if (!debitOrderId) {
      setBooksState((prev) => ({
        ...prev,
        [invoiceId]: { state: "error", message: "Missing debitOrderId on this invoice row" },
      }));
      return;
    }

    setBooksState((prev) => ({
      ...prev,
      [invoiceId]: { state: "loading", message: "Creating invoice in Books..." },
    }));

    try {
      const apiBase = getApiBase();
      if (!apiBase) throw new Error("Missing VITE_API_BASE_URL");

      const url = `${apiBase}/api/books/invoices/create-from-debit-order`;
      const out = await postJson(url, { debitOrderId });

      const booksInvoiceId = out?.booksInvoiceId ? String(out.booksInvoiceId) : "";
      const invoiceNumber = out?.invoiceNumber ? String(out.invoiceNumber) : "";

      const msgParts = [];
      if (invoiceNumber) msgParts.push(invoiceNumber);
      if (booksInvoiceId) msgParts.push(booksInvoiceId);

      setBooksState((prev) => ({
        ...prev,
        [invoiceId]: {
          state: "ok",
          message: msgParts.length ? `Books: ${msgParts.join(" | ")}` : "Books invoice created",
        },
      }));
    } catch (e) {
      setBooksState((prev) => ({
        ...prev,
        [invoiceId]: { state: "error", message: String(e?.message || e) },
      }));
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
        Total: Number(totals.total.toFixed(2)),
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
      { wch: 12 },
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

  function statusDotClass(s) {
    if (s === "Paid") return "paid";
    if (s === "Unpaid") return "unpaid";
    return "overdue";
  }

  // Premium round icon button styling (matches your purple/glass vibe)
  const iconBtnBase = {
    width: 34,
    height: 34,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(130, 87, 229, 0.10)",
    color: "rgba(210,190,255,0.95)",
    boxShadow: "0 8px 22px rgba(0,0,0,0.30)",
    cursor: "pointer",
  };

  const iconBtnGreen = {
    ...iconBtnBase,
    background: "rgba(48, 209, 138, 0.12)",
    color: "rgba(150, 255, 210, 0.95)",
  };

  const iconBtnMuted = {
    ...iconBtnBase,
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.82)",
  };

  return (
    <div className="tt-page">
      <div className="tt-surface">
        <div className="tt-header">
          <div className="tt-title">
            <h1>Invoices</h1>
            <p>Desktop-first view. Use View to see the client invoices, then print or download.</p>
          </div>

          <div className="tt-toolbar">
            <input
              className="tt-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search invoices by ID, customer, email, status, date..."
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

        {/* MAIN TABLE (the green layout) */}
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
                const dotClass = statusDotClass(inv.status);

                return (
                  <tr key={String(inv.id)}>
                    <td style={{ fontWeight: 800, letterSpacing: 0.2 }}>{inv.id}</td>

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
                        className="tt-btn"
                        onClick={() => openClientInvoices(inv)}
                        aria-label={`View invoices for ${inv.customer}`}
                        title="View all invoices for this client"
                        style={{
                          padding: "8px 14px",
                          borderRadius: 12,
                        }}
                      >
                        View
                      </button>
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

        {/* SELECTED CLIENT PANEL (print/download on far right) */}
        {selectedClient && (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ fontWeight: 900, fontSize: 14 }}>
                  Invoices for {selectedClient.name}
                </div>
                <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12 }}>
                  {selectedClient.email || " "}
                </div>
              </div>

              <button
                type="button"
                className="tt-btn tt-btn-primary"
                onClick={closeClientInvoices}
                aria-label="Back"
                style={{ padding: "10px 16px", borderRadius: 12 }}
              >
                Back
              </button>
            </div>

            <div className="tt-table-wrap" style={{ marginTop: 10 }}>
              <table className="tt-table" role="table" aria-label={`Client invoices for ${selectedClient.name}`}>
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
                  {selectedClient.invoices.map((inv) => {
                    const totals = calcTotals(inv);
                    const dotClass = statusDotClass(inv.status);

                    const rowState = booksState[String(inv.id)] || { state: "idle", message: "" };
                    const canSync = Boolean(inv?.debitOrderId);

                    return (
                      <tr key={String(inv.id)}>
                        <td style={{ fontWeight: 800, letterSpacing: 0.2 }}>
                          {inv.id}
                          {rowState.state !== "idle" ? (
                            <div
                              style={{
                                marginTop: 4,
                                color:
                                  rowState.state === "ok"
                                    ? "rgba(180,255,210,0.85)"
                                    : rowState.state === "error"
                                    ? "rgba(255,170,170,0.85)"
                                    : "rgba(255,255,255,0.65)",
                                fontSize: 12,
                              }}
                            >
                              {rowState.message}
                            </div>
                          ) : null}
                        </td>

                        <td>
                          <span className="tt-badge">
                            <span className={`tt-dot ${dotClass}`} />
                            {inv.status}
                          </span>
                        </td>

                        <td>{inv.dateIssued}</td>
                        <td>{inv.dueDate}</td>

                        <td style={{ textAlign: "right", fontWeight: 800 }}>
                          {money(totals.total, inv.currency)}
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <div
                            className="tt-actions"
                            style={{
                              justifyContent: "flex-end",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            {/* PRINT */}
                            <button
                              type="button"
                              onClick={() => openInvoiceHtml(inv)}
                              aria-label={`Print invoice ${inv.id}`}
                              title="Print (opens HTML invoice in a new tab)"
                              style={iconBtnMuted}
                            >
                              <IconPrint />
                            </button>

                            {/* DOWNLOAD */}
                            <button
                              type="button"
                              onClick={() => downloadInvoicePdf(inv)}
                              aria-label={`Download invoice ${inv.id}`}
                              title="Download PDF (falls back to HTML if not available)"
                              style={iconBtnGreen}
                            >
                              <IconDownload />
                            </button>

                            {/* OPTIONAL: SYNC */}
                            <button
                              type="button"
                              onClick={() => onSyncToBooks(inv)}
                              disabled={!canSync || rowState.state === "loading"}
                              aria-label={`Sync invoice ${inv.id} to Books`}
                              title={!canSync ? "Missing debitOrderId" : "Sync to Books"}
                              style={{
                                ...iconBtnBase,
                                opacity: !canSync ? 0.45 : 1,
                                pointerEvents: !canSync ? "none" : "auto",
                              }}
                            >
                              {rowState.state === "loading" ? "…" : <IconSync />}
                            </button>

                            {/* VIEW (quick open) */}
                            <button
                              type="button"
                              onClick={() => openInvoiceHtml(inv)}
                              aria-label={`View invoice ${inv.id}`}
                              title="View (opens HTML invoice)"
                              style={iconBtnBase}
                            >
                              <IconEye />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {selectedClient.invoices.length === 0 && (
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

        <div className="tt-footer-note">
          View selects a client and shows all of that client invoices below. Print opens the HTML invoice. Download uses PDF when available.
        </div>
      </div>
    </div>
  );
}
