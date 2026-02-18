import React, { useMemo, useState } from "react";

export default function InvoicePage() {
  // UI-first mock invoice. We will wire this to Zoho Books + Paystack later.
  const invoice = useMemo(
    () => ({
      invoiceNo: "INV-000184",
      account: "TabbyPay",
      issuedDate: "2026-02-23",
      generatedDate: "2026-02-23",
      paymentDate: "",
      paymentMethod: "Paystack Debit Order",
      status: "Unpaid", // Paid | Unpaid | Failed | Pending | Overdue
      cycle: "25th",
      customer: {
        name: "Mewtwo - Tabbytech",
        email: "mewtwo@tabbytech.co.za",
        phone: "",
        addressLines: [],
      },
      items: [
        {
          description: "TabbyPay Subscription - Monthly",
          from: "2026-02-25",
          to: "2026-03-24",
          amountZar: 1000,
        },
      ],
      totals: {
        subtotalZar: 869.57,
        vatZar: 130.43,
        totalZar: 1000,
      },
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
      help: {
        whatsapp: "",
        email: "support@tabbytech.co.za",
        portalText: "Client portal (coming soon)",
      },
      notes:
        "We will automatically attempt collection on your billing cycle. If the first attempt fails, a second attempt runs on the 1st.",
    }),
    []
  );

  const [toast, setToast] = useState("");
  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 2200);
  }

  const css = `
    .tt-invoice {
      width: 100%;
      height: 100%;
      color: rgba(255,255,255,0.92);
      --tt-purple: rgba(124,58,237,0.95);
      --tt-purple2: rgba(168,85,247,0.95);
      --tt-black: rgba(0,0,0,0.55);
      --tt-black2: rgba(0,0,0,0.35);
      --tt-line: rgba(255,255,255,0.10);
    }

    .tt-invWrap { height: 100%; display: flex; flex-direction: column; gap: 16px; }

    .tt-invTop {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }

    .tt-invCard {
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.10);
      background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
      box-shadow: 0 18px 50px rgba(0,0,0,0.35);
      backdrop-filter: blur(14px);
      overflow: hidden;
      min-height: 0;
    }

    .tt-invHead {
      padding: 16px 16px 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.10);
      display: flex;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      align-items: center;
    }

    .tt-brandRow { display: flex; align-items: center; gap: 12px; }
    .tt-logoBox {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background: linear-gradient(135deg, var(--tt-purple2), var(--tt-purple));
      box-shadow: 0 14px 34px rgba(124,58,237,0.28);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 950;
      letter-spacing: 0.5px;
      color: #fff;
      user-select: none;
    }

    .tt-brandText { display: flex; flex-direction: column; gap: 2px; }
    .tt-brandName { font-size: 14px; font-weight: 950; color: rgba(255,255,255,0.92); }
    .tt-brandSub { font-size: 12px; color: rgba(255,255,255,0.60); }

    .tt-invTitleBlock { display: flex; flex-direction: column; gap: 6px; }
    .tt-invTitle { margin: 0; font-size: 22px; font-weight: 950; letter-spacing: 0.2px; }
    .tt-invTitleMeta { font-size: 12px; color: rgba(255,255,255,0.60); line-height: 1.4; }

    .tt-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
    .tt-btn {
      height: 38px;
      padding: 0 12px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.88);
      display: inline-flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
      transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.2px;
    }
    .tt-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(0,0,0,0.28); background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.14); }
    .tt-btnPrimary {
      background: linear-gradient(135deg, var(--tt-purple2), var(--tt-purple));
      border-color: rgba(124,58,237,0.55);
      box-shadow: 0 14px 34px rgba(124,58,237,0.28);
      color: #fff;
    }
    .tt-btnPrimary:hover { filter: brightness(1.06); }

    .tt-pill {
      height: 26px;
      padding: 0 12px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.06);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.2px;
      color: rgba(255,255,255,0.90);
    }
    .tt-paid { border-color: rgba(34,197,94,0.32); background: rgba(34,197,94,0.14); }
    .tt-unpaid { border-color: rgba(245,158,11,0.32); background: rgba(245,158,11,0.16); }
    .tt-failed { border-color: rgba(239,68,68,0.32); background: rgba(239,68,68,0.16); }
    .tt-pending { border-color: rgba(124,58,237,0.32); background: rgba(124,58,237,0.16); }
    .tt-overdue { border-color: rgba(239,68,68,0.45); background: rgba(239,68,68,0.18); }

    .tt-grid {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 16px;
      padding: 16px;
    }

    .tt-block {
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.14);
      padding: 12px;
      min-height: 0;
    }

    .tt-blockTitle {
      margin: 0;
      font-size: 12px;
      font-weight: 950;
      color: rgba(255,255,255,0.78);
      letter-spacing: 0.2px;
      text-transform: uppercase;
    }

    .tt-kv {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: 10px;
      margin-top: 10px;
    }
    .tt-k { font-size: 12px; color: rgba(255,255,255,0.55); }
    .tt-v { font-size: 13px; color: rgba(255,255,255,0.86); overflow: hidden; text-overflow: ellipsis; }

    .tt-tableWrap { padding: 0 16px 16px 16px; }
    .tt-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.12);
    }
    .tt-th {
      text-align: left;
      padding: 12px 12px;
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.2px;
      color: rgba(255,255,255,0.62);
      background: rgba(10,10,14,0.70);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      white-space: nowrap;
    }
    .tt-td {
      padding: 12px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.82);
      font-size: 13px;
      white-space: nowrap;
    }
    .tt-tdDesc { white-space: normal; }
    .tt-tr:last-child .tt-td { border-bottom: none; }
    .tt-right { text-align: right; }

    .tt-totalsRow {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 16px;
      padding: 16px;
      padding-top: 0;
      align-items: start;
    }

    .tt-totalsBox {
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.10);
      background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%);
      padding: 12px;
    }

    .tt-totalLine { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .tt-totalLine:last-child { border-bottom: none; }
    .tt-totalKey { font-size: 12px; color: rgba(255,255,255,0.62); font-weight: 800; }
    .tt-totalVal { font-size: 13px; color: rgba(255,255,255,0.90); font-weight: 950; }
    .tt-totalGrand .tt-totalKey { font-size: 12px; text-transform: uppercase; letter-spacing: 0.2px; }
    .tt-totalGrand .tt-totalVal { font-size: 16px; }

    .tt-foot {
      padding: 16px;
      border-top: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.10);
      display: flex;
      gap: 16px;
      justify-content: space-between;
      flex-wrap: wrap;
      align-items: center;
    }
    .tt-footNote { font-size: 12px; color: rgba(255,255,255,0.62); line-height: 1.4; max-width: 860px; }

    .tt-toastWrap { position: fixed; bottom: 24px; right: 24px; z-index: 90; }
    .tt-toast {
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.70);
      backdrop-filter: blur(14px);
      padding: 10px 12px;
      color: rgba(255,255,255,0.92);
      font-size: 13px;
      box-shadow: 0 22px 70px rgba(0,0,0,0.45);
      max-width: 420px;
    }

    @media (max-width: 1100px) {
      .tt-grid { grid-template-columns: 1fr; }
      .tt-kv { grid-template-columns: 1fr; }
      .tt-totalsRow { grid-template-columns: 1fr; }
    }
  `;

  const statusClass = getStatusClass(invoice.status);

  return (
    <div className="tt-invoice">
      <style>{css}</style>

      <div className="tt-invWrap">
        <div className="tt-invCard">
          <div className="tt-invHead">
            <div className="tt-brandRow">
              <div className="tt-logoBox" title="TabbyPay">
                TP
              </div>
              <div className="tt-brandText">
                <div className="tt-brandName">{invoice.seller.brand}</div>
                <div className="tt-brandSub">{invoice.seller.parent}</div>
              </div>
            </div>

            <div className="tt-invTitleBlock">
              <h1 className="tt-invTitle">Invoice</h1>
              <div className="tt-invTitleMeta">
                Invoice No: <b>{invoice.invoiceNo}</b> · Cycle: <b>{invoice.cycle}</b>
              </div>
            </div>

            <div className="tt-actions">
              <span className={`tt-pill ${statusClass}`}>
                <Dot />
                {invoice.status}
              </span>

              <button type="button" className="tt-btn" onClick={() => showToast("Print will be enabled when we wire PDF/print layout.")}>
                Print
              </button>

              <button type="button" className="tt-btn" onClick={() => showToast("Download will be enabled when we wire PDF export.")}>
                Download
              </button>

              <button type="button" className="tt-btn tt-btnPrimary" onClick={() => showToast("Pay now will be enabled when Paystack is wired.")}>
                Pay now
              </button>
            </div>
          </div>

          <div className="tt-grid">
            <div className="tt-block">
              <p className="tt-blockTitle">Bill to</p>

              <div className="tt-kv">
                <div className="tt-k">Customer</div>
                <div className="tt-v">{invoice.customer.name}</div>

                <div className="tt-k">Email</div>
                <div className="tt-v">{invoice.customer.email}</div>

                <div className="tt-k">Phone</div>
                <div className="tt-v">{invoice.customer.phone || "Not set"}</div>
              </div>

              {invoice.customer.addressLines?.length ? (
                <div style={{ marginTop: 10, color: "rgba(255,255,255,0.70)", fontSize: 13, lineHeight: 1.5 }}>
                  {invoice.customer.addressLines.join(", ")}
                </div>
              ) : null}
            </div>

            <div className="tt-block">
              <p className="tt-blockTitle">Invoice details</p>

              <div className="tt-kv">
                <div className="tt-k">Account</div>
                <div className="tt-v">{invoice.account}</div>

                <div className="tt-k">Invoice date</div>
                <div className="tt-v">{fmtDateShort(invoice.issuedDate)}</div>

                <div className="tt-k">Generated date</div>
                <div className="tt-v">{fmtDateShort(invoice.generatedDate)}</div>

                <div className="tt-k">Payment date</div>
                <div className="tt-v">{invoice.paymentDate ? fmtDateShort(invoice.paymentDate) : "Not paid"}</div>

                <div className="tt-k">Payment method</div>
                <div className="tt-v">{invoice.paymentMethod}</div>
              </div>
            </div>

            <div className="tt-block">
              <p className="tt-blockTitle">Payment status</p>

              <div className="tt-kv">
                <div className="tt-k">Reference</div>
                <div className="tt-v">{invoice.payment.reference}</div>

                <div className="tt-k">Card or account</div>
                <div className="tt-v">{invoice.payment.maskedAccount}</div>

                <div className="tt-k">Next attempt</div>
                <div className="tt-v">{invoice.payment.nextAttempt ? fmtDateShort(invoice.payment.nextAttempt) : "Not scheduled"}</div>

                <div className="tt-k">Last attempt</div>
                <div className="tt-v">{invoice.payment.lastAttempt ? fmtDateTimeLong(invoice.payment.lastAttempt) : "Not set"}</div>

                <div className="tt-k">Last error</div>
                <div className="tt-v">{invoice.payment.lastError || "None"}</div>
              </div>

              <div style={{ marginTop: 10, color: "rgba(255,255,255,0.62)", fontSize: 12, lineHeight: 1.5 }}>
                {invoice.notes}
              </div>
            </div>

            <div className="tt-block">
              <p className="tt-blockTitle">Seller</p>

              <div className="tt-kv">
                <div className="tt-k">Business</div>
                <div className="tt-v">{invoice.seller.legalLine1}</div>

                <div className="tt-k">Location</div>
                <div className="tt-v">{invoice.seller.legalLine2}</div>

                <div className="tt-k">VAT No</div>
                <div className="tt-v">{invoice.seller.vatNo || "Not set"}</div>

                <div className="tt-k">Reg No</div>
                <div className="tt-v">{invoice.seller.regNo || "Not set"}</div>
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
                {invoice.items.map((it, idx) => (
                  <tr key={idx} className="tt-tr">
                    <td className="tt-td tt-tdDesc">{it.description}</td>
                    <td className="tt-td">{fmtDateShort(it.from)}</td>
                    <td className="tt-td">{fmtDateShort(it.to)}</td>
                    <td className="tt-td tt-right">{currencyZar(it.amountZar)}</td>
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
                <div className="tt-v">{invoice.help.email}</div>

                <div className="tt-k">Portal</div>
                <div className="tt-v">{invoice.help.portalText}</div>
              </div>

              <div style={{ marginTop: 10, color: "rgba(255,255,255,0.60)", fontSize: 12, lineHeight: 1.5 }}>
                Thank you for your business.
              </div>
            </div>

            <div className="tt-totalsBox">
              <div className="tt-totalLine">
                <div className="tt-totalKey">Subtotal</div>
                <div className="tt-totalVal">{currencyZar(invoice.totals.subtotalZar)}</div>
              </div>

              <div className="tt-totalLine">
                <div className="tt-totalKey">VAT</div>
                <div className="tt-totalVal">{currencyZar(invoice.totals.vatZar)}</div>
              </div>

              <div className="tt-totalLine tt-totalGrand">
                <div className="tt-totalKey">Total</div>
                <div className="tt-totalVal">{currencyZar(invoice.totals.totalZar)}</div>
              </div>
            </div>
          </div>

          <div className="tt-foot">
            <div className="tt-footNote">
              This is an HTML invoice view for TabbyPay. Payment capture and accounting sync will be wired via Paystack webhooks and Zoho Books integration.
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="tt-btn" onClick={() => showToast("Email invoice will be enabled when sending rules are wired.")}>
                Email invoice
              </button>
              <button type="button" className="tt-btn" onClick={() => showToast("Copy link will be enabled when routes are wired.")}>
                Copy link
              </button>
            </div>
          </div>
        </div>

        {toast ? (
          <div className="tt-toastWrap">
            <div className="tt-toast">{toast}</div>
          </div>
        ) : null}
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
  if (status === "Paid") return "tt-paid";
  if (status === "Unpaid") return "tt-unpaid";
  if (status === "Failed") return "tt-failed";
  if (status === "Pending") return "tt-pending";
  return "tt-overdue";
}

function currencyZar(n) {
  const val = Number(n || 0);
  return val.toLocaleString("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 });
}

function fmtDateShort(yyyyMmDd) {
  const d = new Date(yyyyMmDd + "T00:00:00.000Z");
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "2-digit" });
}

function fmtDateTimeLong(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
