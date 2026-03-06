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
            <td>
              <div class="item-name">${escapeHtml(it.description || "Item")}</div>
            </td>
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

    :root {
      --page-width: 210mm;
      --page-min-height: 297mm;
      --page-padding: 12mm;
      --bg-main: #0a0e1a;
      --bg-card: #111827;
      --bg-soft: #0f172a;
      --bg-head-a: #0f172a;
      --bg-head-b: #1e1b4b;
      --border: #1f2937;
      --accent: #8b5cf6;
      --accent-2: #7c3aed;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --muted-2: #64748b;
      --danger: #f87171;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: 100%;
      min-height: 100%;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg-main);
      padding: 20px;
      color: var(--text);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 100%;
      max-width: var(--page-width);
      min-height: var(--page-min-height);
      margin: 0 auto;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 18px 40px rgba(0,0,0,0.45);
    }

    .invoice-header {
      background: linear-gradient(135deg, var(--bg-head-a) 0%, var(--bg-head-b) 100%);
      padding: 16mm 14mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--accent-2);
      position: relative;
      overflow: hidden;
    }

    .invoice-header::before {
      content: '';
      position: absolute;
      top: -45mm;
      right: -25mm;
      width: 90mm;
      height: 90mm;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 10mm;
      position: relative;
      z-index: 1;
      min-width: 0;
    }

    .logo-image {
      width: 30mm;
      height: 30mm;
      object-fit: contain;
      filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.25));
      flex: 0 0 auto;
    }

    .company-info h1 {
      font-size: 13mm;
      font-weight: 800;
      letter-spacing: -0.4px;
      margin-bottom: 2mm;
      background: linear-gradient(135deg, #fff 0%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
    }

    .company-info .solution-name {
      font-size: 5mm;
      color: var(--accent);
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      line-height: 1.2;
    }

    .company-info p {
      color: var(--muted);
      font-size: 3.7mm;
      margin-top: 3mm;
      line-height: 1.5;
    }

    .invoice-title {
      text-align: right;
      position: relative;
      z-index: 1;
      flex: 0 0 auto;
    }

    .invoice-title h2 {
      font-size: 14mm;
      font-weight: 900;
      letter-spacing: 1.8px;
      margin-bottom: 4mm;
      text-transform: uppercase;
      color: #fff;
      text-shadow: 0 0 20px rgba(139, 92, 246, 0.35);
      line-height: 1;
    }

    .invoice-number {
      background: rgba(139, 92, 246, 0.18);
      border: 1px solid rgba(139, 92, 246, 0.28);
      padding: 2.5mm 4.5mm;
      border-radius: 999px;
      font-size: 3.5mm;
      font-weight: 700;
      color: #c4b5fd;
      display: inline-block;
    }

    .invoice-body {
      padding: var(--page-padding);
      background: var(--bg-card);
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12mm;
      margin-bottom: 12mm;
    }

    .detail-box h3 {
      color: var(--accent);
      font-size: 3mm;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin-bottom: 4mm;
      font-weight: 700;
    }

    .detail-box p {
      color: #cbd5e1;
      font-size: 3.6mm;
      line-height: 1.65;
      margin-bottom: 1.5mm;
      word-break: break-word;
    }

    .detail-box strong {
      color: #fff;
      font-size: 5.2mm;
      display: block;
      margin-bottom: 3mm;
      font-weight: 700;
      line-height: 1.25;
    }

    .items-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 10mm;
      table-layout: fixed;
    }

    .items-table thead {
      background: #1e1b4b;
    }

    .items-table th {
      padding: 4mm 4.5mm;
      text-align: left;
      color: #c4b5fd;
      font-size: 2.9mm;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
      border-bottom: 2px solid var(--accent-2);
      border-top: 1px solid #312e81;
    }

    .items-table th:first-child {
      border-top-left-radius: 8px;
      width: 10%;
    }

    .items-table th:nth-child(2) {
      width: 50%;
    }

    .items-table th:nth-child(3) {
      width: 15%;
    }

    .items-table th:last-child {
      border-top-right-radius: 8px;
      text-align: right;
      width: 25%;
    }

    .items-table td {
      padding: 4.5mm 4.5mm;
      border-bottom: 1px solid var(--border);
      color: var(--muted);
      font-size: 3.5mm;
      background: var(--bg-soft);
      vertical-align: top;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .items-table tr:last-child td:first-child { border-bottom-left-radius: 8px; }
    .items-table tr:last-child td:last-child { border-bottom-right-radius: 8px; }

    .item-name {
      font-weight: 700;
      color: var(--text);
      font-size: 3.7mm;
      line-height: 1.4;
    }

    .text-right { text-align: right; }

    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 8mm;
    }

    .totals-box {
      background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
      padding: 7mm;
      border-radius: 10px;
      min-width: 82mm;
      border: 1px solid #312e81;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 8mm;
      margin-bottom: 3.5mm;
      font-size: 3.8mm;
      color: var(--muted);
      line-height: 1.4;
    }

    .total-row.discount {
      color: var(--danger);
    }

    .total-row.final {
      border-top: 2px solid var(--accent-2);
      padding-top: 4.5mm;
      margin-top: 4.5mm;
      margin-bottom: 0;
      font-size: 6mm;
      font-weight: 800;
      color: #fff;
      text-shadow: 0 0 12px rgba(139, 92, 246, 0.25);
      background: rgba(139, 92, 246, 0.08);
      padding: 4mm;
      border-radius: 8px;
    }

    .notes-section {
      margin-top: 10mm;
      padding: 6mm;
      background: rgba(139, 92, 246, 0.08);
      border-left: 4px solid var(--accent);
      border-radius: 8px;
      border: 1px solid rgba(139, 92, 246, 0.18);
    }

    .notes-section h4 {
      color: #c4b5fd;
      font-size: 3.4mm;
      margin-bottom: 2.5mm;
    }

    .notes-section p {
      color: var(--muted);
      font-size: 3.4mm;
      line-height: 1.6;
    }

    .terms-section {
      margin-top: 8mm;
      padding-top: 7mm;
      border-top: 1px solid var(--border);
    }

    .terms-section h4 {
      color: var(--accent);
      font-size: 3.3mm;
      margin-bottom: 2.5mm;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .terms-section p {
      color: var(--muted-2);
      font-size: 3.2mm;
      line-height: 1.6;
    }

    .terms-section a {
      color: var(--accent);
      text-decoration: none;
      word-break: break-word;
    }

    .terms-section a:hover {
      text-decoration: underline;
    }

    @page {
      size: A4 portrait;
      margin: 10mm;
    }

    @media print {
      html, body {
        width: 210mm;
        min-height: 297mm;
        background: #ffffff;
        padding: 0;
        margin: 0;
      }

      body {
        color: #111827;
      }

      .page {
        width: 190mm;
        min-height: 277mm;
        margin: 0 auto;
        box-shadow: none;
        border-radius: 0;
        border: none;
        overflow: visible;
      }

      .invoice-header,
      .invoice-body,
      .items-table td,
      .items-table th,
      .totals-box,
      .notes-section {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    @media screen and (max-width: 900px) {
      body {
        padding: 10px;
      }

      .page {
        border-radius: 12px;
      }

      .invoice-header,
      .invoice-body {
        padding-left: 16px;
        padding-right: 16px;
      }

      .details-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .invoice-title {
        text-align: left;
      }
    }
  </style>
</head>
<body>
  <div class="page">
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
        <div class="detail-box" style="text-align: right;">
          <h3>Invoice Details</h3>
          <p><strong style="color:#8b5cf6;font-size:4mm;display:inline;">Invoice Date:</strong> ${escapeHtml(issuedDate)}</p>
          <p><strong style="color:#8b5cf6;font-size:4mm;display:inline;">Due Date:</strong> ${escapeHtml(dueDate)}</p>
        </div>
      </div>

      <div class="details-grid" style="margin-top: -4mm;">
        <div class="detail-box">
          <h3>Bill to</h3>
          <strong style="color:#8b5cf6;">${escapeHtml(customerName)}</strong>
        </div>
        <div class="detail-box" style="text-align: right;">
          <h3>Balance Due</h3>
          <strong style="font-size:8.5mm;color:#fff;text-shadow:0 0 14px rgba(139,92,246,0.35);">${escapeHtml(moneyZar(balance))}</strong>
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
          <a href="https://tabbytech.co.za/terms-conditions" target="_blank" rel="noreferrer">https://tabbytech.co.za/terms-conditions</a>
          to view our full T&amp;Cs
        </p>
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
            height: "calc(297mm + 40px)",
            border: 0,
            background: "#0a0e1a"
          }}
          srcDoc={templateHtml}
        />
      </div>
    </div>
  );
}
