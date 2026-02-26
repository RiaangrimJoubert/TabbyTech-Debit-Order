// src/screens/Invoices.jsx
import React, { useMemo, useState, useEffect } from "react";
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
    body: JSON.stringify(body || {})
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

function makeClientKeyFromInvoice(inv) {
  const email = normalizeKey(inv?.customerEmail);
  const name = normalizeKey(inv?.customer);
  return email || name || normalizeKey(inv?.id);
}

function StatusPill({ status }) {
  const s = String(status || "").trim();
  const dotClass = s === "Paid" ? "paid" : s === "Unpaid" ? "unpaid" : "overdue";

  return (
    <span className="tt-badge">
      <span className={`tt-dot ${dotClass}`} />
      {s || "Unknown"}
    </span>
  );
}

function IconBtn({ title, onClick, children, variant }) {
  const bg =
    variant === "purple"
      ? "rgba(132, 86, 255, 0.18)"
      : variant === "green"
      ? "rgba(46, 213, 115, 0.16)"
      : "rgba(120, 180, 255, 0.14)";

  const bd =
    variant === "purple"
      ? "rgba(132, 86, 255, 0.35)"
      : variant === "green"
      ? "rgba(46, 213, 115, 0.30)"
      : "rgba(120, 180, 255, 0.28)";

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 34,
        height: 34,
        borderRadius: 999,
        border: `1px solid ${bd}`,
        background: bg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer"
      }}
    >
      {children}
    </button>
  );
}

