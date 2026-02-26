// src/pages/InvoiceHtml.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

/**
 * TABBYPAY INVOICE (HTML TEMPLATE VIEW)
 * - Full file as requested
 * - Does NOT touch AppShell, Login, or routing
 * - Uses your premium purple styling (no green)
 * - Fetches invoice data from backend JSON endpoint
 * - Download PDF button calls backend PDF endpoint (Option A)
 *
 * EXPECTED BACKEND ENDPOINTS (you can keep your existing ones, adjust constants below if needed):
 * 1) GET  /api/invoices/:invoiceId            -> returns JSON invoice payload
 * 2) GET  /api/invoices/:invoiceId/pdf        -> returns application/pdf (generated from your HTML template)
 */

const API_BASE = (import.meta?.env?.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const INVOICE_JSON_PATH = "/api/invoices"; // GET /api/invoices/:id
const INVOICE_PDF_PATH = "/api/invoices"; // GET /api/invoices/:id/pdf

export default function InvoiceHtml() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [downloadBusy, setDownloadBusy] = useState(false);

  const safeInvoiceId = useMemo(() => decodeURIComponent(String(invoiceId || "")).trim(), [invoiceId]);

  // Back link key for your existing portal route pattern
  const customerKey = useMemo(() => {
    if (!invoice) return "unknown";
    const email = String(invoice?.customer?.email || invoice?.customerEmail || "").toLowerCase().trim();
    const name = String(invoice?.customer?.name || invoice?.customerName || "").toLowerCase().trim();
    const key = email || name || "unknown";
    return encodeURIComponent(key);
  }, [invoice]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErrMsg("");
      setInvoice(null);

      try {
        if (!safeInvoiceId) {
          throw new Error("Missing invoice id in the URL.");
        }

        const url = `${API_BASE}${INVOICE_JSON_PATH}/${encodeURIComponent(safeInvoiceId)}`;
        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (!res.ok) {
          let extra = "";
          try {
            if (ct.includes("application/json")) {
              const j = await res.json();
              extra = j?.message || j?.error || "";
            } else {
              extra = await res.text();
            }
          } catch {
            // ignore
          }
          throw new Error(extra ? `Failed to load invoice. ${extra}` : "Failed to load invoice.");
        }

        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            "Invoice endpoint did not return JSON. Check VITE_API_BASE_URL and the /api route. Received non-JSON response."
          );
        }

        const data = await res.json();
        if (!alive) return;

        // Normalize minimal fields without guessing your entire schema
        const normalized = normalizeInvoicePayload(data, safeInvoiceId);
        setInvoice(normalized);
      } catch (e) {
        if (!alive) return;
        setErrMsg(String(e?.message || e || "Unknown error"));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [safeInvoiceId]);

  function onPrint() {
    window.print();
  }

  async function onDownloadPdf() {
    if (!safeInvoiceId) return;

    setDownloadBusy(true);
    setErrMsg("");

    try {
      const url = `${API_BASE}${INVOICE_PDF_PATH}/${encodeURIComponent(safeInvoiceId)}/pdf`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/pdf" },
        credentials: "include",
      });

      if (!res.ok) {
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        let extra = "";
        try {
          extra = ct.includes("application/json") ? (await res.json())?.message || "" : await res.text();
        } catch {
          // ignore
        }
        throw new Error(extra ? `PDF generation failed. ${extra}` : "PDF generation failed.");
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) throw new Error("PDF download returned an empty file.");

      const fileName = `Invoice-${sanitizeFilename(invoice?.invoiceNo || invoice?.invoiceNumber || safeInvoiceId)}.pdf`;

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setErrMsg(String(e?.message || e || "Unknown PDF error"));
    } finally {
      setDownloadBusy(false);
    }
  }

  if (loading) {
    return (
      <div style={pageBgStyle}>
        <StyleBlock />
        <div className="invoice-container" style={{ padding: 40 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Loading invoice...</div>
          <div style={{ marginTop: 10, color: "#94a3b8" }}>Please wait.</div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={pageBgStyle}>
        <StyleBlock />
        <div className="invoice-container" style={{ padding: 40 }}>
          <div style={{ fontWeight: 900, fontSize: 20, color: "#fff" }}>Invoice not found</div>
          <div style={{ marginTop: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            {errMsg || "The invoice ID in the URL does not match a known invoice."}
          </div>

          <div className="tt-actions noprint" style={{ marginTop: 18, justifyContent: "flex-start" }}>
            <button
              type="button"
              className="tt-btn tt-btn-pill"
              onClick={() => navigate(-1)}
              title="Go back"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const issueDate = fmtDateZA(invoice.invoiceDate);
  const dueDate = fmtDateZA(invoice.dueDate || invoice.invoiceDate);

  const lineItems = Array.isArray(invoice.items) ? invoice.items : [];
  const totals = calcTotals(lineItems);

  const paidAmount = toNumber(invoice.paymentMade ?? invoice.amountPaid ?? 0);
  const balance = Math.max(0, toNumber(invoice.balance ?? (totals.total - paidAmount)));

  const statusClass = String(invoice.status || "").toLowerCase() === "paid" ? "" : "pending";
  const statusText = String(invoice.status || "Pending").toUpperCase();

  return (
    <div style={pageBgStyle}>
      <StyleBlock />

      <div className="invoice-container">
        {/* Header */}
        <div className="invoice-header">
          <div className="logo-section">
            <img
              src={invoice.logoUrl}
              alt="TabbyTech Logo"
              className="logo-image"
              onError={(e) => {
                // Keep it safe if logo fails. Do not crash.
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="company-info">
              <h1>TabbyTech</h1>
              <div className="solution-name">TabbyPay</div>
              <p>{invoice.fromEmail || "billing@tabbytech.co.za"}</p>
            </div>
          </div>

          <div className="invoice-title">
            <h2 className="glow-text">INVOICE</h2>
            <div className="invoice-number">#{invoice.invoiceNo}</div>

            {/* Action buttons (premium purple, no green) */}
            <div className="tt-actions noprint" style={{ marginTop: 16 }}>
              <Link className="tt-btn tt-btn-pill" to={`/portal/${customerKey}`}>
                Back
              </Link>

              <button type="button" className="tt-btn tt-btn-pill" onClick={onPrint}>
                Print
              </button>

              <button
                type="button"
                className="tt-btn tt-btn-pill tt-btn-premium"
                onClick={onDownloadPdf}
                disabled={downloadBusy}
                title="Generate and download PDF"
              >
                {downloadBusy ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="invoice-body">
          {/* Company details + invoice info */}
          <div className="details-grid">
            <div className="detail-box">
              <h3>From</h3>
              <strong>{invoice.fromCompany || "TabbyTech Pty Ltd"}</strong>
              <p>{invoice.fromEmail || "billing@tabbytech.co.za"}</p>
              <p>{invoice.fromPhone || "+27 76 713 6914"}</p>
              <p>{invoice.fromReg || "Registration NR 2023/149930/07"}</p>
              <p>{invoice.fromWebsite || "tabbytech.co.za"}</p>
            </div>

            <div className="detail-box" style={{ textAlign: "right" }}>
              <h3>Invoice Details</h3>
              <p>
                <strong style={inlineLabelStyle}>Invoice Date:</strong> {issueDate}
              </p>
              <p>
                <strong style={inlineLabelStyle}>Due Date:</strong> {dueDate}
              </p>
            </div>
          </div>

          {/* Bill To + Balance */}
          <div className="details-grid" style={{ marginTop: -20 }}>
            <div className="detail-box">
              <h3>Bill to</h3>
              <strong style={{ color: "#8b5cf6" }}>{invoice.customerName}</strong>
            </div>

            <div className="detail-box" style={{ textAlign: "right" }}>
              <h3>Balance Due</h3>
              <strong style={balanceStyle}>{moneyZA(balance)}</strong>
            </div>
          </div>

          {/* Items */}
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: "10%" }}>#</th>
                <th style={{ width: "50%" }}>Item</th>
                <th>Qty</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 24, color: "#94a3b8" }}>
                    No line items found for this invoice.
                  </td>
                </tr>
              ) : (
                lineItems.map((it, idx) => (
                  <tr key={`line-${idx}`}>
                    <td>{idx + 1}</td>
                    <td>
                      <div className="item-name">{String(it.name || it.description || "Item")}</div>
                      {it.extra ? <div className="item-desc">{String(it.extra)}</div> : null}
                    </td>
                    <td>{fmtQty(it.qty)}</td>
                    <td className="text-right">{moneyZA(toNumber(it.amount))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="totals-section">
            <div className="totals-box">
              <div className="total-row">
                <span>Sub Total</span>
                <span>{moneyZA(totals.subtotal)}</span>
              </div>

              <div className="total-row">
                <span>Total</span>
                <span>{moneyZA(totals.total)}</span>
              </div>

              <div className="total-row discount" style={{ color: "#f87171" }}>
                <span>Payment Made</span>
                <span>({formatMinusMoneyZA(paidAmount)})</span>
              </div>

              <div
                className="total-row final"
                style={{
                  background: "rgba(139, 92, 246, 0.1)",
                  padding: 15,
                  borderRadius: 8,
                  marginTop: 15,
                }}
              >
                <span>Balance</span>
                <span>{moneyZA(balance)}</span>
              </div>
            </div>
          </div>

          {/* Payment Note */}
          <div className="notes-section">
            <h4>📝 Payment Note</h4>
            <p>
              {invoice.paymentNote ||
                "We will automatically charge the amount of your subscription to your Bank Account on the 25th of each month. Should it be unsuccessful we will retry on the 1st. If your account has changed or you know of any other problem, kindly get in touch with us to avoid possible billing problems."}
            </p>
          </div>

          {/* Terms */}
          <div className="terms-section">
            <h4>Terms & Conditions</h4>
            <p>
              Please visit our Website{" "}
              <a href="https://tabbytech.co.za/terms-conditions" target="_blank" rel="noreferrer">
                https://tabbytech.co.za/terms-conditions
              </a>{" "}
              to view our full T&amp;C&apos;s
            </p>
          </div>

          {/* Footer */}
          <div className="invoice-footer">
            <div className="payment-info">
              <h4>Status</h4>
              <p>{statusText}</p>
              {errMsg ? (
                <p style={{ marginTop: 10, color: "#fca5a5" }}>{errMsg}</p>
              ) : null}
            </div>
            <div className={`status-badge ${statusClass}`}>{statusText}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
   Helpers
----------------------------- */

function normalizeInvoicePayload(data, fallbackId) {
  // Accept either { invoice: {...} } or direct invoice object
  const src = data?.invoice ? data.invoice : data;

  // Your main requirements:
  // - invoiceNo from Zoho Books
  // - customer name, not customer code
  // - items and amounts
  // - cross-ref transaction values
  const invoiceNo =
    String(src?.invoice_no || src?.invoiceNo || src?.invoice_number || src?.invoiceNumber || fallbackId || "").trim() ||
    String(fallbackId || "INV").trim();

  const customerName =
    String(
      src?.customer_name ||
        src?.customerName ||
        src?.customer?.name ||
        src?.customer?.displayName ||
        src?.contact_name ||
        "Customer"
    ).trim() || "Customer";

  const customerEmail = String(src?.customer_email || src?.customerEmail || src?.customer?.email || "").trim();

  const itemsRaw = Array.isArray(src?.items) ? src.items : Array.isArray(src?.line_items) ? src.line_items : [];
  const items = itemsRaw.map((it) => {
    const name = String(it?.name || it?.item_name || it?.description || "Item").trim();
    const qty = toNumber(it?.qty ?? it?.quantity ?? 1);
    const amount = toNumber(it?.amount ?? it?.line_total ?? it?.total ?? it?.rate ?? 0);

    return {
      name,
      qty: qty || 1,
      amount,
      extra: "",
      itemId: String(it?.item_id || it?.itemId || it?.code || "").trim(),
    };
  });

  // Payment made can come from transaction cross-ref, or from Zoho fields
  const paymentMade = toNumber(
    src?.payment_made ??
      src?.paymentMade ??
      src?.amount_paid ??
      src?.amountPaid ??
      src?.payments?.total ??
      src?.transaction?.amount ??
      0
  );

  const balance = toNumber(src?.balance ?? src?.balance_due ?? src?.balanceDue ?? Math.max(0, calcTotals(items).total - paymentMade));

  const invoiceDate = String(src?.invoice_date || src?.invoiceDate || src?.date || src?.issuedDate || "").trim();
  const dueDate = String(src?.due_date || src?.dueDate || "").trim();

  const status = String(src?.status || src?.invoice_status || "").trim() || (balance <= 0 ? "Paid" : "Pending");

  return {
    id: String(src?.id || src?.invoice_id || src?.invoiceId || fallbackId || invoiceNo),
    invoiceNo,
    invoiceDate,
    dueDate,
    status,

    customerName,
    customerEmail,

    items,

    paymentMade,
    balance,

    // Static branding (you can move these into your backend later if you prefer)
    logoUrl:
      String(src?.logo_url || src?.logoUrl || "").trim() ||
      "https://raw.githubusercontent.com/RiaangrimJoubert/TabbyTech-Debit-Order/refs/heads/main/public/WP%20LOGO%20(1).png",

    fromCompany: "TabbyTech Pty Ltd",
    fromEmail: "billing@tabbytech.co.za",
    fromPhone: "+27 76 713 6914",
    fromReg: "Registration NR 2023/149930/07",
    fromWebsite: "tabbytech.co.za",

    paymentNote:
      String(src?.payment_note || src?.paymentNote || "").trim() ||
      "We will automatically charge the amount of your subscription to your Bank Account on the 25th of each month. Should it be unsuccessful we will retry on the 1st. If your account has changed or you know of any other problem, kindly get in touch with us to avoid possible billing problems.",
  };
}

function calcTotals(items) {
  const subtotal = (items || []).reduce((sum, it) => sum + toNumber(it?.amount || 0), 0);
  return { subtotal, total: subtotal };
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function moneyZA(amount) {
  const n = toNumber(amount);
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(n);
}

function formatMinusMoneyZA(amount) {
  const n = Math.abs(toNumber(amount));
  // output like 1.00 without currency symbol duplication
  const val = new Intl.NumberFormat("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return `- ${val}`;
}

function fmtQty(qty) {
  const n = toNumber(qty || 0);
  if (!n) return "1.00";
  return new Intl.NumberFormat("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtDateZA(iso) {
  const s = String(iso || "").trim();
  if (!s) return "";
  // If already looks like dd/mm/yy, keep it
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function sanitizeFilename(name) {
  return String(name || "invoice")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/* -----------------------------
   Inline styles for wrapper
----------------------------- */

const pageBgStyle = {
  fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  background: "#0a0e1a",
  minHeight: "100vh",
  padding: "40px 20px",
  color: "#e2e8f0",
};

const inlineLabelStyle = {
  color: "#8b5cf6",
  fontSize: 16,
  display: "inline",
  fontWeight: 700,
};

const balanceStyle = {
  fontSize: 32,
  color: "#fff",
  textShadow: "0 0 20px rgba(139, 92, 246, 0.5)",
  fontWeight: 800,
};

/* -----------------------------
   CSS Template (your preferred)
----------------------------- */

function StyleBlock() {
  return (
    <style>
      {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        /* Container */
        .invoice-container {
          max-width: 850px;
          margin: 0 auto;
          background: #111827;
          border-radius: 24px;
          border: 1px solid #1f2937;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8),
                      0 0 0 1px rgba(139, 92, 246, 0.1);
          overflow: hidden;
        }

        .invoice-header {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          padding: 50px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #7c3aed;
          position: relative;
          overflow: hidden;
          gap: 24px;
          flex-wrap: wrap;
        }

        .invoice-header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 30px;
          position: relative;
          z-index: 1;
        }

        .logo-image {
          width: 120px;
          height: 120px;
          object-fit: contain;
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
        }

        .company-info h1 {
          font-size: 38px;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #fff 0%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .company-info .solution-name {
          font-size: 20px;
          color: #8b5cf6;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .company-info p {
          color: #94a3b8;
          font-size: 15px;
          margin-top: 12px;
          line-height: 1.5;
        }

        .invoice-title {
          text-align: right;
          position: relative;
          z-index: 1;
        }

        .invoice-title h2 {
          font-size: 52px;
          font-weight: 900;
          letter-spacing: 3px;
          margin-bottom: 12px;
          text-transform: uppercase;
          color: #fff;
          text-shadow: 0 0 30px rgba(139, 92, 246, 0.5);
        }

        .invoice-number {
          background: rgba(139, 92, 246, 0.2);
          border: 1px solid rgba(139, 92, 246, 0.3);
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 700;
          color: #c4b5fd;
          display: inline-block;
          backdrop-filter: blur(10px);
        }

        .invoice-body {
          padding: 50px;
          background: #111827;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
          margin-bottom: 50px;
        }

        .detail-box h3 {
          color: #8b5cf6;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 15px;
          font-weight: 700;
        }

        .detail-box p {
          color: #cbd5e1;
          font-size: 15px;
          line-height: 1.7;
          margin-bottom: 6px;
        }

        .detail-box strong {
          color: #fff;
          font-size: 20px;
          display: block;
          margin-bottom: 12px;
          font-weight: 700;
        }

        .items-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-bottom: 40px;
        }

        .items-table thead {
          background: #1e1b4b;
        }

        .items-table th {
          padding: 20px;
          text-align: left;
          color: #c4b5fd;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 700;
          border-bottom: 2px solid #7c3aed;
          border-top: 1px solid #312e81;
        }

        .items-table th:first-child {
          border-top-left-radius: 12px;
        }

        .items-table th:last-child {
          border-top-right-radius: 12px;
          text-align: right;
        }

        .items-table td {
          padding: 24px 20px;
          border-bottom: 1px solid #1f2937;
          color: #94a3b8;
          font-size: 15px;
          background: #0f172a;
        }

        .items-table tr:last-child td:first-child {
          border-bottom-left-radius: 12px;
        }

        .items-table tr:last-child td:last-child {
          border-bottom-right-radius: 12px;
        }

        .item-name {
          font-weight: 700;
          color: #e2e8f0;
          font-size: 16px;
        }

        .text-right { text-align: right; }

        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-top: 40px;
        }

        .totals-box {
          background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
          padding: 30px;
          border-radius: 16px;
          min-width: 350px;
          border: 1px solid #312e81;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
          font-size: 16px;
          color: #94a3b8;
        }

        .total-row.final {
          border-top: 2px solid #7c3aed;
          padding-top: 20px;
          margin-top: 20px;
          font-size: 28px;
          font-weight: 800;
          color: #fff;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
        }

        .invoice-footer {
          background: #0f172a;
          padding: 40px 50px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #1f2937;
          gap: 16px;
          flex-wrap: wrap;
        }

        .payment-info h4 {
          color: #8b5cf6;
          font-size: 14px;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .payment-info p {
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
        }

        .status-badge {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          padding: 14px 32px;
          border-radius: 30px;
          font-weight: 800;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 2px;
          box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .status-badge.pending {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.4);
        }

        .notes-section {
          margin-top: 40px;
          padding: 25px;
          background: rgba(139, 92, 246, 0.1);
          border-left: 4px solid #8b5cf6;
          border-radius: 12px;
          border: 1px solid rgba(139, 92, 246, 0.2);
        }

        .notes-section h4 {
          color: #c4b5fd;
          font-size: 14px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .notes-section p {
          color: #94a3b8;
          font-size: 15px;
          line-height: 1.6;
        }

        .terms-section {
          margin-top: 30px;
          padding-top: 30px;
          border-top: 1px solid #1f2937;
        }

        .terms-section h4 {
          color: #8b5cf6;
          font-size: 14px;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .terms-section p {
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
        }

        .terms-section a {
          color: #8b5cf6;
          text-decoration: none;
        }

        .terms-section a:hover {
          text-decoration: underline;
        }

        /* Premium purple pill buttons, invoice page only */
        .tt-actions{ display:flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
        .tt-btn{
          height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(0,0,0,0.20);
          color: rgba(255,255,255,0.92);
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          cursor:pointer;
          font-size: 13px;
          font-weight: 900;
          text-decoration:none;
          transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease;
          backdrop-filter: blur(10px);
        }
        .tt-btn:hover{
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(0,0,0,0.28);
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.22);
        }
        .tt-btn-premium{
          border-color: rgba(124,77,255,0.55);
          background: linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95));
          box-shadow: 0 14px 34px rgba(124,58,237,0.28);
          color:#fff;
        }
        .tt-btn-premium:hover{ filter: brightness(1.05); }
        .tt-btn-premium:disabled{
          opacity: 0.7;
          cursor: not-allowed;
          transform:none;
          box-shadow:none;
        }

        .noprint{}

        @media (max-width: 860px){
          .details-grid{ grid-template-columns: 1fr; gap: 22px; }
          .invoice-title{ text-align:left; }
        }

        @media print {
          body {
            background: #fff !important;
            padding: 0 !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .invoice-container {
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
          }
          .invoice-header {
            background: #1e1b4b !important;
          }
          .noprint { display:none !important; }
        }

        .glow-text {
          animation: glow 2s ease-in-out infinite alternate;
        }

        @keyframes glow {
          from { text-shadow: 0 0 10px rgba(139, 92, 246, 0.5); }
          to { text-shadow: 0 0 20px rgba(139, 92, 246, 0.8), 0 0 30px rgba(139, 92, 246, 0.4); }
        }
      `}
    </style>
  );
}
