// src/pages/InvoiceHtml.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { fetchInvoiceById } from "../api/invoices";

function moneyZar(v) {
  const n = Number(v || 0);
  return `R ${n.toFixed(2)}`;
}

function fmtDate(d) {
  const s = String(d || "").trim();
  if (!s) return "";
  return s;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getTokenFromSearch(search) {
  try {
    const qs = new URLSearchParams(String(search || ""));
    return String(qs.get("token") || "").trim();
  } catch {
    return "";
  }
}

export default function InvoiceHtml() {
  const { invoiceId } = useParams();
  const location = useLocation();

  const token = useMemo(() => getTokenFromSearch(location.search), [location.search]);

  const iframeRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setErr("");
      try {
        const inv = await fetchInvoiceById(invoiceId, token);
        if (!alive) return;
        setInvoice(inv);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load invoice");
        setInvoice(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [invoiceId, token]);

  const inv = invoice;

  const templateHtml = useMemo(() => {
    if (!inv) return "";

    const invoiceNo = inv.invoiceNo || inv.id || "";
    const issuedDate = fmtDate(inv.issuedDate);
    const dueDate = fmtDate(inv.dueDate);
    const customerName = inv.customer || "Customer";

    const subtotal = inv.totals?.subtotalZar ?? 0;
    const total = inv.totals?.totalZar ?? 0;
    const paymentMade = inv.totals?.paymentMadeZar ?? 0;
    const balance = inv.totals?.balanceZar ?? 0;

    const rows = (inv.items || [])
      .map((it, idx) => {
        const qty = Number(it.qty || 1);
        const unit = Number(it.unitPrice || 0);
        const amount = Number(it.amountZar || qty * unit || 0);

        return `
          <tr>
            <td>${idx + 1}</td>
            <td><div class="item-name">${escapeHtml(it.description || "Item")}</div></td>
            <td>${Number.isFinite(qty) ? qty.toFixed(2) : "1.00"}</td>
            <td class="text-right">${escapeHtml(moneyZar(amount))}</td>
          </tr>
        `;
      })
      .join("");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TabbyPay Invoice</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: 210mm;
      min-height: 297mm;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #ffffff;
      color: #111827;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: hidden;
    }

    body {
      padding: 0;
      margin: 0;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 8mm;
      background: #ffffff;
      overflow: hidden;
    }

    .invoice-shell {
      width: 100%;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 10px;
      overflow: hidden;
    }

    .invoice-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      padding: 10mm 10mm 8mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #7c3aed;
      position: relative;
      overflow: hidden;
    }

    .invoice-header::before {
      content: '';
      position: absolute;
      top: -30mm;
      right: -18mm;
      width: 65mm;
      height: 65mm;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.14) 0%, transparent 70%);
      pointer-events: none;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 7mm;
      position: relative;
      z-index: 1;
      min-width: 0;
    }

    .logo-image {
      width: 22mm;
      height: 22mm;
      object-fit: contain;
      flex: 0 0 auto;
    }

    .company-info h1 {
      font-size: 11mm;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 1.5mm;
      background: linear-gradient(135deg, #fff 0%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .company-info .solution-name {
      font-size: 4mm;
      color: #8b5cf6;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      line-height: 1.2;
    }

    .company-info p {
      color: #94a3b8;
      font-size: 3.1mm;
      margin-top: 2mm;
      line-height: 1.4;
    }

    .invoice-title {
      text-align: right;
      position: relative;
      z-index: 1;
      flex: 0 0 auto;
    }

    .invoice-title h2 {
      font-size: 11mm;
      font-weight: 900;
      letter-spacing: 1.2px;
      margin-bottom: 2.5mm;
      color: #ffffff;
      line-height: 1;
    }

    .invoice-number {
      background: rgba(139, 92, 246, 0.18);
      border: 1px solid rgba(139, 92, 246, 0.28);
      padding: 2mm 4mm;
      border-radius: 999px;
      font-size: 3.1mm;
      font-weight: 700;
      color: #c4b5fd;
      display: inline-block;
    }

    .invoice-body {
      padding: 8mm 10mm 9mm;
      background: #111827;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8mm;
      margin-bottom: 8mm;
    }

    .detail-box h3 {
      color: #8b5cf6;
      font-size: 2.7mm;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2.5mm;
      font-weight: 700;
    }

    .detail-box p {
      color: #cbd5e1;
      font-size: 3.1mm;
      line-height: 1.45;
      margin-bottom: 1mm;
      word-break: break-word;
    }

    .detail-box strong {
      color: #ffffff;
      font-size: 4.2mm;
      display: block;
      margin-bottom: 2mm;
      font-weight: 700;
      line-height: 1.2;
    }

    .items-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 7mm;
      table-layout: fixed;
    }

    .items-table thead {
      background: #1e1b4b;
    }

    .items-table th {
      padding: 3mm 3.5mm;
      text-align: left;
      color: #c4b5fd;
      font-size: 2.5mm;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 700;
      border-bottom: 2px solid #7c3aed;
      border-top: 1px solid #312e81;
    }

    .items-table th:first-child {
      width: 8%;
      border-top-left-radius: 8px;
    }

    .items-table th:nth-child(2) {
      width: 52%;
    }

    .items-table th:nth-child(3) {
      width: 12%;
    }

    .items-table th:last-child {
      width: 28%;
      text-align: right;
      border-top-right-radius: 8px;
    }

    .items-table td {
      padding: 3.4mm 3.5mm;
      border-bottom: 1px solid #1f2937;
      color: #94a3b8;
      font-size: 3mm;
      background: #0f172a;
      vertical-align: top;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .items-table tr:last-child td:first-child { border-bottom-left-radius: 8px; }
    .items-table tr:last-child td:last-child { border-bottom-right-radius: 8px; }

    .item-name {
      font-weight: 700;
      color: #e2e8f0;
      font-size: 3.15mm;
      line-height: 1.3;
    }

    .text-right {
      text-align: right;
    }

    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 4mm;
    }

    .totals-box {
      background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
      padding: 5mm;
      border-radius: 9px;
      min-width: 72mm;
      border: 1px solid #312e81;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 6mm;
      margin-bottom: 2.4mm;
      font-size: 3.2mm;
      color: #94a3b8;
      line-height: 1.35;
    }

    .total-row.discount {
      color: #f87171;
    }

    .total-row.final {
      border-top: 2px solid #7c3aed;
      padding-top: 3.2mm;
      margin-top: 3.2mm;
      margin-bottom: 0;
      font-size: 4.8mm;
      font-weight: 800;
      color: #ffffff;
      background: rgba(139, 92, 246, 0.08);
      padding-left: 3mm;
      padding-right: 3mm;
      padding-bottom: 3mm;
      border-radius: 8px;
    }

    .notes-section {
      margin-top: 7mm;
      padding: 4.5mm;
      background: rgba(139, 92, 246, 0.08);
      border-left: 4px solid #8b5cf6;
      border-radius: 8px;
      border: 1px solid rgba(139, 92, 246, 0.18);
    }

    .notes-section h4 {
      color: #c4b5fd;
      font-size: 3mm;
      margin-bottom: 2mm;
    }

    .notes-section p {
      color: #94a3b8;
      font-size: 2.95mm;
      line-height: 1.5;
    }

    .terms-section {
      margin-top: 6mm;
      padding-top: 5mm;
      border-top: 1px solid #1f2937;
    }

    .terms-section h4 {
      color: #8b5cf6;
      font-size: 2.9mm;
      margin-bottom: 2mm;
      text-transform: uppercase;
      letter-spacing: 0.7px;
    }

    .terms-section p {
      color: #64748b;
      font-size: 2.8mm;
      line-height: 1.45;
    }

    .terms-section a {
      color: #8b5cf6;
      text-decoration: none;
      word-break: break-word;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    @media print {
      html, body {
        width: 210mm;
        height: 297mm;
        min-height: 297mm;
        max-height: 297mm;
        overflow: hidden;
        background: #ffffff;
      }

      body {
        margin: 0;
        padding: 0;
      }

      .page {
        width: 210mm;
        height: 297mm;
        min-height: 297mm;
        max-height: 297mm;
        padding: 8mm;
        overflow: hidden;
      }

      .invoice-shell {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="invoice-shell">
      <div class="invoice-header">
        <div class="logo-section">
          <img src="https://raw.githubusercontent.com/RiaangrimJoubert/TabbyTech-Debit-Order/refs/heads/main/public/WP%20LOGO%20(1).png" alt="TabbyTech Logo" class="logo-image">
          <div class="company-info">
            <h1>TabbyTech</h1>
            <div class="solution-name">TabbyPay</div>
            <p>billing@tabbytech.co.za</p>
          </div>
        </div>
        <div class="invoice-title">
          <h2>INVOICE</h2>
          <div class="invoice-number">#${escapeHtml(invoiceNo)}</div>
        </div>
      </div>

      <div class="invoice-body">
        <div class="details-grid">
          <div class="detail-box">
            <h3>From</h3>
            <strong>TabbyTech Pty Ltd</strong>
            <p>billing@tabbytech.co.za</p>
            <p>+27 76 713 6914</p>
            <p>Registration NR 2023/149930/07</p>
            <p>tabbytech.co.za</p>
          </div>
          <div class="detail-box" style="text-align:right;">
            <h3>Invoice Details</h3>
            <p><strong style="color:#8b5cf6;font-size:3.2mm;display:inline;">Invoice Date:</strong> ${escapeHtml(issuedDate)}</p>
            <p><strong style="color:#8b5cf6;font-size:3.2mm;display:inline;">Due Date:</strong> ${escapeHtml(dueDate)}</p>
          </div>
        </div>

        <div class="details-grid" style="margin-top:-1mm;">
          <div class="detail-box">
            <h3>Bill to</h3>
            <strong style="color:#8b5cf6;">${escapeHtml(customerName)}</strong>
          </div>
          <div class="detail-box" style="text-align:right;">
            <h3>Balance Due</h3>
            <strong style="font-size:6.6mm;color:#fff;">${escapeHtml(moneyZar(balance))}</strong>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Qty</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows || ""}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="totals-box">
            <div class="total-row">
              <span>Sub Total</span>
              <span>${escapeHtml(moneyZar(subtotal))}</span>
            </div>
            <div class="total-row">
              <span>Total</span>
              <span>${escapeHtml(moneyZar(total))}</span>
            </div>
            <div class="total-row discount">
              <span>Payment Made</span>
              <span>(-) ${escapeHtml(moneyZar(paymentMade))}</span>
            </div>
            <div class="total-row final">
              <span>Balance</span>
              <span>${escapeHtml(moneyZar(balance))}</span>
            </div>
          </div>
        </div>

        <div class="notes-section">
          <h4>Payment Note</h4>
          <p>
            We will automatically charge the amount of your subscription to your Bank Account on the 25th of each month.
            Should it be unsuccessful we will retry on the 1st. If your account has changed or you know of any other problem,
            kindly get in touch with us to avoid possible billing problems.
          </p>
        </div>

        <div class="terms-section">
          <h4>Terms & Conditions</h4>
          <p>
            Please visit our Website
            <a href="https://tabbytech.co.za/terms-conditions" target="_blank" rel="noreferrer"> https://tabbytech.co.za/terms-conditions</a>
            to view our full T&amp;Cs
          </p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;
  }, [inv]);

  function onPrint() {
    const iframe = iframeRef.current;
    const win = iframe?.contentWindow;
    if (win) {
      win.focus();
      win.print();
      return;
    }
    window.print();
  }

  const backHref = token ? `/tabbyden?token=${encodeURIComponent(token)}` : "/";

  if (loading) {
    return <div style={{ padding: 18, opacity: 0.8 }}>Loading invoice from Zoho Books...</div>;
  }

  if (err) {
    return (
      <div style={{ padding: 18 }}>
        <div style={{ fontWeight: 950, fontSize: 16 }}>Invoice failed to load</div>
        <div style={{ marginTop: 8, opacity: 0.8 }}>{err}</div>
        <div style={{ marginTop: 12 }}>
          <Link to={backHref} style={{ color: "rgba(196,181,253,0.95)", textDecoration: "none" }}>
            Back
          </Link>
        </div>
      </div>
    );
  }

  if (!inv) {
    return (
      <div style={{ padding: 18 }}>
        <div style={{ fontWeight: 950, fontSize: 16 }}>Invoice not found</div>
        <div style={{ marginTop: 12 }}>
          <Link to={backHref} style={{ color: "rgba(196,181,253,0.95)", textDecoration: "none" }}>
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 18, background: "#0a0e1a", minHeight: "100vh" }}>
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <Link
          to={backHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(255,255,255,0.88)",
            textDecoration: "none",
            fontWeight: 900
          }}
        >
          Back
        </Link>

        <button
          type="button"
          onClick={onPrint}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(124,58,237,0.55)",
            background: "linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95))",
            color: "#fff",
            fontWeight: 950,
            cursor: "pointer"
          }}
        >
          Print / Save as PDF
        </button>
      </div>

      <div
        style={{
          marginTop: 14,
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.10)",
          background: "#111827"
        }}
      >
        <iframe
          ref={iframeRef}
          title="Invoice"
          style={{
            width: "100%",
            height: "1120px",
            border: 0,
            background: "#0a0e1a"
          }}
          srcDoc={templateHtml}
        />
      </div>
    </div>
  );
}