export default function Invoices() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");

  // selection (View -> shows client invoices panel)
  const [selectedClientKey, setSelectedClientKey] = useState("");

  // pagination
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Per-invoice Books sync status
  const [booksState, setBooksState] = useState({});

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [q, status, pageSize]);

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
        inv.debitOrderId
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(query);
    }).sort((a, b) => String(b.dateIssued || "").localeCompare(String(a.dateIssued || "")));
  }, [q, status]);

  const totalPages = useMemo(() => {
    const n = Math.max(1, Math.ceil(filteredInvoices.length / Math.max(1, pageSize)));
    return n;
  }, [filteredInvoices.length, pageSize]);

  const pagedInvoices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, page, pageSize]);

  const selectedClientInvoices = useMemo(() => {
    if (!selectedClientKey) return [];
    const key = normalizeKey(selectedClientKey);

    const rows = filteredInvoices.filter((inv) => makeClientKeyFromInvoice(inv) === key);

    return rows.sort((a, b) => String(b.dateIssued || "").localeCompare(String(a.dateIssued || "")));
  }, [filteredInvoices, selectedClientKey]);

  const selectedClientMeta = useMemo(() => {
    if (!selectedClientKey) return { name: "", email: "" };
    const first = selectedClientInvoices[0];
    return {
      name: String(first?.customer || "").trim(),
      email: String(first?.customerEmail || "").trim()
    };
  }, [selectedClientKey, selectedClientInvoices]);

  function onViewClient(inv) {
    const key = makeClientKeyFromInvoice(inv);
    setSelectedClientKey(key);
    setTimeout(() => {
      const el = document.getElementById("tt-client-invoices-panel");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function clearSelectedClient() {
    setSelectedClientKey("");
  }

  function openInvoiceHtml(inv) {
    const apiBase = getApiBase();
    if (!apiBase) {
      alert("Missing VITE_API_BASE_URL");
      return;
    }

    // Prefer Books invoice id if present
    const booksInvoiceId = String(inv?.booksInvoiceId || "").trim() || String(inv?.id || "").trim();
    const url = `${apiBase}/api/invoice-html/${encodeURIComponent(booksInvoiceId)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function downloadInvoicePdf(inv) {
    const apiBase = getApiBase();
    if (!apiBase) {
      alert("Missing VITE_API_BASE_URL");
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
        [invoiceId]: { state: "error", message: "Missing debitOrderId on this invoice row" }
      }));
      return;
    }

    setBooksState((prev) => ({
      ...prev,
      [invoiceId]: { state: "loading", message: "Creating invoice in Books..." }
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
          message: msgParts.length ? `Books: ${msgParts.join(" | ")}` : "Books invoice created"
        }
      }));
    } catch (e) {
      setBooksState((prev) => ({
        ...prev,
        [invoiceId]: { state: "error", message: String(e?.message || e) }
      }));
    }
  }

  function exportFilteredToExcel() {
    const rows = filteredInvoices.map((inv) => {
      const totals = calcTotals(inv);
      return {
        "Invoice ID": inv.id,
        "Books Invoice ID": inv.booksInvoiceId || "",
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
      { wch: 20 },
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
    <div className="tt-page">
      <div className="tt-surface">
        <div className="tt-header">
          <div className="tt-title">
            <h1>Invoices</h1>
            <p>Desktop-first view. Use View to see the client invoices, then print or download.</p>
          </div>

          {/* Toolbar aligned like your other modules */}
          <div className="tt-toolbar" style={{ alignItems: "center" }}>
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

        {/* Main premium table card */}
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
                const email = String(inv?.customerEmail || "").trim();

                return (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 800, letterSpacing: 0.2 }}>{inv.id}</td>

                    <td>
                      <StatusPill status={inv.status} />
                    </td>

                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontWeight: 700 }}>{inv.customer}</span>
                        <span style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>
                          {email || " "}
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
                        className="tt-linkbtn"
                        onClick={() => onViewClient(inv)}
                        aria-label={`View invoices for ${inv.customer}`}
                        title="Shows this client invoices below"
                      >
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

          {/* Footer controls like Debit Orders */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 10,
              paddingTop: 12
            }}
          >
            <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12 }}>Records</div>

            <select
              className="tt-select"
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
              className="tt-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!canPrev}
              style={{ opacity: canPrev ? 1 : 0.45 }}
            >
              Back
            </button>

            <button
              type="button"
              className="tt-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={!canNext}
              style={{ opacity: canNext ? 1 : 0.45 }}
            >
              Next
            </button>
          </div>
        </div>

        <div className="tt-footer-note">
          View selects a client and shows all of that client invoices below. Print opens the HTML invoice. Download uses PDF when available.
        </div>

        {/* Client invoices panel (the red section you like) */}
        {selectedClientKey && (
          <div
            id="tt-client-invoices-panel"
            style={{
              marginTop: 14,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: 14,
                alignItems: "center",
                borderBottom: "1px solid rgba(255,255,255,0.08)"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ fontWeight: 900 }}>Invoices for {selectedClientMeta.name || "Client"}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                  {selectedClientMeta.email || " "}
                </div>
              </div>

              {/* Small back button, styled like your premium buttons */}
              <button
                type="button"
                className="tt-btn tt-btn-primary"
                onClick={clearSelectedClient}
                style={{ paddingLeft: 14, paddingRight: 14, height: 34 }}
                aria-label="Close client invoices panel"
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
                    const rowState = booksState[String(inv.id)] || { state: "idle", message: "" };
                    const canSync = Boolean(inv?.debitOrderId);

                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 800 }}>
                          {inv.id}
                          {inv.booksInvoiceId ? (
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.60)", marginTop: 4 }}>
                              Books: {String(inv.booksInvoiceId)}
                            </div>
                          ) : null}

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
                                fontSize: 12
                              }}
                            >
                              {rowState.message}
                            </div>
                          ) : null}
                        </td>

                        <td>
                          <StatusPill status={inv.status} />
                        </td>

                        <td>{inv.dateIssued}</td>
                        <td>{inv.dueDate}</td>

                        <td style={{ textAlign: "right", fontWeight: 800 }}>
                          {money(totals.total, inv.currency)}
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                            {/* Print icon (opens HTML invoice) */}
                            <IconBtn
                              variant="purple"
                              title="Print"
                              onClick={() => openInvoiceHtml(inv)}
                            >
                              {/* printer icon */}
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M7 8V4h10v4"
                                  stroke="rgba(255,255,255,0.85)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M7 17h10v3H7v-3Z"
                                  stroke="rgba(255,255,255,0.85)"
                                  strokeWidth="2"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M6 17H5a3 3 0 0 1-3-3v-3a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-1"
                                  stroke="rgba(255,255,255,0.85)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </IconBtn>

                            {/* Download icon */}
                            <IconBtn
                              variant="green"
                              title="Download PDF"
                              onClick={() => downloadInvoicePdf(inv)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M12 3v10"
                                  stroke="rgba(255,255,255,0.85)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M8 11l4 4 4-4"
                                  stroke="rgba(255,255,255,0.85)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M5 21h14"
                                  stroke="rgba(255,255,255,0.85)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </IconBtn>

                            {/* Optional: Sync to Books icon button (kept, but not “delete”) */}
                            <IconBtn
                              variant="blue"
                              title={canSync ? "Sync to Books" : "Missing debitOrderId"}
                              onClick={() => onSyncToBooks(inv)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M20 12a8 8 0 1 1-2.34-5.66"
                                  stroke="rgba(255,255,255,0.85)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M20 4v6h-6"
                                  stroke="rgba(255,255,255,0.85)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </IconBtn>
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

              <div style={{ marginTop: 10, color: "rgba(255,255,255,0.68)", fontSize: 12 }}>
                Print opens the HTML invoice. Download uses PDF when available. If PDF is not available yet, it opens the HTML invoice so you can Save as PDF.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
