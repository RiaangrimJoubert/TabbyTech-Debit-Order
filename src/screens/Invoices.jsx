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
    const msg =
      (json && (json.error || json.message)) ||
      `Request failed with status ${resp.status}`;
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
  return encodeURIComponent(email || name || String(inv?.id || ""));
}

function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "C";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "C";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}

function formatDateYmdToDmy(ymd) {
  const s = String(ymd || "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1].slice(2)}`;
}

function StatusPill({ status }) {
  const s = String(status || "").trim();

  let bg = "rgba(255,255,255,0.08)";
  let fg = "rgba(255,255,255,0.85)";
  if (s === "Paid") {
    bg = "rgba(16,185,129,0.18)";
    fg = "rgba(16,185,129,0.95)";
  } else if (s === "Overdue") {
    bg = "rgba(245,158,11,0.18)";
    fg = "rgba(245,158,11,0.95)";
  } else if (s === "Unpaid") {
    bg = "rgba(99,102,241,0.18)";
    fg = "rgba(139,92,246,0.95)";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: 0.2,
        background: bg,
        color: fg,
        border: "1px solid rgba(255,255,255,0.10)",
        whiteSpace: "nowrap"
      }}
    >
      {s || "Unknown"}
    </span>
  );
}

function IconButton({ title, ariaLabel, onClick, tone = "neutral", disabled = false, children }) {
  let bg = "rgba(255,255,255,0.06)";
  let bd = "rgba(255,255,255,0.10)";
  let fg = "rgba(255,255,255,0.85)";

  if (tone === "purple") {
    bg = "rgba(139,92,246,0.18)";
    bd = "rgba(139,92,246,0.35)";
    fg = "rgba(199,175,255,0.98)";
  }
  if (tone === "green") {
    bg = "rgba(16,185,129,0.18)";
    bd = "rgba(16,185,129,0.35)";
    fg = "rgba(167,243,208,0.98)";
  }
  if (tone === "red") {
    bg = "rgba(239,68,68,0.16)";
    bd = "rgba(239,68,68,0.30)";
    fg = "rgba(252,165,165,0.98)";
  }

  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        border: `1px solid ${bd}`,
        color: fg,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "transform 120ms ease, filter 120ms ease"
      }}
      onMouseDown={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "scale(0.97)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {children}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 8V4h10v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M7 17h10v3H7v-3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6 10h12a3 3 0 0 1 3 3v3h-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6 16H2v-3a3 3 0 0 1 3-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
        d="M5 21h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 1 1-7-7L7 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Invoices() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [openClientKey, setOpenClientKey] = useState("");

  // Per-invoice Books sync status
  const [booksState, setBooksState] = useState({});

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
        inv.dueDate,
        inv.booksInvoiceId,
        inv.debitOrderId
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(query);
    });
  }, [q, status]);

  const clientGroups = useMemo(() => {
    const map = new Map();

    filteredInvoices.forEach((inv) => {
      const key = makeClientKey(inv);
      const email = String(inv?.customerEmail || "").trim();
      const name = String(inv?.customer || "").trim() || email || "Client";

      if (!map.has(key)) {
        map.set(key, { key, name, email, invoices: [] });
      }
      map.get(key).invoices.push(inv);
    });

    const clients = Array.from(map.values());
    clients.sort((a, b) => String(a.name).localeCompare(String(b.name)));

    clients.forEach((c) => {
      c.invoices.sort((a, b) =>
        String(b.dateIssued || "").localeCompare(String(a.dateIssued || ""))
      );
    });

    return clients;
  }, [filteredInvoices]);

  const openClient = useMemo(() => {
    if (!openClientKey) return null;
    return clientGroups.find((c) => c.key === openClientKey) || null;
  }, [openClientKey, clientGroups]);

  function openClientInvoices(key) {
    setOpenClientKey(key);
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  }

  function closeClientInvoices() {
    setOpenClientKey("");
  }

  function openInvoiceHtml(inv) {
    const apiBase = getApiBase();
    if (!apiBase) {
      alert("Missing VITE_API_BASE_URL");
      return;
    }

    const booksInvoiceId =
      String(inv?.booksInvoiceId || "").trim() || String(inv?.id || "").trim();

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
        [invoiceId]: { state: "error", message: "Missing debitOrderId on this row" }
      }));
      return;
    }

    setBooksState((prev) => ({
      ...prev,
      [invoiceId]: { state: "loading", message: "Syncing to Books..." }
    }));

    try {
      const apiBase = getApiBase();
      if (!apiBase) throw new Error("Missing VITE_API_BASE_URL");

      const url = `${apiBase}/api/books/invoices/create-from-debit-order`;
      const out = await postJson(url, { debitOrderId });

      const booksInvoiceId = out?.booksInvoiceId ? String(out.booksInvoiceId) : "";
      const invoiceNumber = out?.invoiceNumber ? String(out.invoiceNumber) : "";

      const msg = invoiceNumber
        ? `Books linked: ${invoiceNumber}`
        : booksInvoiceId
        ? `Books linked: ${booksInvoiceId}`
        : "Books linked";

      setBooksState((prev) => ({
        ...prev,
        [invoiceId]: { state: "ok", message: msg }
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

  return (
    <div className="tt-page">
      <div className="tt-surface">
        <div className="tt-header">
          <div className="tt-title">
            <h1>Invoices</h1>
            <p>Clients first. Use the eye icon to view invoices, then print or download.</p>
          </div>

          <div className="tt-toolbar">
            <input
              className="tt-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search client, email, invoice, status, date..."
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

        {openClient ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 12,
              padding: "14px 14px",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(139,92,246,0.20)",
                  border: "1px solid rgba(139,92,246,0.35)",
                  fontWeight: 900,
                  color: "rgba(199,175,255,0.98)"
                }}
              >
                {initials(openClient.name)}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>
                  {openClient.name}
                </div>
                <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                  {openClient.email || " "}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="tt-btn tt-btn-primary"
              onClick={closeClientInvoices}
              aria-label="Back to clients list"
            >
              Back
            </button>
          </div>
        ) : null}

        <div className="tt-table-wrap">
          {!openClient ? (
            <table className="tt-table" role="table" aria-label="Clients table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th style={{ width: 320 }}>Invoice To</th>
                  <th style={{ width: 140, textAlign: "right" }}>Invoices</th>
                  <th style={{ width: 170, textAlign: "right" }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {clientGroups.map((c) => (
                  <tr key={c.key}>
                    <td style={{ fontWeight: 800 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 999,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.10)",
                            fontWeight: 900,
                            color: "rgba(255,255,255,0.90)"
                          }}
                        >
                          {initials(c.name)}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontWeight: 800 }}>{c.name}</span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>
                            {c.email || " "}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td style={{ color: "rgba(255,255,255,0.72)" }}>
                      {c.email || " "}
                    </td>

                    <td style={{ textAlign: "right", fontWeight: 800 }}>
                      {c.invoices.length}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 10, justifyContent: "flex-end" }}>
                        <IconButton
                          title="View invoices"
                          ariaLabel={`View invoices for ${c.name}`}
                          onClick={() => openClientInvoices(c.key)}
                          tone="purple"
                        >
                          <EyeIcon />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}

                {clientGroups.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 18, color: "rgba(255,255,255,0.70)" }}>
                      No clients match your current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="tt-table" role="table" aria-label={`Invoices for ${openClient.name}`}>
              <thead>
                <tr>
                  <th style={{ width: 160 }}>Invoice ID</th>
                  <th style={{ width: 220 }}>Created On</th>
                  <th style={{ width: 220 }}>Due Date</th>
                  <th style={{ width: 160, textAlign: "right" }}>Amount</th>
                  <th style={{ width: 160 }}>Status</th>
                  <th style={{ width: 220, textAlign: "right" }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {openClient.invoices.map((inv) => {
                  const totals = calcTotals(inv);
                  const rowState = booksState[String(inv.id)] || { state: "idle", message: "" };
                  const canSync = Boolean(inv?.debitOrderId);

                  return (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 900, letterSpacing: 0.2 }}>
                        {inv.id}
                        {inv.booksInvoiceId ? (
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
                            Books: {String(inv.booksInvoiceId)}
                          </div>
                        ) : null}

                        {rowState.state !== "idle" ? (
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 12,
                              color:
                                rowState.state === "ok"
                                  ? "rgba(180,255,210,0.85)"
                                  : rowState.state === "error"
                                  ? "rgba(255,170,170,0.85)"
                                  : "rgba(255,255,255,0.65)"
                            }}
                          >
                            {rowState.message}
                          </div>
                        ) : null}
                      </td>

                      <td>{formatDateYmdToDmy(inv.dateIssued)}</td>
                      <td>{formatDateYmdToDmy(inv.dueDate)}</td>

                      <td style={{ textAlign: "right", fontWeight: 900 }}>
                        {money(totals.total, inv.currency)}
                      </td>

                      <td>
                        <StatusPill status={inv.status} />
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 10, justifyContent: "flex-end" }}>
                          <IconButton
                            title="Print (opens HTML)"
                            ariaLabel={`Print invoice ${inv.id}`}
                            onClick={() => openInvoiceHtml(inv)}
                            tone="purple"
                          >
                            <PrintIcon />
                          </IconButton>

                          <IconButton
                            title="Download PDF"
                            ariaLabel={`Download invoice ${inv.id}`}
                            onClick={() => downloadInvoicePdf(inv)}
                            tone="green"
                          >
                            <DownloadIcon />
                          </IconButton>

                          <IconButton
                            title="Sync to Books"
                            ariaLabel={`Sync invoice ${inv.id} to Books`}
                            onClick={() => onSyncToBooks(inv)}
                            tone="purple"
                            disabled={!canSync || rowState.state === "loading"}
                          >
                            <LinkIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {openClient.invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 18, color: "rgba(255,255,255,0.70)" }}>
                      No invoices found for this client.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="tt-footer-note">
          Eye icon opens client invoices. Print opens the HTML invoice. Download uses PDF once the backend route exists.
        </div>
      </div>
    </div>
  );
}
