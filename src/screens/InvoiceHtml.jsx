import React, { useMemo } from "react";
import { useParams } from "react-router-dom";

export default function InvoiceHtml() {
  const { invoiceId } = useParams();

  // Same mock dataset for now. Later we will fetch by ID from Zoho Books.
  const invoices = useMemo(
    () => [
      {
        id: "INV-000184",
        invoiceNo: "INV-000184",
        account: "TabbyPay",
        issuedDate: "2026-02-23",
        generatedDate: "2026-02-23",
        paymentDate: "",
        paymentMethod: "Paystack Debit Order",
        status: "Unpaid",
        cycle: "25th",
        customer: {
          name: "Mewtwo - Tabbytech",
          email: "mewtwo@tabbytech.co.za",
          phone: "",
          addressLines: [],
        },
        items: [
          { description: "TabbyPay Subscription - Monthly", from: "2026-02-25", to: "2026-03-24", amountZar: 1000 },
        ],
        totals: { subtotalZar: 869.57, vatZar: 130.43, totalZar: 1000 },
        payment: {
          maskedAccount: "**** **** **** 9597",
          nextAttempt: "2026-03-01",
          lastAttempt: "",
          lastError: "",
          reference: "TBP-DO-778122",
        },
        seller: {
          brand: "TabbyPay",
          parent: "TabbyTech",
          legalLine1: "eMarketing Concepts (Pty) Ltd",
          legalLine2: "Johannesburg, South Africa",
          vatNo: "",
          regNo: "",
        },
        help: { email: "support@tabbytech.co.za", portalText: "Client portal (coming soon)" },
        notes:
          "We will automatically attempt collection on your billing cycle. If the first attempt fails, a second attempt runs on the 1st.",
      },
      {
        id: "INV-000185",
        invoiceNo: "INV-000185",
        account: "TabbyPay",
        issuedDate: "2026-02-23",
        generatedDate: "2026-02-23",
        paymentDate: "2026-02-25",
        paymentMethod: "Paystack Debit Order",
        status: "Paid",
        cycle: "25th",
        customer: { name: "Riaan Joubert EMC", email: "Riaan@tabbytech.co.za", phone: "", addressLines: [] },
        items: [
          { description: "TabbyPay Subscription - Monthly", from: "2026-02-25", to: "2026-03-24", amountZar: 350 },
        ],
        totals: { subtotalZar: 304.35, vatZar: 45.65, totalZar: 350 },
        payment: {
          maskedAccount: "**** **** **** 9597",
          nextAttempt: "",
          lastAttempt: "2026-02-25T08:00:00.000Z",
          lastError: "",
          reference: "TBP-DO-778200",
        },
        seller: {
          brand: "TabbyPay",
          parent: "TabbyTech",
          legalLine1: "eMarketing Concepts (Pty) Ltd",
          legalLine2: "Johannesburg, South Africa",
          vatNo: "",
          regNo: "",
        },
        help: { email: "support@tabbytech.co.za", portalText: "Client portal (coming soon)" },
        notes: "Paid successfully. Accounting sync will mark the Zoho Books invoice as paid when we wire the integration.",
      },
      {
        id: "INV-000186",
        invoiceNo: "INV-000186",
        account: "TabbyPay",
        issuedDate: "2026-02-27",
        generatedDate: "2026-02-27",
        paymentDate: "",
        paymentMethod: "Paystack Debit Order",
        status: "Pending",
        cycle: "1st",
        customer: { name: "Example Co", email: "accounts@example.co.za", phone: "", addressLines: [] },
        items: [
          { description: "TabbyPay Subscription - Monthly", from: "2026-03-01", to: "2026-03-31", amountZar: 1299 },
        ],
        totals: { subtotalZar: 1129.57, vatZar: 169.43, totalZar: 1299 },
        payment: {
          maskedAccount: "**** **** **** 1204",
          nextAttempt: "2026-03-01",
          lastAttempt: "",
          lastError: "",
          reference: "TBP-DO-778333",
        },
        seller: {
          brand: "TabbyPay",
          parent: "TabbyTech",
          legalLine1: "eMarketing Concepts (Pty) Ltd",
          legalLine2: "Johannesburg, South Africa",
          vatNo: "",
          regNo: "",
        },
        help: { email: "support@tabbytech.co.za", portalText: "Client portal (coming soon)" },
        notes: "Pending collection. This will move to Paid or Failed via Paystack webhook events later.",
      },
    ],
    []
  );

  const invoice = useMemo(() => invoices.find((i) => i.id === invoiceId) || null, [invoices, invoiceId]);

  const css = `
    :root{
      color-scheme: dark;
    }
    body{
      margin:0;
      background: radial-gradient(1200px 700px at 30% 0%, rgba(124,58,237,0.20), transparent 60%),
                  radial-gradient(900px 600px at 90% 10%, rgba(168,85,247,0.14), transparent 55%),
                  #070812;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      color: rgba(255,255,255,0.92);
    }

    .tt-page{
      min-height: 100vh;
      padding: 28px 18px;
      box-sizing: border-box;
    }

    .tt-wrap{
      max-width: 1100px;
      margin: 0 auto;
    }

    .tt-card{
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.10);
      background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
      box-shadow: 0 18px 50px rgba(0,0,0,0.35);
      backdrop-filter: blur(14px);
      overflow: hidden;
    }

    .tt-head{
      padding: 16px 16px 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.10);
      display:flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .tt-brandRow{ display:flex; align-items:center; gap: 12px; }
    .tt-logoBox{
      width: 44px; height: 44px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95));
      box-shadow: 0 14px 34px rgba(124,58,237,0.28);
      display:flex; align-items:center; justify-content:center;
      font-weight: 950; color: #fff; user-select: none;
      letter-spacing: 0.5px;
    }
    .tt-brandText{ display:flex; flex-direction:column; gap: 2px; }
    .tt-brandName{ font-size: 14px; font-weight: 950; }
    .tt-brandSub{ font-size: 12px; color: rgba(255,255,255,0.60); }

    .tt-titleBlock{ display:flex; flex-direction:column; gap: 6px; }
    .tt-title{ margin:0; font-size: 22px; font-weight: 950; }
    .tt-meta{ font-size: 12px; color: rgba(255,255,255,0.60); }

    .tt-actions{ display:flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .tt-btn{
      height: 38px;
      padding: 0 12px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.88);
      display:inline-flex;
      align-items:center;
      gap:10px;
      cursor:pointer;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.2px;
      transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease;
    }
    .tt-btn:hover{
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(0,0,0,0.28);
      background: rgba(255,255,255,0.10);
      border-color: rgba(255,255,255,0.14);
    }

    .tt-btnPrimary{
      background: linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95));
      border-color: rgba(124,58,237,0.55);
      box-shadow: 0 14px 34px rgba(124,58,237,0.28);
      color:#fff;
    }

    .tt-pill{
      height: 26px;
      padding: 0 12px;
      border-radius: 999px;
      display:inline-flex;
      align-items:center;
      gap: 8px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.06);
      font-size: 12px;
      font-weight: 950;
      color: rgba(255,255,255,0.90);
      white-space: nowrap;
    }
    .tt-paid { border-color: rgba(34,197,94,0.32); background: rgba(34,197,94,0.14); }
    .tt-unpaid { border-color: rgba(245,158,11,0.32); background: rgba(245,158,11,0.16); }
    .tt-failed { border-color: rgba(239,68,68,0.32); background: rgba(239,68,68,0.16); }
    .tt-pending { border-color: rgba(124,58,237,0.32); background: rgba(124,58,237,0.16); }
    .tt-overdue { border-color: rgba(239,68,68,0.45); background: rgba(239,68,68,0.18); }

    .tt-grid{
      display:grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 16px;
      padding: 16px;
    }

    .tt-block{
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.14);
      padding: 12px;
    }
    .tt-blockTitle{
      margin:0;
      font-size: 12px;
      font-weight: 950;
      color: rgba(255,255,255,0.78);
      letter-spacing: 0.2px;
      text-transform: uppercase;
    }

    .tt-kv{
      display:grid;
      grid-template-columns: 180px 1fr;
      gap: 10px;
      margin-top: 10px;
    }
    .tt-k{ font-size: 12px; color: rgba(255,255,255,0.55); }
    .tt-v{ font-size: 13px; color: rgba(255,255,255,0.86); overflow:hidden; text-overflow: ellipsis; }

    .tt-tableWrap{ padding: 0 16px 16px 16px; }
    .tt-table{
      width:100%;
      border-collapse: separate;
      border-spacing: 0;
      border-radius: 16px;
      overflow:hidden;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.12);
    }
    .tt-th{
      text-align:left;
      padding: 12px 12px;
      font-size: 12px;
      font-weight: 950;
      color: rgba(255,255,255,0.62);
      background: rgba(10,10,14,0.70);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      white-space: nowrap;
    }
    .tt-td{
      padding: 12px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.82);
      font-size: 13px;
      white-space: nowrap;
      vertical-align: top;
    }
    .tt-tdDesc{ white-space: normal; }
    .tt-right{ text-align: right; }
    .tt-tr:last-child .tt-td{ border-bottom:none; }

    .tt-totalsRow{
      display:grid;
      grid-template-columns: 1fr 360px;
      gap: 16px;
      padding: 16px;
      padding-top: 0;
      align-items: start;
    }
    .tt-totalsBox{
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.10);
      background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%);
      padding: 12px;
    }
    .tt-totalLine{ display:flex; justify-content:space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .tt-totalLine:last-child{ border-bottom:none; }
    .tt-totalKey{ font-size: 12px; color: rgba(255,255,255,0.62); font-weight: 800; }
    .tt-totalVal{ font-size: 13px; color: rgba(255,255,255,0.90); font-weight: 950; }
    .tt-totalGrand .tt-totalVal{ font-size: 16px; }

    .tt-foot{
      padding: 16px;
      border-top: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.10);
      display:flex;
      justify-content: space-between;
      align-items:center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .tt-footNote{
      font-size: 12px;
      color: rgba(255,255,255,0.62);
      line-height: 1.4;
      max-width: 860px;
    }

    @media (max-width: 1100px){
      .tt-grid{ grid-template-columns: 1fr; }
      .tt-kv{ grid-template-columns: 1fr; }
      .tt-totalsRow{ grid-template-columns: 1fr; }
    }

    @media print {
      .tt-hidePrint{ display:none !important; }
      body{ background:#0b0c14 !important; }
      .tt-card, .tt-block, .tt-totalsBox, .tt-table{ box-shadow:none !important; backdrop-filter:none !important; }
      .tt-page{ padding: 0 !important; }
      .tt-wrap{ max-width: none !important; }
    }
  `;

  if (!invoice) {
    return (
      <div className="tt-page">
        <style>{css}</style>
        <div className="tt-wrap">
          <div className="tt-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 950, fontSize: 18 }}>Invoice not found</div>
            <div style={{ marginTop: 8, color: "rgba(255,255,255,0.65)" }}>
              The link may be wrong or the invoice is not available yet.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusClass = getStatusClass(invoice.status);

  return (
    <div className="tt-page">
      <style>{css}</style>

      <div className="tt-wrap">
        <div className="tt-card">
          <div className="tt-head">
            <div className="tt-brandRow">
              <div className="tt-logoBox" title={invoice.seller?.brand || "TabbyPay"}>TP</div>
              <div className="tt-brandText">
                <div className="tt-brandName">{invoice.seller?.brand || "TabbyPay"}</div>
                <div className="tt-brandSub">{invoice.seller?.parent || "TabbyTech"}</div>
              </div>
            </div>

            <div className="tt-titleBlock">
              <h1 className="tt-title">Invoice</h1>
              <div className="tt-meta">
                Invoice No: <b>{invoice.invoiceNo}</b> · Cycle: <b>{invoice.cycle}</b>
              </div>
            </div>

            <div className="tt-actions tt-hidePrint">
              <span className={`tt-pill ${statusClass}`}>
                <Dot />
                {invoice.status}
              </span>

              <button type="button" className="tt-btn" onClick={() => window.print()}>
                Print
              </button>

              <button
                type="button"
                className="tt-btn tt-btnPrimary"
                onClick={() => window.print()}
                title="Use Print then choose Save as PDF"
              >
                Download
              </button>
            </div>
          </div>

          <div className="tt-grid">
            <div className="tt-block">
              <p className="tt-blockTitle">Bill to</p>
              <div className="tt-kv">
                <div className="tt-k">Customer</div>
                <div className="tt-v">{invoice.customer?.name || "Customer"}</div>

                <div className="tt-k">Email</div>
                <div className="tt-v">{invoice.customer?.email || "Not set"}</div>

                <div className="tt-k">Phone</div>
                <div className="tt-v">{invoice.customer?.phone || "Not set"}</div>
              </div>
            </div>

            <div className="tt-block">
              <p className="tt-blockTitle">Invoice details</p>
              <div className="tt-kv">
                <div className="tt-k">Account</div>
                <div className="tt-v">{invoice.account || "TabbyPay"}</div>

                <div className="tt-k">Invoice date</div>
                <div className="tt-v">{fmtDateShort(invoice.issuedDate)}</div>

                <div className="tt-k">Generated date</div>
                <div className="tt-v">{fmtDateShort(invoice.generatedDate)}</div>

                <div className="tt-k">Payment date</div>
                <div className="tt-v">{invoice.paymentDate ? fmtDateShort(invoice.paymentDate) : "Not paid"}</div>

                <div className="tt-k">Payment method</div>
                <div className="tt-v">{invoice.paymentMethod || "Not set"}</div>
              </div>
            </div>

            <div className="tt-block">
              <p className="tt-blockTitle">Payment status</p>
              <div className="tt-kv">
                <div className="tt-k">Reference</div>
                <div className="tt-v">{invoice.payment?.reference || "Not set"}</div>

                <div className="tt-k">Card or account</div>
                <div className="tt-v">{invoice.payment?.maskedAccount || "Not set"}</div>

                <div className="tt-k">Next attempt</div>
                <div className="tt-v">{invoice.payment?.nextAttempt ? fmtDateShort(invoice.payment.nextAttempt) : "Not scheduled"}</div>

                <div className="tt-k">Last attempt</div>
                <div className="tt-v">{invoice.payment?.lastAttempt ? fmtDateTimeLong(invoice.payment.lastAttempt) : "Not set"}</div>

                <div className="tt-k">Last error</div>
                <div className="tt-v">{invoice.payment?.lastError || "None"}</div>
              </div>

              <div style={{ marginTop: 10, color: "rgba(255,255,255,0.62)", fontSize: 12, lineHeight: 1.5 }}>
                {invoice.notes || ""}
              </div>
            </div>

            <div className="tt-block">
              <p className="tt-blockTitle">Seller</p>
              <div className="tt-kv">
                <div className="tt-k">Business</div>
                <div className="tt-v">{invoice.seller?.legalLine1 || "Not set"}</div>

                <div className="tt-k">Location</div>
                <div className="tt-v">{invoice.seller?.legalLine2 || "Not set"}</div>

                <div className="tt-k">VAT No</div>
                <div className="tt-v">{invoice.seller?.vatNo || "Not set"}</div>

                <div className="tt-k">Reg No</div>
                <div className="tt-v">{invoice.seller?.regNo || "Not set"}</div>
              </div>
            </div>
          </div>

          <div className="tt-tableWrap">
            <table className="tt-table">
              <thead>
                <tr>
                  <th className="tt-th" style={{ width: "55%" }}>Description</th>
                  <th className="tt-th">From</th>
                  <th className="tt-th">To</th>
                  <th className="tt-th tt-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((it, idx) => (
                  <tr key={idx} className="tt-tr">
                    <td className="tt-td tt-tdDesc">{it.description || ""}</td>
                    <td className="tt-td">{it.from ? fmtDateShort(it.from) : "Not set"}</td>
                    <td className="tt-td">{it.to ? fmtDateShort(it.to) : "Not set"}</td>
                    <td className="tt-td tt-right">{currencyZar(it.amountZar || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tt-totalsRow">
            <div className="tt-block">
              <p className="tt-blockTitle">Need help</p>
              <div style={{ marginTop: 10, color: "rgba(255,255,255,0.70)", fontSize: 13, lineHeight: 1.5 }}>
                If you have any questions about this invoice, reply to the invoice email or contact support.
              </div>

              <div className="tt-kv" style={{ marginTop: 10 }}>
                <div className="tt-k">Support email</div>
                <div className="tt-v">{invoice.help?.email || "Not set"}</div>

                <div className="tt-k">Portal</div>
                <div className="tt-v">{invoice.help?.portalText || "Not set"}</div>
              </div>

              <div style={{ marginTop: 10, color: "rgba(255,255,255,0.60)", fontSize: 12, lineHeight: 1.5 }}>
                Thank you for your business.
              </div>
            </div>

            <div className="tt-totalsBox">
              <div className="tt-totalLine">
                <div className="tt-totalKey">Subtotal</div>
                <div className="tt-totalVal">{currencyZar(invoice.totals?.subtotalZar ?? 0)}</div>
              </div>

              <div className="tt-totalLine">
                <div className="tt-totalKey">VAT</div>
                <div className="tt-totalVal">{currencyZar(invoice.totals?.vatZar ?? 0)}</div>
              </div>

              <div className="tt-totalLine tt-totalGrand">
                <div className="tt-totalKey">Total</div>
                <div className="tt-totalVal">{currencyZar(invoice.totals?.totalZar ?? 0)}</div>
              </div>
            </div>
          </div>

          <div className="tt-foot">
            <div className="tt-footNote">
              This is an HTML invoice view for TabbyPay. Payment capture and accounting sync will be wired via Paystack webhooks and Zoho Books integration.
            </div>

            <div className="tt-hidePrint" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                className="tt-btn"
                href="#/"
                onClick={(e) => {
                  // If this page is opened standalone, this takes user back to app home.
                  // If you prefer to go back to invoices list specifically, we can route it.
                  e.preventDefault();
                  window.location.hash = "#/invoices";
                }}
              >
                Back
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: "rgba(255,255,255,0.85)",
        boxShadow: "0 0 0 6px rgba(124,58,237,0.12)",
        opacity: 0.9,
      }}
    />
  );
}

function getStatusClass(status) {
  if (status === "Paid
