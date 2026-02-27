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
        // IMPORTANT: pass token for TabbyDen secure access
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

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0e1a;
      min-height: 100vh;
      padding: 40px 20px;
      color: #e2e8f0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

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

    .invoice-body { padding: 50px; background: #111827; }

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

    .items-table thead { background: #1e1b4b; }

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

    .items-table th:first-child { border-top-left-radius: 12px; width: 10%; }
    .items-table th:nth-child(2) { width: 50%; }
    .items-table th:last-child { border-top-right-radius: 12px; text-align: right; }

    .items-table td {
      padding: 24px 20px;
      border-bottom: 1px solid #1f2937;
      color: #94a3b8;
      font-size: 15px;
      background: #0f172a;
    }

    .items-table tr:last-child td:first-child { border-bottom-left-radius: 12px; }
    .items-table tr:last-child td:last-child { border-bottom-right-radius: 12px; }

    .item-name { font-weight: 700; color: #e2e8f0; font-size: 16px; }

    .text-right { text-align: right; }

    .totals-section { display: flex; justify-content: flex-end; margin-top: 40px; }

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

    .total-row.discount { color: #f87171; }

    .total-row.final {
      border-top: 2px solid #7c3aed;
      padding-top: 20px;
      margin-top: 20px;
      font-size: 28px;
      font-weight: 800;
      color: #fff;
      text-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
      background: rgba(139, 92, 246, 0.1);
      padding: 15px;
      border-radius: 8px;
    }

    .notes-section {
      margin-top: 40px;
      padding: 25px;
      background: rgba(139, 92, 246, 0.1);
      border-left: 4px solid #8b5cf6;
      border-radius: 12px;
      border: 1px solid rgba(139, 92, 246, 0.2);
    }

    .notes-section h4 { color: #c4b5fd; font-size: 14px; margin-bottom: 10px; }

    .notes-section p { color: #94a3b8; font-size: 15px; line-height: 1.6; }

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

    .terms-section p { color: #64748b; font-size: 14px; line-height: 1.6; }
    .terms-section a { color: #8b5cf6; text-decoration: none; }
    .terms-section a:hover { text-decoration: underline; }

    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      body { padding: 0; }
      .invoice-container { box-shadow: none; border-radius: 0; border: none; }
      .invoice-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
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
          <p><strong style="color:#8b5cf6;font-size:16px;display:inline;">Invoice Date:</strong> ${escapeHtml(issuedDate)}</p>
          <p><strong style="color:#8b5cf6;font-size:16px;display:inline;">Due Date:</strong> ${escapeHtml(dueDate)}</p>
        </div>
      </div>

      <div class="details-grid" style="margin-top: -20px;">
        <div class="detail-box">
          <h3>Bill to</h3>
          <strong style="color:#8b5cf6;">${escapeHtml(customerName)}</strong>
        </div>
        <div class="detail-box" style="text-align: right;">
          <h3>Balance Due</h3>
          <strong style="font-size:32px;color:#fff;text-shadow:0 0 20px rgba(139,92,246,0.5);">${escapeHtml(moneyZar(balance))}</strong>
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
    // Print the iframe content, not the React wrapper
    const iframe = iframeRef.current;
    const win = iframe?.contentWindow;
    if (win) {
      win.focus();
      win.print();
      return;
    }
    window.print();
  }

  const backHref = token ? `/portal/${encodeURIComponent(token)}` : "/";

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
    <div style={{ padding: 18 }}>
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

      <div style={{ marginTop: 14, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)" }}>
        <iframe
          ref={iframeRef}
          title="Invoice"
          style={{ width: "100%", height: "85vh", border: 0, background: "#0a0e1a" }}
          srcDoc={templateHtml}
        />
      </div>
    </div>
  );
}
