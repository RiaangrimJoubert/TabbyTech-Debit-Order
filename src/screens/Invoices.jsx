// src/screens/Invoices.jsx
import React, { useEffect, useMemo, useState } from "react";
import { request, requestBlob, API_BASE } from "../api";
import * as XLSX from "xlsx";
import { money, calcTotals } from "../data/invoices.js";
import "../styles/invoice.css";
import { ShimmerTableRows } from "../components/ShimmerSkeleton";

const INVOICES_CACHE_TTL_MS = 15 * 60 * 1000;

let invoicesScreenCache = {
  invoices: [],
  q: "",
  status: "All",
  selectedClientKey: "",
  pageSize: 10,
  page: 1,
  loadErr: "",
  lastLoadedAt: 0,
};

function hasFreshInvoicesCache() {
  return (
    Array.isArray(invoicesScreenCache.invoices) &&
    invoicesScreenCache.invoices.length > 0 &&
    Date.now() - Number(invoicesScreenCache.lastLoadedAt || 0) < INVOICES_CACHE_TTL_MS
  );
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
  const s = String(status || "").trim().toLowerCase();
  if (s === "paid") return "paid";
  if (s === "unpaid") return "unpaid";
  if (s === "draft") return "unpaid";
  return "overdue";
}

function safeInvoiceLabel(inv) {
  return String(inv?.id || "Invoice").trim();
}

function normalizeInvoice(inv) {
  const raw = inv || {};

  const id =
    String(raw.id || raw.invoice_id || raw.invoiceNo || raw.invoice_number || "").trim() ||
    `INV-${Math.random().toString(16).slice(2)}`;

  const customer =
    String(raw.customer || raw.customerName || raw.customer_name || raw.contact_name || "").trim() ||
    "Customer";

  const customerEmail = String(
    raw.customerEmail || raw.customer_email || raw.contact_email || raw.email || ""
  ).trim();

  const apiStatus = String(raw.status || raw.invoice_status || "unpaid").trim().toLowerCase();
  let status = "Unpaid";
  if (apiStatus === "paid") status = "Paid";
  else if (apiStatus === "overdue") status = "Overdue";
  else if (apiStatus === "draft") status = "Unpaid";
  else if (apiStatus === "unpaid") status = "Unpaid";

  const dateIssued = String(raw.dateIssued || raw.date || raw.issuedDate || "").trim();
  const dueDate = String(raw.dueDate || raw.due_date || "").trim();

  const currency = String(raw.currency || raw.currencyCode || raw.currency_code || "ZAR").trim() || "ZAR";

  const booksInvoiceId = String(raw.booksInvoiceId || raw.id || raw.invoice_id || "").trim();
  const debitOrderId = String(raw.debitOrderId || raw.debit_order_id || "").trim();

  const itemsRaw = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.line_items)
      ? raw.line_items
      : [];

  let items = itemsRaw.map((it) => {
    const description = String(it.description || it.name || it.item_name || it.item || "Item");
    const qty = Number(it.qty ?? it.quantity ?? 1);
    const unitPrice = Number(it.unitPrice ?? it.rate ?? it.unit_price ?? 0);

    return {
      description,
      qty: Number.isFinite(qty) ? qty : 1,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0
    };
  });

  const apiTotal = Number(raw.total ?? raw.invoice_total ?? raw.amount ?? 0);
  const apiBalance = Number(raw.balance ?? raw.amount_due ?? 0);

  if ((!items || items.length === 0) && Number.isFinite(apiTotal) && apiTotal > 0) {
    items = [
      {
        description: "TabbyPay Subscription",
        qty: 1,
        unitPrice: apiTotal
      }
    ];
  }

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
    debitOrderId,
    apiTotal: Number.isFinite(apiTotal) ? apiTotal : 0,
    apiBalance: Number.isFinite(apiBalance) ? apiBalance : 0
  };
}

