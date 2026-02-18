import React, { useMemo, useState } from "react";

export default function Invoices() {
  // UI-first seed data. We will wire this to Zoho Books later.
  const seed = useMemo(
    () => [
      {
        id: "INV-000184",
        invoiceNo: "INV-000184",
        clientName: "Mewtwo - Tabbytech",
        email: "mewtwo@tabbytech.co.za",
        amountZar: 1000,
        issuedDate: "2026-02-23",
        dueDate: "2026-02-25",
        cycle: "25th",
        status: "Unpaid", // Paid | Unpaid | Failed | Pending | Overdue
        updatedAt: "2026-02-18T08:59:00.000Z",
        method: "Paystack",
      },
      {
        id: "INV-000183",
        invoiceNo: "INV-000183",
        clientName: "Riaan Joubert EMC",
        email: "riaan@tabbytech.co.za",
        amountZar: 350,
        issuedDate: "2026-02-23",
        dueDate: "2026-02-25",
        cycle: "25th",
        status: "Paid",
        updatedAt: "2026-02-25T09:02:00.000Z",
        method: "Paystack",
      },
      {
        id: "INV-000182",
        invoiceNo: "INV-000182",
        clientName: "Mkhize Holdings",
        email: "finance@mkhize.co.za",
        amountZar: 245000,
        issuedDate: "2026-02-28",
        dueDate: "2026-03-01",
        cycle: "1st",
        status: "Pending",
        updatedAt: "2026-03-01T07:45:00.000Z",
        method: "Paystack",
      },
      {
        id: "INV-000181",
        invoiceNo: "INV-000181",
        clientName: "Zulu Trade Group",
        email: "accounts@zulutrade.co.za",
        amountZar: 8900,
        issuedDate: "2026-02-23",
        dueDate: "2026-02-25",
        cycle: "25th",
        status: "Failed",
        updatedAt: "2026-02-25T08:14:00.000Z",
        method: "Paystack",
      },
    ],
    []
  );

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [cycleFilter, setCycleFilter] = useState("All");

  const invoices = seed;

  const counts = useMemo(() => {
    const base = {
      All: invoices.length,
      Paid: 0,
      Unpaid: 0,
      Failed: 0,
      Pending: 0,
      Overdue: 0,
    };
    for (const inv of invoices) base[inv.status] = (base[inv.status] || 0) + 1;
    return base;
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return invoices
      .filter((i) => (statusFilter === "All" ? true : i.status === statusFilter))
      .filter((i) => (cycleFilter === "All" ? true : i.cycle === cycleFilter))
      .filter((i) => {
        if (!q) return true;
        return (
          (i.invoiceNo || "").toLowerCase().includes(q) ||
          (i.clientName || "").toLowerCase().includes(q) ||
          (i.email || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [invoices, query, statusFilter, cycleFilter]);

  const css = `
    .tt-invoices {
      width: 100%;
      height: 100%;
      color: rgba(255,255,255,0.92);
      --tt-purple: rgba(124,58,237,0.95);
      --tt-purple2: rgba(168,85,247,0.95);
      --tt-black: rgba(0,0,0,0.55);
      --tt-black2: rgba(0,0,0,0.35);
    }

    .tt-invWrap { height: 100%; display: flex; flex-direction: column; gap: 16px; }
    .tt-invCard {
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.10);
      background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
      box-shadow: 0 18px 50px rgba(0,0,0,0.35);
      backdrop-filter: blur(14px);
      overflow: hidden;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .tt-invHeader {
      padding: 14px 14px 12px 14px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.10);
    }

    .tt-invTitle { margin: 0; font-size: 14px; font-weight: 900; color: rgba(255,255,255,0.88); }
    .tt-invMeta { margin: 4px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.55); line-height: 1.4; }

    .tt-invControls {
      padding: 14px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.08);
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
    .tt-chip:hover { transform: translateY(-1px); background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.14); box-shadow: 0 10px 24px rgba(0,0,0,0.28); }
    .tt-chipActive { border-color: rgba(124,58,237,0.55); background: rgba(124,58,237,0.16); color: rgba(255,255,255,0.92); }

    .tt-select {
      height: 34px;
      border-radius: 999px;
      border: 1px solid rgba(124,58,237,0.55);
      background: var(--tt-black);
      color: rgba(168,85,247,0.95);
      padding: 0 42px 0 14px;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.2px;
      outline: none;
      cursor: pointer;
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      background-image:
        linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)),
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M7 10l5 5 5-5' stroke='%23A855F7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat, no-repeat;
      background-position: 0 0, right 12px center;
      background-size: auto, 18px 18px;
    }
    .tt-select option { background: rgba(0,0,0,0.92); color: rgba(168,85,247,0.95); }

    .tt-tableScroll { overflow: auto; height: 100%; }
    .tt-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
    .tt-th {
      position: sticky;
      top: 0;
      z-index: 2;
      text-align: left;
      padding: 12px 14px;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.2px;
      color: rgba(255,255,255,0.62);
      background: rgba(10,10,14,0.75);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(10px);
    }
    .tt-td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.80);
      white-space: nowrap;
    }
    .tt-tr { cursor: pointer; transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease; }
    .tt-tr:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(0,0,0,0.28); background: rgba(255,255,255,0.04); }

    .tt-pill {
      height: 22px;
      padding: 0 10px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.86);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.2px;
      justify-content: center;
      min-width: 84px;
    }
    .tt-paid { border-color: rgba(34,197,94,0.32); background: rgba(34,197,94,0.14); }
    .tt-unpaid { border-color: rgba(245,158,11,0.32); background: rgba(245,158,11,0.16); }
    .tt-failed { border-color: rgba(239,68,68,0.32); background: rgba(239,68,68,0.16); }
    .tt-pending { border-color: rgba(124,58,237,0.32); background: rgba(124,58,237,0.16); }
    .tt-overdue { border-color: rgba(239,68,68,0.45); background: rgba(239,68,68,0.18); }

    @media (max-width: 1100px) {
      .tt-invControls { gap: 12px; }
    }
  `;

  return (
    <div className="tt-invoices">
      <style>{css}</style>

      <div className="tt-invWrap">
        <div className="tt-invCard">
          <div className="tt-invHeader">
            <div>
              <p className="tt-invTitle">Invoices</p>
              <p className="tt-invMeta">
                {filtered.length} shown · Status reflects payment outcome (UI-only for now)
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <select
                className="tt-select"
                value={cycleFilter}
                onChange={(e) => setCycleFilter(e.target.value)}
                aria-label="Cycle filter"
              >
                <option value="All">All cycles</option>
                <option value="25th">25th cycle</option>
                <option value="1st">1st cycle</option>
              </select>

              <button
                type="button"
                style={{
                  height: 34,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.88)",
                  padding: "0 12px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
                onClick={() => {}}
                title="Wiring to API will be next"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="tt-invControls">
            <div className="tt-inputWrap">
              <span className="tt-inputIcon">
                <IconSearch />
              </span>
              <input
                className="tt-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search invoice number, client, or email"
                aria-label="Search invoices"
              />
            </div>

            <div className="tt-chipRow">
              {["All", "Paid", "Unpaid", "Failed", "Pending", "Overdue"].map((k) => {
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
                  <th className="tt-th">Client</th>
                  <th className="tt-th">Cycle</th>
                  <th className="tt-th">Due</th>
                  <th className="tt-th">Amount</th>
                  <th className="tt-th">Updated</th>
                  <th className="tt-th" style={{ textAlign: "right" }}>
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="tt-tr">
                    <td className="tt-td">
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.90)" }}>{inv.invoiceNo}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{inv.method}</div>
                      </div>
                    </td>

                    <td className="tt-td">
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 360, overflow: "hidden" }}>
                        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.90)", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {inv.clientName}
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {inv.email}
                        </div>
                      </div>
                    </td>

                    <td className="tt-td">{inv.cycle}</td>
                    <td className="tt-td">{fmtDateShort(inv.dueDate)}</td>
                    <td className="tt-td">{currencyZar(inv.amountZar)}</td>
                    <td className="tt-td">{fmtDateTimeShort(inv.updatedAt)}</td>

                    <td className="tt-td" style={{ textAlign: "right" }}>
                      <span className={`tt-pill ${statusClass(inv.status)}`}>{inv.status}</span>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td className="tt-td" colSpan={7} style={{ padding: 20, whiteSpace: "normal" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.90)" }}>No invoices found</div>
                        <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, lineHeight: 1.4 }}>
                          Try a different search term or adjust your filters.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconSearch({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
      <path d="M16.2 16.2 21 21" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function currencyZar(n) {
  const val = Number(n || 0);
  return val.toLocaleString("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 });
}

function fmtDateShort(yyyyMmDd) {
  const d = new Date(yyyyMmDd + "T00:00:00.000Z");
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "2-digit" });
}

function fmtDateTimeShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "2-digit" });
}

function statusClass(status) {
  if (status === "Paid") return "tt-paid";
  if (status === "Unpaid") return "tt-unpaid";
  if (status === "Failed") return "tt-failed";
  if (status === "Pending") return "tt-pending";
  return "tt-overdue";
}
