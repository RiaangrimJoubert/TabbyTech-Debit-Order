import React, { useMemo, useState } from "react";

export default function Dashboard() {
  // UI-only seed metrics
  const seed = useMemo(
    () => ({
      debitOrdersActive: 1284,
      nextRunLabel: "Fri 08:00",
      nextRunMeta: "112 items queued",
      exceptions: 23,
      collectionsMtd: 482910,

      subscriptions: {
        monthly: {
          active: 86,
          mrrZar: 129900,
          churn7d: 2,
          new7d: 6,
        },
        annual: {
          active: 19,
          arrZar: 228000,
          renewals30d: 3,
          new30d: 1,
        },
      },

      recentBatches: [
        { id: "FEB-05-AM", status: "Draft", items: 112 },
        { id: "FEB-03-PM", status: "Exported", items: 98 },
        { id: "JAN-29-AM", status: "Sent", items: 141 },
      ],
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
  .tt-dash { width: 100%; height: 100%; color: rgba(255,255,255,0.92); }
  .tt-wrap { max-width: 1200px; margin: 0 auto; padding: 18px 18px 32px; }

  .tt-gridTop {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
    gap: 16px;
  }

  .tt-card {
    border-radius: 22px;
    border: 1px solid rgba(255,255,255,0.08);
    background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03));
    backdrop-filter: blur(18px);
    box-shadow: 0 18px 60px rgba(0,0,0,0.26);
    padding: 18px;
    min-height: 96px;
  }

  .tt-cardSmall { padding: 16px; min-height: 96px; }

  .tt-kicker { font-size: 12px; color: rgba(255,255,255,0.62); font-weight: 800; letter-spacing: 0.2px; }
  .tt-value { margin-top: 8px; font-size: 30px; font-weight: 950; letter-spacing: -0.02em; color: rgba(255,255,255,0.95); }
  .tt-sub { margin-top: 6px; font-size: 13px; color: rgba(255,255,255,0.62); line-height: 1.4; }

  .tt-valueSm { margin-top: 8px; font-size: 22px; font-weight: 950; letter-spacing: -0.02em; color: rgba(255,255,255,0.95); }
  .tt-subRow { margin-top: 8px; display: flex; gap: 10px; flex-wrap: wrap; }

  .tt-chip {
    height: 26px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.22);
    color: rgba(255,255,255,0.78);
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.2px;
    gap: 8px;
  }

  .tt-chipDot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: rgba(255,255,255,0.85);
    box-shadow: 0 0 0 6px rgba(124,58,237,0.12);
    opacity: 0.9;
  }

  .tt-purplePill {
    border-color: rgba(124,58,237,0.40);
    background: rgba(124,58,237,0.14);
    color: rgba(255,255,255,0.92);
  }

  .tt-gridMain {
    margin-top: 16px;
    display: grid;
    grid-template-columns: 1.6fr 1fr;
    gap: 16px;
  }

  .tt-titleRow {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 10px;
  }

  .tt-h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 950;
    letter-spacing: -0.01em;
    color: rgba(255,255,255,0.92);
  }

  .tt-h2Purple {
    color: rgba(168,85,247,0.95);
  }

  .tt-btn {
    border-radius: 12px;
    padding: 10px 12px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.92);
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
    transition: transform 120ms ease, background 180ms ease, border-color 180ms ease;
  }
  .tt-btn:hover { background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.14); transform: translateY(-1px); }
  .tt-btn:active { transform: translateY(0px); }

  .tt-btnPrimary {
    background: linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95));
    border-color: rgba(168,85,247,0.55);
    box-shadow: 0 14px 34px rgba(124,58,237,0.28);
    color: #fff;
  }

  .tt-list {
    display: grid;
    gap: 12px;
    margin-top: 10px;
  }

  .tt-rowItem {
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.18);
    padding: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .tt-rowLeft { display: flex; flex-direction: column; gap: 6px; min-width: 160px; }
  .tt-rowTitle { font-size: 14px; font-weight: 950; color: rgba(255,255,255,0.92); }
  .tt-rowMeta { font-size: 12px; color: rgba(255,255,255,0.62); }

  .tt-statusPill {
    min-width: 120px;
    height: 26px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid rgba(124,58,237,0.35);
    background: rgba(124,58,237,0.12);
    color: rgba(255,255,255,0.92);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 950;
    letter-spacing: 0.2px;
  }

  .tt-tableHead {
    display: grid;
    grid-template-columns: 1.1fr 1fr 0.6fr;
    gap: 10px;
    margin-top: 10px;
    padding: 0 4px;
    color: rgba(255,255,255,0.62);
    font-size: 12px;
    font-weight: 900;
  }

  .tt-tableRow {
    display: grid;
    grid-template-columns: 1.1fr 1fr 0.6fr;
    gap: 10px;
    align-items: center;
  }

  .tt-rightNum { text-align: right; font-weight: 950; color: rgba(255,255,255,0.90); }

  .tt-divider {
    height: 1px;
    margin: 14px 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
  }

  .tt-subGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 10px;
  }

  .tt-mini {
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.18);
    padding: 14px;
  }

  .tt-miniTitle { font-size: 12px; font-weight: 950; color: rgba(255,255,255,0.82); letter-spacing: 0.2px; }
  .tt-miniValue { margin-top: 8px; font-size: 18px; font-weight: 950; color: rgba(255,255,255,0.95); }
  .tt-miniMeta { margin-top: 6px; font-size: 12px; color: rgba(255,255,255,0.62); line-height: 1.4; }

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
    .tt-gridTop { grid-template-columns: 1fr; }
    .tt-gridMain { grid-template-columns: 1fr; }
    .tt-subGrid { grid-template-columns: 1fr; }
  }
  `;

  const monthly = seed.subscriptions.monthly;
  const annual = seed.subscriptions.annual;

  return (
    <div className="tt-dash">
      <style>{css}</style>

      <div className="tt-wrap">
        {/* TOP METRICS ROW */}
        <div className="tt-gridTop">
          <div className="tt-card tt-cardSmall" style={{ gridColumn: "span 2" }}>
            <div className="tt-kicker">Active Debit Orders</div>
            <div className="tt-value">{seed.debitOrdersActive.toLocaleString("en-ZA")}</div>
            <div className="tt-sub">Currently running</div>
          </div>

          <div className="tt-card tt-cardSmall" style={{ gridColumn: "span 2" }}>
            <div className="tt-kicker">Next Run</div>
            <div className="tt-value">{seed.nextRunLabel}</div>
            <div className="tt-sub">{seed.nextRunMeta}</div>
          </div>

          <div className="tt-card tt-cardSmall">
            <div className="tt-kicker">Exceptions</div>
            <div className="tt-value">{seed.exceptions.toLocaleString("en-ZA")}</div>
            <div className="tt-sub">Needs attention</div>
          </div>

          <div className="tt-card tt-cardSmall">
            <div className="tt-kicker">Collections (MTD)</div>
            <div className="tt-valueSm">{zar(seed.collectionsMtd)}</div>
            <div className="tt-sub">Scheduled total</div>
          </div>

          {/* NEW: Monthly subscriptions */}
          <div className="tt-card tt-cardSmall" style={{ gridColumn: "span 3" }}>
            <div className="tt-kicker">Monthly Subscriptions</div>
            <div className="tt-valueSm">
              {monthly.active.toLocaleString("en-ZA")} active · {zar(monthly.mrrZar)} MRR
            </div>
            <div className="tt-subRow">
              <span className="tt-chip tt-purplePill">
                <span className="tt-chipDot" />
                New 7d: {monthly.new7d}
              </span>
              <span className="tt-chip">
                <span className="tt-chipDot" />
                Churn 7d: {monthly.churn7d}
              </span>
              <button className="tt-btn tt-btnPrimary" type="button" onClick={() => showToast("Subscriptions view is UI-only for now.")}>
                Open
              </button>
            </div>
          </div>

          {/* NEW: Annual subscriptions */}
          <div className="tt-card tt-cardSmall" style={{ gridColumn: "span 3" }}>
            <div className="tt-kicker">Annual Subscriptions</div>
            <div className="tt-valueSm">
              {annual.active.toLocaleString("en-ZA")} active · {zar(annual.arrZar)} ARR
            </div>
            <div className="tt-subRow">
              <span className="tt-chip tt-purplePill">
                <span className="tt-chipDot" />
                Renewals 30d: {annual.renewals30d}
              </span>
              <span className="tt-chip">
                <span className="tt-chipDot" />
                New 30d: {annual.new30d}
              </span>
              <button className="tt-btn tt-btnPrimary" type="button" onClick={() => showToast("Subscriptions view is UI-only for now.")}>
                Open
              </button>
            </div>
          </div>
        </div>

        {/* MAIN PANELS */}
        <div className="tt-gridMain">
          {/* Today's workflow */}
          <div className="tt-card">
            <div className="tt-titleRow">
              <div>
                <div className="tt-h2 tt-h2Purple">Today's Workflow</div>
              </div>
            </div>

            <div className="tt-list">
              <div className="tt-rowItem">
                <div className="tt-rowLeft">
                  <div className="tt-rowTitle">Review exceptions</div>
                </div>
                <button className="tt-btn" type="button" onClick={() => showToast("Open exceptions is UI-only for now.")}>
                  Open
                </button>
              </div>

              <div className="tt-rowItem">
                <div className="tt-rowLeft">
                  <div className="tt-rowTitle">Prepare next batch</div>
                </div>
                <button className="tt-btn tt-btnPrimary" type="button" onClick={() => showToast("Start batch is UI-only for now.")}>
                  Start
                </button>
              </div>

              <div className="tt-rowItem">
                <div className="tt-rowLeft">
                  <div className="tt-rowTitle">Export bank files</div>
                </div>
                <button className="tt-btn" type="button" onClick={() => showToast("Export is UI-only for now.")}>
                  Export
                </button>
              </div>
            </div>

            <div className="tt-divider" />

            {/* Subscription quick breakdown panel */}
            <div className="tt-h2" style={{ marginBottom: 10 }}>Subscription tracking</div>
            <div className="tt-sub" style={{ marginTop: 0 }}>
              This is a UI-only layer for now. Later we will sync this from Zoho CRM or Zoho Subscriptions and lock down edits to reduce risk.
            </div>

            <div className="tt-subGrid">
              <div className="tt-mini">
                <div className="tt-miniTitle">Monthly MRR</div>
                <div className="tt-miniValue">{zar(monthly.mrrZar)}</div>
                <div className="tt-miniMeta">
                  Active: {monthly.active} · New 7d: {monthly.new7d} · Churn 7d: {monthly.churn7d}
                </div>
              </div>

              <div className="tt-mini">
                <div className="tt-miniTitle">Annual ARR</div>
                <div className="tt-miniValue">{zar(annual.arrZar)}</div>
                <div className="tt-miniMeta">
                  Active: {annual.active} · Renewals 30d: {annual.renewals30d} · New 30d: {annual.new30d}
                </div>
              </div>
            </div>
          </div>

          {/* Recent batches */}
          <div className="tt-card">
            <div className="tt-titleRow">
              <div className="tt-h2 tt-h2Purple">Recent Batches</div>
            </div>

            <div className="tt-tableHead">
              <div>Batch</div>
              <div>Status</div>
              <div className="tt-rightNum">Items</div>
            </div>

            <div className="tt-list">
              {seed.recentBatches.map((b) => (
                <div key={b.id} className="tt-rowItem tt-tableRow">
                  <div style={{ fontWeight: 950, color: "rgba(255,255,255,0.92)" }}>{b.id}</div>
                  <div className="tt-statusPill">{b.status}</div>
                  <div className="tt-rightNum">{b.items.toLocaleString("en-ZA")}</div>
                </div>
              ))}
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

function zar(n) {
  const val = Number(n || 0);
  return val.toLocaleString("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 });
}