async function fetchInvoicesFromApi() {
  const json = await request("/api/invoices?page=1&perPage=200", { method: "GET" });

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
  const [q, setQ] = useState(() => String(invoicesScreenCache.q || ""));
  const [status, setStatus] = useState(() => String(invoicesScreenCache.status || "All"));
  const [selectedClientKey, setSelectedClientKey] = useState(() => String(invoicesScreenCache.selectedClientKey || ""));
  const [pageSize, setPageSize] = useState(() => {
    const n = Number(invoicesScreenCache.pageSize || 10);
    return Number.isFinite(n) && n > 0 ? n : 10;
  });
  const [page, setPage] = useState(() => {
    const n = Number(invoicesScreenCache.page || 1);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });

  const [invoices, setInvoices] = useState(() =>
    Array.isArray(invoicesScreenCache.invoices) ? invoicesScreenCache.invoices : []
  );
  const [loadErr, setLoadErr] = useState(() => String(invoicesScreenCache.loadErr || ""));
  const [loading, setLoading] = useState(() => !hasFreshInvoicesCache());

  useEffect(() => {
    invoicesScreenCache = {
      ...invoicesScreenCache,
      invoices,
      q,
      status,
      selectedClientKey,
      pageSize,
      page,
      loadErr,
      lastLoadedAt: invoicesScreenCache.lastLoadedAt,
    };
  }, [invoices, q, status, selectedClientKey, pageSize, page, loadErr]);

  useEffect(() => {
    let alive = true;

    async function run({ force = false } = {}) {
      if (!force && hasFreshInvoicesCache()) {
        if (!alive) return;
        setInvoices(Array.isArray(invoicesScreenCache.invoices) ? invoicesScreenCache.invoices : []);
        setLoadErr(String(invoicesScreenCache.loadErr || ""));
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadErr("");

      try {
        const items = await fetchInvoicesFromApi();
        if (!alive) return;

        const nextItems = items || [];
        setInvoices(nextItems);

        invoicesScreenCache = {
          ...invoicesScreenCache,
          invoices: nextItems,
          q,
          status,
          selectedClientKey,
          pageSize,
          page,
          loadErr: "",
          lastLoadedAt: Date.now(),
        };
      } catch (e) {
        if (!alive) return;

        const nextErr = e?.message || "Failed to load invoices";
        setInvoices([]);
        setLoadErr(nextErr);

        invoicesScreenCache = {
          ...invoicesScreenCache,
          invoices: [],
          loadErr: nextErr,
          lastLoadedAt: 0,
        };
      } finally {
        if (alive) setLoading(false);
      }
    }

    run({ force: false });

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

  const uniqueClientRows = useMemo(() => {
    const map = new Map();

    for (const inv of filteredInvoices) {
      const clientKey = makeClientKeyFromInvoice(inv);
      const existing = map.get(clientKey);

      if (!existing) {
        map.set(clientKey, {
          clientKey,
          customer: inv.customer,
          customerEmail: inv.customerEmail,
          latestInvoiceId: inv.id,
          latestBooksInvoiceId: inv.booksInvoiceId,
          latestDateIssued: inv.dateIssued,
          latestDueDate: inv.dueDate,
          latestStatus: inv.status,
          currency: inv.currency,
          invoiceCount: 1,
          invoices: [inv]
        });
        continue;
      }

      existing.invoiceCount += 1;
      existing.invoices.push(inv);

      const existingDate = String(existing.latestDateIssued || "");
      const currentDate = String(inv.dateIssued || "");
      if (currentDate.localeCompare(existingDate) > 0) {
        existing.latestInvoiceId = inv.id;
        existing.latestBooksInvoiceId = inv.booksInvoiceId;
        existing.latestDateIssued = inv.dateIssued;
        existing.latestDueDate = inv.dueDate;
        existing.latestStatus = inv.status;
        existing.currency = inv.currency;
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      String(b.latestDateIssued || "").localeCompare(String(a.latestDateIssued || ""))
    );
  }, [filteredInvoices]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(uniqueClientRows.length / Math.max(1, pageSize)));
  }, [uniqueClientRows.length, pageSize]);

  const pageClamped = useMemo(() => {
    if (page < 1) return 1;
    if (page > totalPages) return totalPages;
    return page;
  }, [page, totalPages]);

  const pagedClientRows = useMemo(() => {
    const start = (pageClamped - 1) * pageSize;
    return uniqueClientRows.slice(start, start + pageSize);
  }, [uniqueClientRows, pageClamped, pageSize]);

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

  function onView(clientRow) {
    setSelectedClientKey(clientRow.clientKey);
    setTimeout(() => {
      const el = document.getElementById("tt-client-panel");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function closePanel() {
    setSelectedClientKey("");
  }

  function openInvoiceHtml(inv) {
    const booksInvoiceId = String(inv?.booksInvoiceId || "").trim();
    const fallback = String(inv?.id || "").trim();
    const id = booksInvoiceId || fallback;

    const url = `${API_BASE}/api/invoice-html/${encodeURIComponent(id)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState("");

  async function downloadInvoicePdf(inv) {
    const booksInvoiceId = String(inv?.booksInvoiceId || "").trim();
    const fallback = String(inv?.id || "").trim();
    const id = booksInvoiceId || fallback;

    if (!id) return;
    setDownloadingInvoiceId(id);

    try {
      const url = `${API_BASE}/api/invoice-html/${encodeURIComponent(id)}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Failed to fetch HTML");
      const htmlText = await resp.text();

      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.top = "-9999px";
      container.style.left = "-9999px";
      container.style.width = "900px";
      container.innerHTML = htmlText;
      document.body.appendChild(container);

      // Give images a tiny moment to load
      await new Promise(r => setTimeout(r, 200));

      const node = container.querySelector(".invoice-container");
      if (!node) throw new Error("Could not find invoice container");

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#111827",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      
      const invEl = node.querySelector(".invoice-number");
      const filename = (invEl ? invEl.textContent.replace(/[^a-zA-Z0-9-]/g, "") : "invoice") + ".pdf";
      
      pdf.save(filename);
      document.body.removeChild(container);
    } catch (e) {
      console.error("PDF generation failed:", e);
      openInvoiceHtml(inv);
    } finally {
      setDownloadingInvoiceId("");
    }
  }

  async function syncNow() {
    setLoading(true);
    setLoadErr("");

    try {
      const items = await fetchInvoicesFromApi();
      const nextItems = items || [];
      setInvoices(nextItems);

      invoicesScreenCache = {
        ...invoicesScreenCache,
        invoices: nextItems,
        q,
        status,
        selectedClientKey,
        pageSize,
        page,
        loadErr: "",
        lastLoadedAt: Date.now(),
      };
    } catch (e) {
      const nextErr = e?.message || "Failed to load invoices";
      setInvoices([]);
      setLoadErr(nextErr);

      invoicesScreenCache = {
        ...invoicesScreenCache,
        invoices: [],
        loadErr: nextErr,
        lastLoadedAt: 0,
      };
    } finally {
      setLoading(false);
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

  const canPrev = pageClamped > 1;
  const canNext = pageClamped < totalPages;

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

              <button
                type="button"
                className="tt-btn tt-btn-primary"
                onClick={syncNow}
                disabled={loading}
                aria-label="Sync invoices now"
              >
                {loading ? "Syncing..." : "Sync now"}
              </button>
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
          <div style={{ overflowX: "auto" }}>
            <table className="tt-table tt-table-invoices" role="table" aria-label="Loading invoices">
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
                <ShimmerTableRows rows={6} cols={7} />
              </tbody>
            </table>
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
              {pagedClientRows.map((clientRow) => {
                const latestInvoice = clientRow.invoices[0] || null;
                const totals = latestInvoice ? calcTotals(latestInvoice) : { total: 0 };
                const dotClass = statusDotClass(String(clientRow.latestStatus || "Overdue"));

                return (
                  <tr key={clientRow.clientKey}>
                    <td className="tt-cell-strong">{clientRow.latestInvoiceId}</td>

                    <td>
                      <span className="tt-badge">
                        <span className={`tt-dot ${dotClass}`} />
                        <span className="tt-badge-text">{clientRow.latestStatus}</span>
                      </span>
                    </td>

                    <td>
                      <div className="tt-customer">
                        <span className="tt-customer-name">{clientRow.customer}</span>
                        <span className="tt-customer-email">{clientRow.customerEmail}</span>
                      </div>
                    </td>

                    <td>{clientRow.latestDateIssued}</td>
                    <td>{clientRow.latestDueDate}</td>

                    <td className="tt-td-right tt-cell-strong">
                      {money(totals.total || 0, clientRow.currency)}
                    </td>

                    <td className="tt-td-right">
                      <button
                        type="button"
                        className="tt-iconbtn tt-iconbtn-view"
                        onClick={() => onView(clientRow)}
                        aria-label={`View invoices for ${clientRow.customer}`}
                        title="View client invoices"
                      >
                        <SvgEye />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {pagedClientRows.length === 0 && !loading && (
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
                Page {pageClamped} of {totalPages}
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
                              disabled={downloadingInvoiceId === invId}
                              aria-label={`Download invoice ${invId}`}
                              title="Download PDF"
                            >
                              {downloadingInvoiceId === invId ? (
                                <div style={{
                                  width: "16px",
                                  height: "16px",
                                  border: "2px solid rgba(255,255,255,0.3)",
                                  borderTopColor: "#fff",
                                  borderRadius: "50%",
                                  animation: "spin 1s linear infinite"
                                }}>
                                  <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                                </div>
                              ) : (
                                <SvgDownload />
                              )}
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
