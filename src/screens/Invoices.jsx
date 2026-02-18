import React, { useMemo, useState } from "react";

export default function Invoices() {
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
          email: "support@tabbytech.co.za",
          portalText: "Client portal (coming soon)",
        },
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
        customer: {
          name: "Riaan Joubert EMC",
          email: "Riaan@tabbytech.co.za",
          phone: "",
          addressLines: [],
        },
        items: [
          {
            description: "TabbyPay Subscription - Monthly",
            from: "2026-02-25",
            to: "2026-03-24",
            amountZar: 350,
          },
        ],
        totals: {
          subtotalZar: 304.35,
          vatZar: 45.65,
          totalZar: 350,
        },
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
        help: {
          email: "support@tabbytech.co.za",
          portalText: "Client portal (coming soon)",
        },
        notes:
          "Paid successfully. Accounting sync will mark the Zoho Books invoice as paid when we wire the integration.",
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
        customer: {
          name: "Example Co",
          email: "accounts@example.co.za",
          phone: "",
          addressLines: [],
        },
        items: [
          {
            description: "TabbyPay Subscription - Monthly",
            from: "2026-03-01",
            to: "2026-03-31",
            amountZar: 1299,
          },
        ],
        totals: {
          subtotalZar: 1129.57,
          vatZar: 169.43,
          totalZar: 1299,
        },
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
        help: {
          email: "support@tabbytech.co.za",
          portalText: "Client portal (coming soon)",
        },
        notes:
          "Pending collection. This will move to Paid or Failed via Paystack webhook events later.",
      },
    ],
    []
  );

  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [toast, setToast] = useState("");

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 2200);
  }

  const selected = useMemo(
    () => invoices.find((i) => i.id === selectedId) || null,
    [invoices, selectedId]
  );

  const counts = useMemo(() => {
    const base = { All: invoices.length, Paid: 0, Unpaid: 0, Failed: 0, Pending: 0, Overdue: 0 };
    for (const i of invoices) base[i.status] = (base[i.status] || 0) + 1;
    return base;
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices
      .filter((i) => (statusFilter === "All" ? true : i.status === statusFilter))
      .filter((i) => {
        if (!q) return true;
        return (
          String(i.invoiceNo || "").toLowerCase().includes(q) ||
          String(i.customer?.name || "").toLowerCase().includes(q) ||
          String(i.customer?.email || "").toLowerCase().includes(q) ||
          String(i.payment?.reference || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime());
  }, [invoices, query, statusFilter]);

  function exportExcel() {
    try {
      const rows = filtered.map((inv) => ({
        invoiceNo: inv.invoiceNo,
        customer: inv.customer?.name || "",
        email: inv.customer?.email || "",
        cycle: inv.cycle || "",
        status: inv.status || "",
        total: Number(inv.totals?.totalZar ?? 0),
        generated: inv.generatedDate || "",
        reference: inv.payment?.reference || "",
      }));

      const headers = [
        "Invoice No",
        "Customer",
        "Email",
        "Cycle",
        "Status",
        "Total (ZAR)",
        "Generated",
        "Reference",
      ];

      const bodyRows = rows
        .map(
          (r) => `
          <tr>
            <td>${escapeHtml(r.invoiceNo)}</td>
            <td>${escapeHtml(r.customer)}</td>
            <td>${escapeHtml(r.email)}</td>
            <td>${escapeHtml(r.cycle)}</td>
            <td>${escapeHtml(r.status)}</td>
            <td style="mso-number-format:'0.00'; text-align:right;">${Number(r.total || 0).toFixed(2)}</td>
            <td>${escapeHtml(r.generated)}</td>
            <td>${escapeHtml(r.reference)}</td>
          </tr>
        `
        )
        .join("");

      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:x="urn:schemas-microsoft-com:office:excel"
              xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8" />
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <!--[if gte mso 9]>
              <xml>
                <x:ExcelWorkbook>
                  <x:ExcelWorksheets>
                    <x:ExcelWorksheet>
                      <x:Name>Invoices</x:Name>
                      <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                    </x:ExcelWorksheet>
                  </x:ExcelWorksheets>
                </x:ExcelWorkbook>
              </xml>
            <![endif]-->
          </head>
          <body>
            <table border="1" cellspacing="0" cellpadding="6">
              <thead>
                <tr>
                  ${headers.map((h) => `<th style="background:#f2f2f2;">${escapeHtml(h)}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${bodyRows}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
      const now = new Date();
      const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
      downloadBlob(blob, `TabbyPay_Invoices_${stamp}.xls`);
      showToast(`Exported ${rows.length} invoices to Excel.`);
    } catch (e) {
      showToast(`Export failed: ${e?.message || String(e)}`);
    }
  }

  const css = `
    .tt-invoice {
      width: 100%;
      height: 100%;
      color: rgba(255,255,255,0.92);
      --tt-purple: rgba(124,58,237,0.95);
      --tt-purple2: rgba(168,85,247,0.95);
      --tt-line: rgba(255,255,255,0.10);
    }

    .tt-invWrap { height: 100%; display: flex; flex-direction: column; gap: 16px; }

    .tt-glass {
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.10);
      background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
      box-shadow: 0 18px 50px rgba(0,0,0,0.35);
      backdrop-filter: blur(14px);
      overflow: hidden;
      min-height: 0;
    }

    .tt-head {
      padding: 16px 16px 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.10);
      display: flex;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      align-items: center;
    }

    .tt-titleBlock { display: flex; flex-direction: column; gap: 6px; }
    .tt-title { margin: 0; font-size: 22px; font-weight: 950; letter-spacing: 0.2px; }
    .tt-sub { font-size: 12px; color: rgba(255,255,255,0.60); line-height: 1.4; }

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
    .tt-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(0,0,0,0.28);
      background: rgba(255,255,255,0.10);
      border-color: rgba(255,255,255,0.14);
    }

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
      white-space: nowrap;
    }
    .tt-paid { border-color: rgba(34,197,94,0.32); background: rgba(34,197,94,0.14); }
    .tt-unpaid { border-color: rgba(245,158,11,0.32); background: rgba(245,158,11,0.16); }
    .tt-failed { border-color: rgba(239,68,68,0.32); background: rgba(239,68,68,0.16); }
    .tt-pending { border-color: rgba(124,58,237,0.32); background: rgba(124,58,237,0.16); }
    .tt-overdue { border-color: rgba(239,68,68,0.45); background: rgba(239,68,68,0.18); }

    .tt-chipRow { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .tt-chip {
      height: 34px;
      padding: 0 10px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.76);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.2px;
      user-select: none;
      transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease;
    }
    .tt-chip:hover {
      transform: translateY(-1px);
      background: rgba(255,255,255,0.07);
      border-color: rgba(255,255,255,0.14);
      box-shadow: 0 10px 24px rgba(0,0,0,0.28);
    }
    .tt-chipActive { border-color: rgba(124,58,237,0.55); background: rgba(124,58,237,0.16); color: rgba(255,255,255,0.92); }

    .tt-controls {
      padding: 14px 16px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.06);
    }

    .tt-inputWrap { position: relative; flex: 1 1 320px; max-width: 560px; }
    .tt-inputIcon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); opacity: 0.75; }
    .tt-input {
      width: 100%;
      height: 38px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.18);
      color: rgba(255,255,255,0.88);
      outline: none;
      padding: 0 12px 0 38px;
      font-size: 13px;
    }
    .tt-input:focus { border-color: rgba(124,58,237,0.45); box-shadow: 0 0 0 6px rgba(124,58,237,0.18); }

    .tt-tableScroll { overflow: auto; }
    .tt-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
    .tt-th {
      position: sticky;
      top: 0;
      z-index: 2;
      text-align: left;
      padding: 12px 14px;
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.2px;
      color: rgba(255,255,255,0.62);
      background: rgba(10,10,14,0.75);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(10px);
      white-space: nowrap;
    }
    .tt-thCenter { text-align: center; }
    .tt-td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.78);
      white-space: nowrap;
      vertical-align: middle;
    }

    .tt-tr {
      cursor: pointer;
      transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease;
    }
    .tt-tr:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(0,0,0,0.28);
      background: rgba(255,255,255,0.04);
    }
    .tt-trActive { background: rgba(124,58,237,0.14); }

    .tt-right { text-align: right; }
    .tt-muted { color: rgba(255,255,255,0.58); }

    .tt-centerCell { text-align: center; }
    .tt-centerCellInner { display: flex; justify-content: center; align-items: center; }

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

    /* Detail invoice */
    .tt-invCard {
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.10);
      background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
      box-shadow: 0 18px 50px rgba(0,0,0,0.35);
      backdrop-filter: blur(14px);
      overflow: hidden;
      min-height: 0;
    }

    .tt-invHeadInner {
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
    .tt-table2 {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.12);
    }
    .tt-th2 {
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
    .tt-td2 {
      padding: 12px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.82);
      font-size: 13px;
      white-space: nowrap;
      vertical-align: top;
    }
    .tt-tdDesc { white-space: normal; }
    .tt-tr2:last-child .tt-td2 { border-bottom: none; }
    .tt-right2 { text-align: right; }

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

    /* Print */
    .tt-hidePrint {}
    @media print {
      .tt-hidePrint { display: none !important; }
      .tt-invCard, .tt-block, .tt-totalsBox, .tt-table2 { box-shadow: none !important; backdrop-filter: none !important; }
    }

    @media (max-width: 1100px) {
      .tt-grid { grid-template-columns: 1fr; }
      .tt-kv { grid-template-columns: 1fr; }
      .tt-totalsRow { grid-template-columns: 1fr; }
    }
  `;

  return (
    <div className="tt-invoice">
      <style>{css}</style>

      <div className="tt-invWrap">
        {!selected ? (
          <div className="tt-glass">
            <div className="tt-head">
              <div className="tt-titleBlock">
                <h1 className="tt-title">Invoices</h1>
                <div className="tt-sub">List view first. Click View to open the full HTML invoice layout.</div>
              </div>

              <div className="tt-actions">
                <button type="button" className="tt-btn tt-btnPrimary" onClick={exportExcel}>
                  Export
                </button>
              </div>
            </div>

            <div className="tt-controls">
              <div className="tt-inputWrap">
                <span className="tt-inputIcon">
                  <IconSearch />
                </span>
                <input
                  className="tt-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search invoice no, customer, email, or reference"
                  aria-label="Search invoices"
                />
              </div>

              <div className="tt-chipRow">
                {["All", "Paid", "Unpaid", "Pending", "Failed", "Overdue"].map((k) => {
                  const active = statusFilter === k;
                  return (
                    <div
                      key={k}
                      className={active ? "tt-chip tt-chipActive" : "tt-chip"}
                      role="button"
                      tabIndex={0}
                      onClick={() => setStatusFilter(k)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setStatusFilter(k);
                      }}
                      title={`Filter: ${k}`}
                    >
                      <span>{k}</span>
                      <span style={{ opacity: 0.85 }}>{counts[k] ?? 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="tt-tableScroll">
              <table className="tt-table">
                <thead>
                  <tr>
                    <th className="tt-th">Invoice</th>
                    <th className="tt-th">Customer</th>
                    <th className="tt-th">Cycle</th>
                    <th className="tt-th tt-thCenter">Status</th>
                    <th className="tt-th tt-right">Total</th>
                    <th className="tt-th">Generated</th>
                    <th className="tt-th tt-thCenter">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((inv) => {
                    const isActive = inv.id === selectedId;
                    const statusClass = getStatusClass(inv.status);

                    return (
                      <tr
                        key={inv.id}
                        className={["tt-tr", isActive ? "tt-trActive" : ""].join(" ").trim()}
                        onClick={() => setSelectedId(inv.id)}
                        title="Open invoice"
                      >
                        <td className="tt-td">
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ fontWeight: 950, color: "rgba(255,255,255,0.90)" }}>{inv.invoiceNo}</div>
                            <div className="tt-muted" style={{ fontSize: 12 }}>
                              Ref: {inv.payment?.reference || "Not set"}
                            </div>
                          </div>
                        </td>

                        <td className="tt-td">
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ fontWeight: 900 }}>{inv.customer?.name || "Customer"}</div>
                            <div className="tt-muted" style={{ fontSize: 12 }}>
                              {inv.customer?.email || "Not set"}
                            </div>
                          </div>
                        </td>

                        <td className="tt-td">{inv.cycle}</td>

                        <td className="tt-td tt-centerCell">
                          <div className="tt-centerCellInner">
                            <span className={`tt-pill ${statusClass}`}>
                              <Dot />
                              {inv.status}
                            </span>
                          </div>
                        </td>

                        <td className="tt-td tt-right">{currencyZar(inv.totals?.totalZar ?? 0)}</td>

                        <td className="tt-td">{fmtDateShort(inv.generatedDate)}</td>

                        <td className="tt-td tt-centerCell">
                          <div className="tt-centerCellInner">
                            <button
                              type="button"
                              className="tt-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(inv.id);
                              }}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filtered.length === 0 && (
                    <tr>
                      <td className="tt-td" colSpan={7} style={{ padding: 20, whiteSpace: "normal" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ fontWeight: 950, color: "rgba(255,255,255,0.90)" }}>No invoices found</div>
                          <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, lineHeight: 1.4 }}>
                            Try a different search term or change the status filter.
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <InvoiceDetail invoice={selected} onBack={() => setSelectedId("")} onToast={showToast} />
        )}

        {toast ? (
          <div className="tt-toastWrap">
            <div className="tt-toast">{toast}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InvoiceDetail({ invoice, onBack, onToast }) {
  const statusClass = getStatusClass(invoice.status);

  function onPrint() {
    try {
      window.print();
    } catch {
      onToast("Print is not available in this browser.");
    }
  }

  function onDownload() {
    onToast("Use Print, then select Save as PDF to download.");
    try {
      window.print();
    } catch {}
  }

  return (
    <div className="tt-invCard">
      <div className="tt-invHeadInner tt-hidePrint">
        <div className="tt-brandRow">
          <div className="tt-logoBox" title={invoice.seller?.brand || "TabbyPay"}>
            TP
          </div>
          <div className="tt-brandText">
            <div className="tt-brandName">{invoice.seller?.brand || "TabbyPay"}</div>
            <div className="tt-brandSub">{invoice.seller?.parent || "TabbyTech"}</div>
          </div>
        </div>

        <div className="tt-invTitleBlock">
          <h1 className="tt-invTitle">Invoice</h1>
          <div className="tt-invTitleMeta">
            Invoice No: <b>{invoice.invoiceNo}</b> · Cycle: <b>{invoice.cycle}</b>
          </div>
        </div>

        <div className="tt-actions">
          <button type="button" className="tt-btn" onClick={onBack}>
            Back
          </button>

          <span className={`tt-pill ${statusClass}`}>
            <Dot />
            {invoice.status}
          </span>

          <button type="button" className="tt-btn" onClick={onPrint}>
            Print
          </button>

          <button type="button" className="tt-btn" onClick={onDownload}>
            Download
          </button>

          <button type="button" className="tt-btn tt-btnPrimary" onClick={() => onToast("Pay now will be enabled when Paystack is wired.")}>
            Pay now
          </button>
        </div>
      </div>

      <div className="tt-invHeadInner" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="tt-brandRow">
          <div className="tt-logoBox" title={invoice.seller?.brand || "TabbyPay"}>
            TP
          </div>
          <div className="tt-brandText">
            <div className="tt-brandName">{invoice.seller?.brand || "TabbyPay"}</div>
            <div className="tt-brandSub">{invoice.seller?.parent || "TabbyTech"}</div>
          </div>
        </div>

        <div className="tt-invTitleBlock">
          <h1 className="tt-invTitle">Invoice</h1>
          <div className="tt-invTitleMeta">
            Invoice No: <b>{invoice.invoiceNo}</b> · Cycle: <b>{invoice.cycle}</b>
          </div>
        </div>

        <div className="tt-actions tt-hidePrint">
          <span className={`tt-pill ${statusClass}`}>
            <Dot />
            {invoice.status}
          </span>
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
        <table className="tt-table2">
          <thead>
            <tr>
              <th className="tt-th2" style={{ width: "55%" }}>Description</th>
              <th className="tt-th2">From</th>
              <th className="tt-th2">To</th>
              <th className="tt-th2 tt-right2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((it, idx) => (
              <tr key={idx} className="tt-tr2">
                <td className="tt-td2 tt-tdDesc">{it.description || ""}</td>
                <td className="tt-td2">{it.from ? fmtDateShort(it.from) : "Not set"}</td>
                <td className="tt-td2">{it.to ? fmtDateShort(it.to) : "Not set"}</td>
                <td className="tt-td2 tt-right2">{currencyZar(it.amountZar || 0)}</td>
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
          <button type="button" className="tt-btn" onClick={() => onToast("Email invoice will be enabled when sending rules are wired.")}>
            Email invoice
          </button>
          <button type="button" className="tt-btn" onClick={() => onToast("Copy link will be enabled when routes are wired.")}>
            Copy link
          </button>
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
  if (!yyyyMmDd) return "Not set";
  const d = new Date(yyyyMmDd + "T00:00:00.000Z");
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "2-digit" });
}

function fmtDateTimeLong(iso) {
  if (!iso) return "Not set";
  const d = new Date(iso);
  return d.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function IconSearch({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
      <path d="M16.2 16.2 21 21" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
