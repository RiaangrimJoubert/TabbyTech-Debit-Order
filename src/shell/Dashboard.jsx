// Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";

/*
  TabbyTech Dashboard (UI-only)
  Focus:
  - Premium purple glass tone consistent with sidebar
  - Subscription tracking control bar aligned and tidy (no side-floating chips)
  - Dropdowns: black background + purple accents
  - localStorage persistence for key UI state
*/

const LS = {
  search: "tabbytech.dashboard.search",
  range: "tabbytech.dashboard.range",
  subView: "tabbytech.dashboard.subView",
  metric: "tabbytech.dashboard.metric",
  batch: "tabbytech.dashboard.batch",
};

function useLocalStorageState(key, initialValue) {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initialValue : JSON.parse(raw);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      // ignore
    }
  }, [key, val]);

  return [val, setVal];
}

function formatZAR(n) {
  const num = Number(n || 0);
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(num);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M13.73 21a2 2 0 01-3.46 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Button({ variant = "primary", children, onClick, type = "button", title, className, style }) {
  return (
    <button
      type={type}
      className={cx("tt-btn", `tt-btn--${variant}`, className)}
      onClick={onClick}
      title={title}
      style={style}
    >
      {children}
    </button>
  );
}

function Pill({ children, tone = "purple" }) {
  return <span className={cx("tt-pill", `tt-pill--${tone}`)}>{children}</span>;
}

function Card({ children, className, accent = false, style }) {
  return (
    <div className={cx("tt-card", accent && "tt-card--accent", className)} style={style}>
      {children}
    </div>
  );
}

function Select({ value, onChange, options, ariaLabel, className }) {
  return (
    <div className={cx("tt-selectWrap", className)}>
      <select className="tt-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="tt-selectChevron" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 10l5 5 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

function Progress({ value }) {
  const pct = clamp(value, 0, 100);
  return (
    <div className="tt-progress">
      <div className="tt-progressBar" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Dashboard() {
  const [search, setSearch] = useLocalStorageState(LS.search, "");
  const [range, setRange] = useLocalStorageState(LS.range, "90d");
  const [subView, setSubView] = useLocalStorageState(LS.subView, "monthly"); // all | monthly | annual
  const [metric, setMetric] = useLocalStorageState(LS.metric, "revenue"); // revenue | counts
  const [selectedBatch, setSelectedBatch] = useLocalStorageState(LS.batch, "FEB-03-PM");

  // UI-only mock data shaped for future Zoho CRM sync
  const data = useMemo(() => {
    const monthlyActive = 86;
    const annualActive = 19;

    const monthlyMRR = 129900;
    const annualARR = 228000;

    const totalMRR = monthlyMRR + annualARR / 12;
    const totalARR = monthlyMRR * 12 + annualARR;

    const planMix = [
      { label: "Starter", monthlyCount: 34, annualCount: 6, monthlyMRR: 45900, annualARR: 54000 },
      { label: "Business", monthlyCount: 38, annualCount: 10, monthlyMRR: 62400, annualARR: 132000 },
      { label: "Enterprise", monthlyCount: 14, annualCount: 3, monthlyMRR: 21600, annualARR: 42000 },
    ];

    const health = {
      monthly: { new7d: 6, churn7d: 2 },
      annual: { renew30d: 3, new30d: 1 },
      all: { new7d: 7, risk14d: 7, churn7d: 2 },
    };

    const recentBatches = [
      { batch: "FEB-05-AM", status: "Draft", items: 112 },
      { batch: "FEB-03-PM", status: "Exported", items: 98 },
      { batch: "JAN-29-AM", status: "Sent", items: 141 },
    ];

    return {
      top: {
        activeDebitOrders: 1284,
        nextRun: "Fri 08:00",
        queued: 112,
        exceptions: 23,
        collectionsMTD: 482910,
      },
      monthlyActive,
      annualActive,
      monthlyMRR,
      annualARR,
      totalMRR,
      totalARR,
      planMix,
      health,
      recentBatches,
    };
  }, []);

  const scope = useMemo(() => {
    if (subView === "monthly") {
      return {
        label: "Monthly subscriptions",
        active: data.monthlyActive,
        mrr: data.monthlyMRR,
        arr: data.monthlyMRR * 12,
      };
    }
    if (subView === "annual") {
      return {
        label: "Annual subscriptions",
        active: data.annualActive,
        mrr: data.annualARR / 12,
        arr: data.annualARR,
      };
    }
    return {
      label: "All subscriptions",
      active: data.monthlyActive + data.annualActive,
      mrr: data.totalMRR,
      arr: data.totalARR,
    };
  }, [data, subView]);

  const controlChips = useMemo(() => {
    if (subView === "monthly") {
      return [
        { text: `New 7d: ${data.health.monthly.new7d}`, tone: "purple" },
        { text: `Churn 7d: ${data.health.monthly.churn7d}`, tone: "danger" },
      ];
    }
    if (subView === "annual") {
      return [
        { text: `Renewals 30d: ${data.health.annual.renew30d}`, tone: "purple" },
        { text: `New 30d: ${data.health.annual.new30d}`, tone: "neutral" },
      ];
    }
    return [
      { text: `New 7d: ${data.health.all.new7d}`, tone: "purple" },
      { text: `At risk 14d: ${data.health.all.risk14d}`, tone: "neutral" },
      { text: `Churn 7d: ${data.health.all.churn7d}`, tone: "danger" },
    ];
  }, [data, subView]);

  const breakdown = useMemo(() => {
    const rows = data.planMix.map((p) => {
      const count =
        subView === "monthly" ? p.monthlyCount : subView === "annual" ? p.annualCount : p.monthlyCount + p.annualCount;

      const mrr =
        subView === "monthly"
          ? p.monthlyMRR
          : subView === "annual"
          ? p.annualARR / 12
          : p.monthlyMRR + p.annualARR / 12;

      return { label: p.label, count, mrr };
    });

    const denom = rows.reduce((a, r) => a + (metric === "revenue" ? r.mrr : r.count), 0) || 1;

    return rows
      .map((r) => {
        const basis = metric === "revenue" ? r.mrr : r.count;
        return {
          label: r.label,
          pct: (basis / denom) * 100,
          value: metric === "revenue" ? formatZAR(r.mrr) : String(r.count),
        };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [data, subView, metric]);

  const filteredBatches = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return data.recentBatches;
    return data.recentBatches.filter((b) => b.batch.toLowerCase().includes(q) || b.status.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <div className="tt-page">
      <style>{css}</style>
      <div className="tt-bg" aria-hidden="true" />

      <div className="tt-container">
        {/* Top bar */}
        <Card className="tt-topbar" accent>
          <div className="tt-topbarLeft">
            <div className="tt-brandTiny">TabbyTech</div>
            <div className="tt-title">Dashboard</div>
          </div>

          <div className="tt-topbarRight">
            <div className="tt-search">
              <span className="tt-searchIcon">
                <IconSearch />
              </span>
              <input
                className="tt-searchInput"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients, batches, reports"
              />
            </div>

            <button className="tt-iconBtn" title="Notifications" type="button">
              <IconBell />
            </button>

            <div className="tt-user">
              <div className="tt-avatar">T</div>
              <div className="tt-userText">
                <div className="tt-userName">TabbyTech</div>
                <div className="tt-userRole">Ops</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Shell */}
        <div className="tt-shell">
          {/* Hero stats */}
          <div className="tt-grid tt-grid--hero">
            <Card className="tt-stat" accent>
              <div className="tt-statLabel">Active Debit Orders</div>
              <div className="tt-statValue">{data.top.activeDebitOrders.toLocaleString("en-ZA")}</div>
              <div className="tt-statSub">Currently running</div>
            </Card>

            <Card className="tt-stat" accent>
              <div className="tt-statLabel">Next Run</div>
              <div className="tt-statValue">{data.top.nextRun}</div>
              <div className="tt-statSub">{data.top.queued} items queued</div>
            </Card>

            <Card className="tt-stat" accent>
              <div className="tt-statLabel">Exceptions</div>
              <div className="tt-statValue">{data.top.exceptions}</div>
              <div className="tt-statSub">Needs attention</div>
            </Card>

            <Card className="tt-stat" accent>
              <div className="tt-statLabel">Collections (MTD)</div>
              <div className="tt-statValue">{formatZAR(data.top.collectionsMTD)}</div>
              <div className="tt-statSub">Scheduled total</div>
            </Card>
          </div>

          {/* Monthly and annual summary cards */}
          <div className="tt-grid tt-grid--subsummary">
            <Card className="tt-subCard" accent>
              <div className="tt-subHeader">
                <div>
                  <div className="tt-subTitle">Monthly Subscriptions</div>
                  <div className="tt-subValue">
                    {data.monthlyActive} active <span className="tt-dot">·</span> {formatZAR(data.monthlyMRR)} MRR
                  </div>
                  <div className="tt-chipRow">
                    <Pill>New 7d: {data.health.monthly.new7d}</Pill>
                    <Pill tone="danger">Churn 7d: {data.health.monthly.churn7d}</Pill>
                  </div>
                </div>
                <Button variant="primary" onClick={() => setSubView("monthly")}>
                  Open
                </Button>
              </div>
            </Card>

            <Card className="tt-subCard" accent>
              <div className="tt-subHeader">
                <div>
                  <div className="tt-subTitle">Annual Subscriptions</div>
                  <div className="tt-subValue">
                    {data.annualActive} active <span className="tt-dot">·</span> {formatZAR(data.annualARR)} ARR
                  </div>
                  <div className="tt-chipRow">
                    <Pill>Renewals 30d: {data.health.annual.renew30d}</Pill>
                    <Pill tone="neutral">New 30d: {data.health.annual.new30d}</Pill>
                  </div>
                </div>
                <Button variant="primary" onClick={() => setSubView("annual")}>
                  Open
                </Button>
              </div>
            </Card>
          </div>

          {/* Bottom grid */}
          <div className="tt-grid tt-grid--bottom">
            {/* Left column */}
            <Card className="tt-panel" accent>
              <div className="tt-panelHeader">
                <div className="tt-panelTitle">Today’s Workflow</div>
                <Select
                  ariaLabel="Workflow selector"
                  value={"subscription-tracking"}
                  onChange={() => {}}
                  options={[
                    { value: "review", label: "Review exceptions" },
                    { value: "batch", label: "Prepare next batch" },
                    { value: "export", label: "Export bank files" },
                    { value: "subscription-tracking", label: "Subscription tracking" },
                  ]}
                  className="tt-panelSelect"
                />
              </div>

              <div className="tt-workList">
                <div className="tt-workItem">
                  <div>
                    <div className="tt-workTitle">Review exceptions</div>
                    <div className="tt-workSub">Prioritise failed deductions and follow ups</div>
                  </div>
                  <Button variant="dark">Open</Button>
                </div>

                <div className="tt-workItem">
                  <div>
                    <div className="tt-workTitle">Prepare next batch</div>
                    <div className="tt-workSub">Validate and queue debit orders for the next run</div>
                  </div>
                  <Button variant="primary">Start</Button>
                </div>

                <div className="tt-workItem">
                  <div>
                    <div className="tt-workTitle">Export bank files</div>
                    <div className="tt-workSub">Generate bank ready exports from approved batches</div>
                  </div>
                  <Button variant="dark">Export</Button>
                </div>
              </div>

              {/* Subscription tracking */}
              <div className="tt-subTrack">
                <div className="tt-subTrackTitle">Subscription tracking</div>
                <div className="tt-subTrackDesc">
                  This is a UI-only layer for now. Later we will sync this from Zoho CRM or Zoho Subscriptions and lock down edits to reduce risk.
                </div>

                {/* Clean single-line control bar (no side-floating anything) */}
                <div className="tt-controlsLine">
                  <div className="tt-control">
                    <div className="tt-controlLabel">View</div>
                    <Select
                      ariaLabel="Subscription view"
                      value={subView}
                      onChange={setSubView}
                      options={[
                        { value: "all", label: "All" },
                        { value: "monthly", label: "Monthly only" },
                        { value: "annual", label: "Annual only" },
                      ]}
                    />
                  </div>

                  <div className="tt-control">
                    <div className="tt-controlLabel">Range</div>
                    <Select
                      ariaLabel="Range"
                      value={range}
                      onChange={setRange}
                      options={[
                        { value: "7d", label: "Last 7 days" },
                        { value: "30d", label: "Last 30 days" },
                        { value: "90d", label: "Last 90 days" },
                        { value: "12m", label: "Last 12 months" },
                      ]}
                    />
                  </div>

                  <div className="tt-control">
                    <div className="tt-controlLabel">Breakdown</div>
                    <Select
                      ariaLabel="Breakdown metric"
                      value={metric}
                      onChange={setMetric}
                      options={[
                        { value: "revenue", label: "By revenue" },
                        { value: "counts", label: "By counts" },
                      ]}
                    />
                  </div>

                  {/* Right side stays inside the box, aligned, tidy */}
                  <div className="tt-controlRight">
                    <div className="tt-chipRail">
                      {controlChips.map((c) => (
                        <Pill key={c.text} tone={c.tone}>
                          {c.text}
                        </Pill>
                      ))}
                    </div>

                    <Button
                      variant="dark"
                      className="tt-paystackBtn"
                      onClick={() => alert("UI-only: This will open Settings > Paystack to paste API keys later.")}
                      title="Planned Settings integration for Paystack keys"
                    >
                      Paystack settings
                    </Button>
                  </div>
                </div>

                <div className="tt-metrics">
                  <div className="tt-mini">
                    <div className="tt-miniLabel">Monthly MRR</div>
                    <div className="tt-miniValue">{formatZAR(scope.mrr)}</div>
                    <div className="tt-miniSub">Active: {scope.active} · Range: {range}</div>
                  </div>
                  <div className="tt-mini">
                    <div className="tt-miniLabel">Annual ARR</div>
                    <div className="tt-miniValue">{formatZAR(scope.arr)}</div>
                    <div className="tt-miniSub">View: {subView} · UI-only</div>
                  </div>
                </div>

                <div className="tt-breakdown" data-accent="true">
                  <div className="tt-breakHeader">
                    <div>
                      <div className="tt-breakTitle">Breakdown</div>
                      <div className="tt-breakSub">Plan mix overview</div>
                    </div>
                    <div className="tt-breakBadges">
                      <Pill>{scope.label}</Pill>
                      <Pill tone="neutral">{metric === "revenue" ? "Revenue share" : "Count share"}</Pill>
                    </div>
                  </div>

                  <div className="tt-breakRows">
                    {breakdown.map((r) => (
                      <div key={r.label} className="tt-breakRow">
                        <div className="tt-breakRowTop">
                          <div className="tt-breakRowLabel">{r.label}</div>
                          <div className="tt-breakRowRight">
                            <Pill>{Math.round(r.pct)}%</Pill>
                            <div className="tt-breakRowValue">{r.value}</div>
                          </div>
                        </div>
                        <Progress value={r.pct} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="tt-note">
                  <div className="tt-noteTitle">Next wiring later</div>
                  <div className="tt-noteText">
                    We will fetch subscription plan and billing cadence from the Zoho CRM custom module. Paystack keys will be managed in Settings and applied to webhook verification.
                  </div>
                </div>
              </div>
            </Card>

            {/* Right column */}
            <Card className="tt-panel" accent>
              <div className="tt-panelHeader">
                <div className="tt-panelTitle">Recent Batches</div>
                <Select
                  ariaLabel="Batch selector"
                  value={selectedBatch}
                  onChange={setSelectedBatch}
                  options={data.recentBatches.map((b) => ({ value: b.batch, label: b.batch }))}
                  className="tt-panelSelect"
                />
              </div>

              <div className="tt-tableHead">
                <div>Batch</div>
                <div>Status</div>
                <div style={{ textAlign: "right" }}>Items</div>
              </div>

              <div className="tt-batchList">
                {filteredBatches.map((b) => (
                  <button
                    key={b.batch}
                    className={cx("tt-batchRow", selectedBatch === b.batch && "tt-batchRow--active")}
                    onClick={() => setSelectedBatch(b.batch)}
                    type="button"
                  >
                    <div className="tt-batchName">{b.batch}</div>
                    <div className="tt-batchStatus">{b.status}</div>
                    <div className="tt-batchItems">{b.items}</div>
                  </button>
                ))}
              </div>

              <div className="tt-batchFooter">
                <div>
                  <div className="tt-batchFooterTitle">Selected: {selectedBatch}</div>
                  <div className="tt-batchFooterSub">UI-only actions. Will wire to batch workflows later.</div>
                </div>
                <div className="tt-batchFooterBtns">
                  <Button variant="dark">View</Button>
                  <Button variant="primary">Export</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

const css = `
  :root{
    --bg:#05060a;
    --stroke: rgba(255,255,255,0.10);
    --stroke2: rgba(255,255,255,0.08);
    --text: rgba(255,255,255,0.92);
    --muted: rgba(255,255,255,0.62);
    --muted2: rgba(255,255,255,0.48);

    --purple: #a855f7;
    --purple2:#8b5cf6;
    --purpleGlow: rgba(168,85,247,0.24);

    --shadow: 0 22px 80px rgba(0,0,0,0.58);
    --inner: inset 0 0 0 1px rgba(0,0,0,0.25);

    --radius: 20px;
    --radius2: 16px;
  }

  *{ box-sizing:border-box; }

  .tt-page{
    min-height:100vh;
    background: var(--bg);
    color: var(--text);
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Helvetica Neue", "Noto Sans", "Liberation Sans", sans-serif;
  }

  .tt-bg{
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0.9;
    background:
      radial-gradient(1100px 620px at 16% 12%, rgba(168,85,247,0.30), transparent 60%),
      radial-gradient(980px 560px at 76% 16%, rgba(168,85,247,0.16), transparent 62%),
      radial-gradient(900px 700px at 50% 110%, rgba(255,255,255,0.05), transparent 55%);
  }

  .tt-container{
    position: relative;
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 14px 20px 26px;
  }

  /* Premium card base plus sidebar-like glow when accent=true */
  .tt-card{
    border: 1px solid var(--stroke);
    border-radius: var(--radius);
    background:
      radial-gradient(900px 520px at 10% -10%, rgba(255,255,255,0.06), transparent 55%),
      rgba(255,255,255,0.06);
    backdrop-filter: blur(18px);
    box-shadow: var(--shadow);
  }
  .tt-card--accent{
    background:
      radial-gradient(1100px 640px at 0% 0%, rgba(168,85,247,0.26), transparent 55%),
      radial-gradient(900px 520px at 105% 12%, rgba(168,85,247,0.10), transparent 58%),
      radial-gradient(900px 520px at 20% 115%, rgba(255,255,255,0.05), transparent 62%),
      rgba(255,255,255,0.06);
  }

  .tt-topbar{
    padding: 14px 18px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap: 16px;
  }

  .tt-topbarLeft{ display:flex; flex-direction:column; gap:2px; }
  .tt-brandTiny{ font-size:12px; font-weight:800; color: var(--muted); }
  .tt-title{ font-size:20px; font-weight:950; letter-spacing:-0.02em; }

  .tt-topbarRight{
    display:flex;
    align-items:center;
    justify-content:flex-end;
    gap: 10px;
    flex: 1;
  }

  .tt-search{
    position: relative;
    width: min(560px, 100%);
    height: 40px;
    border-radius: 14px;
    border: 1px solid var(--stroke2);
    background: rgba(0,0,0,0.28);
    box-shadow: var(--inner);
    display:flex;
    align-items:center;
    overflow:hidden;
  }
  .tt-searchIcon{
    width: 40px;
    display:flex;
    align-items:center;
    justify-content:center;
    color: rgba(255,255,255,0.50);
  }
  .tt-searchInput{
    width: 100%;
    height: 100%;
    border: 0;
    outline: none;
    background: transparent;
    color: rgba(255,255,255,0.90);
    font-size: 13px;
    padding-right: 12px;
  }
  .tt-searchInput::placeholder{ color: rgba(255,255,255,0.40); }

  .tt-iconBtn{
    height: 40px;
    width: 40px;
    border-radius: 14px;
    border: 1px solid var(--stroke2);
    background: rgba(0,0,0,0.28);
    box-shadow: var(--inner);
    color: rgba(255,255,255,0.78);
    display:flex;
    align-items:center;
    justify-content:center;
    cursor:pointer;
  }
  .tt-iconBtn:hover{ background: rgba(0,0,0,0.40); }

  .tt-user{
    display:flex;
    align-items:center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 16px;
    border: 1px solid var(--stroke2);
    background: rgba(0,0,0,0.22);
  }
  .tt-avatar{
    height: 34px;
    width: 34px;
    border-radius: 12px;
    border: 1px solid var(--stroke2);
    background: rgba(255,255,255,0.06);
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight: 950;
    letter-spacing: -0.02em;
  }
  .tt-userName{ font-weight: 950; font-size: 13px; line-height: 1.1; }
  .tt-userRole{ font-size: 11px; color: var(--muted2); margin-top: 2px; }

  .tt-shell{
    margin-top: 14px;
    padding: 16px;
    border-radius: 26px;
    border: 1px solid var(--stroke);
    background: rgba(255,255,255,0.03);
  }

  .tt-grid{ display:grid; gap: 12px; }
  .tt-grid--hero{ grid-template-columns: 2fr 2fr 1fr 1fr; }
  .tt-grid--subsummary{ grid-template-columns: 1fr 1fr; margin-top: 12px; }
  .tt-grid--bottom{ grid-template-columns: 1.2fr 0.8fr; margin-top: 12px; align-items: start; }

  .tt-stat{ padding: 16px; }
  .tt-statLabel{ font-size: 13px; font-weight: 850; color: var(--muted); }
  .tt-statValue{ margin-top: 10px; font-size: 32px; font-weight: 980; letter-spacing: -0.03em; }
  .tt-statSub{ margin-top: 4px; font-size: 13px; color: var(--muted2); }

  .tt-subCard{ padding: 16px; }
  .tt-subHeader{ display:flex; align-items:flex-start; justify-content:space-between; gap: 12px; }
  .tt-subTitle{ font-size: 13px; font-weight: 850; color: var(--muted); }
  .tt-subValue{ margin-top: 6px; font-size: 24px; font-weight: 980; letter-spacing: -0.02em; }
  .tt-dot{ color: rgba(255,255,255,0.40); padding: 0 6px; }
  .tt-chipRow{ margin-top: 12px; display:flex; gap: 8px; flex-wrap: wrap; }

  .tt-panel{ padding: 16px; }
  .tt-panelHeader{ display:flex; align-items:center; justify-content:space-between; gap: 12px; }
  .tt-panelTitle{ font-size: 16px; font-weight: 980; letter-spacing: -0.02em; }
  .tt-panelSelect{ width: 220px; }

  .tt-workList{ margin-top: 12px; display:flex; flex-direction:column; gap: 10px; }
  .tt-workItem{
    border-radius: var(--radius2);
    border: 1px solid var(--stroke2);
    background: rgba(0,0,0,0.22);
    box-shadow: var(--inner);
    padding: 14px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap: 12px;
  }
  .tt-workTitle{ font-weight: 980; font-size: 14px; }
  .tt-workSub{ margin-top: 4px; font-size: 12px; color: var(--muted2); }

  .tt-subTrack{ margin-top: 16px; }
  .tt-subTrackTitle{ font-size: 14px; font-weight: 980; }
  .tt-subTrackDesc{ margin-top: 6px; font-size: 13px; color: var(--muted2); }

  /* Subscription tracking tidy control bar */
  .tt-controlsLine{
    margin-top: 14px;
    border-radius: var(--radius2);
    border: 1px solid rgba(255,255,255,0.10);
    background:
      radial-gradient(900px 520px at 0% 0%, rgba(168,85,247,0.18), transparent 55%),
      rgba(0,0,0,0.22);
    box-shadow: var(--inner);
    padding: 14px;
    display: grid;
    grid-template-columns: 220px 220px 220px 1fr;
    gap: 12px;
    align-items: end;
  }

  .tt-controlLabel{
    font-size: 11px;
    font-weight: 850;
    color: var(--muted2);
    margin-bottom: 6px;
  }

  .tt-controlRight{
    display:flex;
    align-items:flex-end;
    justify-content:flex-end;
    gap: 10px;
    min-width: 0;
  }

  .tt-chipRail{
    display:flex;
    align-items:center;
    justify-content:flex-end;
    gap: 8px;
    flex-wrap: nowrap;
    min-width: 0;
  }

  .tt-paystackBtn{
    white-space: nowrap;
  }

  .tt-metrics{
    margin-top: 12px;
    display:grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .tt-mini{
    border-radius: var(--radius2);
    border: 1px solid var(--stroke2);
    background:
      radial-gradient(900px 520px at 0% 0%, rgba(168,85,247,0.10), transparent 58%),
      rgba(0,0,0,0.20);
    box-shadow: var(--inner);
    padding: 14px;
  }
  .tt-miniLabel{ font-size: 11px; font-weight: 850; color: var(--muted2); }
  .tt-miniValue{ margin-top: 10px; font-size: 22px; font-weight: 980; letter-spacing: -0.02em; }
  .tt-miniSub{ margin-top: 6px; font-size: 12px; color: var(--muted2); }

  .tt-breakdown{
    margin-top: 12px;
    border-radius: var(--radius2);
    border: 1px solid var(--stroke2);
    background:
      radial-gradient(1100px 640px at 0% 0%, rgba(168,85,247,0.16), transparent 55%),
      rgba(0,0,0,0.20);
    box-shadow: var(--inner);
    padding: 14px;
  }
  .tt-breakHeader{ display:flex; align-items:flex-start; justify-content:space-between; gap: 12px; }
  .tt-breakTitle{ font-size: 14px; font-weight: 980; }
  .tt-breakSub{ margin-top: 4px; font-size: 12px; color: var(--muted2); }
  .tt-breakBadges{ display:flex; gap: 8px; flex-wrap: wrap; justify-content:flex-end; }
  .tt-breakRows{ margin-top: 12px; display:flex; flex-direction:column; gap: 12px; }
  .tt-breakRowTop{ display:flex; align-items:center; justify-content:space-between; gap: 10px; }
  .tt-breakRowLabel{ font-size: 13px; font-weight: 950; color: rgba(255,255,255,0.86); }
  .tt-breakRowRight{ display:flex; align-items:center; gap: 10px; }
  .tt-breakRowValue{ font-weight: 980; font-size: 13px; }

  .tt-progress{
    margin-top: 10px;
    height: 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.10);
    overflow:hidden;
  }
  .tt-progressBar{
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(168,85,247,0.22), rgba(168,85,247,0.95));
    box-shadow: 0 0 26px rgba(168,85,247,0.35);
  }

  .tt-note{
    margin-top: 12px;
    border-radius: var(--radius2);
    border: 1px solid var(--stroke2);
    background: rgba(255,255,255,0.05);
    padding: 12px 14px;
  }
  .tt-noteTitle{ font-weight: 950; font-size: 13px; }
  .tt-noteText{ margin-top: 6px; font-size: 13px; color: var(--muted2); }

  .tt-tableHead{
    margin-top: 12px;
    display:grid;
    grid-template-columns: 1fr 1fr 90px;
    gap: 10px;
    padding: 0 6px;
    font-size: 12px;
    font-weight: 850;
    color: var(--muted2);
  }

  .tt-batchList{ margin-top: 10px; display:flex; flex-direction:column; gap: 10px; }
  .tt-batchRow{
    width: 100%;
    border-radius: var(--radius2);
    border: 1px solid var(--stroke2);
    background:
      radial-gradient(900px 520px at 0% 0%, rgba(168,85,247,0.10), transparent 62%),
      rgba(0,0,0,0.20);
    box-shadow: var(--inner);
    padding: 14px;
    display:grid;
    grid-template-columns: 1fr 1fr 90px;
    gap: 10px;
    align-items:center;
    cursor:pointer;
    text-align:left;
    color: inherit;
  }
  .tt-batchRow:hover{ background: rgba(0,0,0,0.34); }
  .tt-batchRow--active{ outline: 2px solid rgba(168,85,247,0.22); }

  .tt-batchName{ font-weight: 980; }
  .tt-batchStatus{
    justify-self:start;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(168,85,247,0.22);
    background: rgba(168,85,247,0.10);
    color: rgba(220,190,255,0.92);
    font-size: 12px;
    font-weight: 980;
    width: fit-content;
  }
  .tt-batchItems{ justify-self:end; font-weight: 980; }

  .tt-batchFooter{
    margin-top: 12px;
    border-radius: var(--radius2);
    border: 1px solid var(--stroke2);
    background: rgba(255,255,255,0.05);
    padding: 12px 14px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap: 12px;
  }
  .tt-batchFooterTitle{ font-weight: 980; }
  .tt-batchFooterSub{ margin-top: 4px; font-size: 12px; color: var(--muted2); }
  .tt-batchFooterBtns{ display:flex; gap: 10px; }

  .tt-btn{
    height: 40px;
    padding: 0 14px;
    border-radius: 14px;
    border: 1px solid var(--stroke2);
    font-weight: 980;
    font-size: 13px;
    cursor:pointer;
    transition: transform 120ms ease, background 120ms ease, border 120ms ease;
  }
  .tt-btn:active{ transform: scale(0.99); }
  .tt-btn--primary{
    border-color: rgba(168,85,247,0.30);
    background: linear-gradient(180deg, rgba(168,85,247,0.95), rgba(139,92,246,0.88));
    color: white;
    box-shadow: 0 14px 42px rgba(168,85,247,0.28);
  }
  .tt-btn--primary:hover{
    background: linear-gradient(180deg, rgba(168,85,247,1), rgba(139,92,246,0.95));
  }
  .tt-btn--dark{
    background: rgba(0,0,0,0.30);
    color: rgba(255,255,255,0.86);
    box-shadow: var(--inner);
  }
  .tt-btn--dark:hover{ background: rgba(0,0,0,0.42); }

  .tt-pill{
    display:inline-flex;
    align-items:center;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(168,85,247,0.22);
    background: rgba(168,85,247,0.10);
    color: rgba(220,190,255,0.92);
    font-size: 12px;
    font-weight: 950;
    white-space: nowrap;
  }
  .tt-pill--neutral{
    border-color: rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.75);
  }
  .tt-pill--danger{
    border-color: rgba(244,63,94,0.22);
    background: rgba(244,63,94,0.10);
    color: rgba(253,164,175,0.95);
  }

  /* Premium dropdown: black surface + purple accents */
  .tt-selectWrap{ position: relative; }
  .tt-select{
    width: 100%;
    height: 40px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.58);
    color: rgba(220,190,255,0.92);
    font-weight: 950;
    font-size: 13px;
    padding: 0 36px 0 12px;
    outline: none;
    box-shadow: var(--inner);
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
  }
  .tt-select:focus{
    border-color: rgba(168,85,247,0.35);
    box-shadow: var(--inner), 0 0 0 3px rgba(168,85,247,0.16);
  }
  .tt-select option{
    background: #000;
    color: rgba(220,190,255,0.92);
    font-weight: 850;
  }
  .tt-selectChevron{
    position:absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(220,190,255,0.82);
    pointer-events:none;
  }

  /* Responsiveness */
  @media (max-width: 1200px){
    .tt-grid--hero{ grid-template-columns: 1fr 1fr; }
    .tt-grid--subsummary{ grid-template-columns: 1fr; }
    .tt-grid--bottom{ grid-template-columns: 1fr; }
    .tt-panelSelect{ width: 100%; }

    .tt-controlsLine{
      grid-template-columns: 1fr;
      align-items: stretch;
    }
    .tt-controlRight{
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .tt-chipRail{
      flex-wrap: wrap;
      justify-content: flex-start;
    }
  }
`;
