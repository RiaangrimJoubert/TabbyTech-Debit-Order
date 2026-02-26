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

export default function Invoices() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");

  // Which client row is expanded
  const [openClientKey, setOpenClientKey] = useState("");

  // Per-invoice Books sync status
  // { [invoiceId]: { state: "idle"|"loading"|"ok"|"error", message: string } }
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
        map.set(key, {
          key,
          name,
          email,
          invoices: []
        });
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

  function toggleClient(key) {
    setOpenClientKey((prev) => (prev === key ? "" : key));
  }

  function openInvoiceHtml(inv) {
    const apiBase = getApiBase();
    if (!apiBase) {
      alert("Missing VITE_API_BASE_URL");
      return;
    }

    // Prefer Books invoice id if present
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
        [invoiceId]: {
          state: "error",
          message: "Missing debitOrderId on this invoice row"
        }
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
        [invoiceId]: {
          state: "error",
          message: String(e?.message || e)
        }
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
            <p>
              Clients first. Expand a client to see all invoices, then print or download.
            </p>
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

        <div className="tt-table-wrap">
          <table className="tt-table" role="table" aria-label="Clients table">
            <thead>
              <tr>
                <th>Client</th>
                <th style={{ width: 280 }}>Email</th>
                <th style={{ width: 140, textAlign: "right" }}>Invoices</th>
                <th style={{ width: 220, textAlign: "right" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {clientGroups.map((c) => {
                const isOpen = openClientKey === c.key;

                return (
                  <React.Fragment key={c.key}>
                    <tr>
                      <td style={{ fontWeight: 700 }}>{c.name}</td>
                      <td style={{ color: "rgba(255,255,255,0.70)" }}>
                        {c.email || " "}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {c.invoices.length}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="tt-actions" style={{ justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="tt-linkbtn"
                            onClick={() => toggleClient(c.key)}
                            aria-label={`View invoices for ${c.name}`}
                          >
                            {isOpen ? "Hide invoices" : "View invoices"}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan={4} style={{ padding: 0 }}>
                          <div style={{ padding: 14 }}>
                            <div
                              style={{
                                color: "rgba(255,255,255,0.75)",
                                fontSize: 12,
                                marginBottom: 10
                              }}
                            >
                              Invoices for {c.name}
                            </div>

                            <div style={{ overflowX: "auto" }}>
                              <table className="tt-table" role="table" aria-label={`Invoices for ${c.name}`}>
                                <thead>
                                  <tr>
                                    <th style={{ width: 160 }}>Invoice</th>
                                    <th style={{ width: 140 }}>Status</th>
                                    <th style={{ width: 170 }}>Issued</th>
                                    <th style={{ width: 170 }}>Due</th>
                                    <th style={{ width: 160, textAlign: "right" }}>Total</th>
                                    <th style={{ width: 360, textAlign: "right" }}>Actions</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {c.invoices.map((inv) => {
                                    const totals = calcTotals(inv);

                                    const dotClass =
                                      inv.status === "Paid"
                                        ? "paid"
                                        : inv.status === "Unpaid"
                                        ? "unpaid"
                                        : "overdue";

                                    const rowState = booksState[String(inv.id)] || { state: "idle", message: "" };
                                    const canSync = Boolean(inv?.debitOrderId);

                                    return (
                                      <tr key={inv.id}>
                                        <td style={{ fontWeight: 700, letterSpacing: 0.2 }}>
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
                                          <span className="tt-badge">
                                            <span className={`tt-dot ${dotClass}`} />
                                            {inv.status}
                                          </span>
                                        </td>

                                        <td>{inv.dateIssued}</td>
                                        <td>{inv.dueDate}</td>

                                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                                          {money(totals.total, inv.currency)}
                                        </td>

                                        <td style={{ textAlign: "right" }}>
                                          <div
                                            className="tt-actions"
                                            style={{
                                              justifyContent: "flex-end",
                                              flexWrap: "wrap",
                                              gap: 10
                                            }}
                                          >
                                            <button
                                              type="button"
                                              className="tt-linkbtn"
                                              onClick={() => openInvoiceHtml(inv)}
                                              aria-label={`Print invoice ${inv.id}`}
                                              title="Opens the HTML invoice in a new tab for printing"
                                            >
                                              Print
                                            </button>

                                            <button
                                              type="button"
                                              className="tt-linkbtn"
                                              onClick={() => downloadInvoicePdf(inv)}
                                              aria-label={`Download invoice ${inv.id} as PDF`}
                                              title="Downloads the invoice PDF when available. If not available, it opens the HTML invoice."
                                            >
                                              Download
                                            </button>

                                            <button
                                              type="button"
                                              className="tt-linkbtn"
                                              onClick={() => onSyncToBooks(inv)}
                                              disabled={!canSync || rowState.state === "loading"}
                                              aria-label={`Sync invoice ${inv.id} to Books`}
                                              title={
                                                !canSync
                                                  ? "This invoice row does not have a debitOrderId mapped yet"
                                                  : "Creates or reuses a Books invoice for this debit order"
                                              }
                                              style={{
                                                opacity: !canSync ? 0.45 : 1,
                                                pointerEvents: !canSync ? "none" : "auto"
                                              }}
                                            >
                                              {rowState.state === "loading" ? "Syncing..." : "Sync to Books"}
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}

                                  {c.invoices.length === 0 && (
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
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {clientGroups.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 18, color: "rgba(255,255,255,0.70)" }}>
                    No clients match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="tt-footer-note">
          View invoices expands the client row. Print opens the HTML invoice. Download will use PDF once the backend route exists.
        </div>
      </div>
    </div>
  );
}
