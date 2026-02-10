// Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";

/*
  TabbyTech Dashboard (UI-only)
  Fixes requested:
  1) Remove the duplicate inner header bar (Dashboard.jsx should NOT render a page header)
     Your AppShell already provides the premium top header.
  2) Match the premium purple glass styling from the sidebar across the dashboard.
  3) Subscription tracking: keep filters perfectly aligned, and move anything that was behind/overlapping
     (chips, Paystack button) underneath the filters inside the same container.
  4) Persist key UI state to localStorage.
*/

const LS = {
  search: "tabbytech.dashboard.search", // kept for in-page filtering (batches) only
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

function Card({ children, className = "" }) {
  return <div className={cx("ttd-card", className)}>{children}</div>;
}

function Button({ children, variant = "primary", onClick, className = "", title, type = "button" }) {
  return (
    <button type={type} className={cx("ttd-btn", `ttd-btn--${variant}`, className)} onClick={onClick} title={title}>
      {children}
    </button>
  );
}

function Pill({ children, tone = "purple" }) {
  return <span className={cx("ttd-pill", `ttd-pill--${tone}`)}>{children}</span>;
}

function Select({ value, onChange, options, ariaLabel, className = "" }) {
  return (
    <div className={cx("ttd-selectWrap", className)}>
      <select
        className="ttd-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="ttd-selectChevron" aria-hidden="true">
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
    <div className="ttd-progress">
      <div className="ttd-progressBar" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Dashboard() {
  // Note: AppShell header search is separate. This search is for local filtering inside dashboard widgets only.
  const [search, setSearch] = useLocalStorageState(LS.search, "");
  const [range, setRange] = useLocalStorageState(LS.range, "90d");
  const [subView, setSubView] = useLocalStorageState(LS.subView, "monthly"); // all | monthly | annual
  const [metric, setMetric] = useLocalStorageState(LS.metric, "revenue"); // revenue | counts
  const [selectedBatch, setSelectedBatch] = useLocalStorageState(LS.batch, "FEB-03-PM");

  const data = useMemo(() => {
    // UI-only mock data, shaped to swap later with Zoho CRM / Zoho Subscriptions
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
    return data.recentBatches.filter(
      (b) => b.batch.toLowerCase().includes(q) || b.status.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <div className="ttd-page">
      <style>{css}</style>

      {/* Dashboard content ONLY. AppShell already renders the premium top header. */}
      <div className="ttd-wrap">
        {/* Top stat grid */}
        <div className="ttd-grid ttd-grid--hero">
          <Card className="ttd-stat ttd-accent">
            <div className="ttd-statLabel">Active Debit Orders</div>
            <div className="ttd-statValue">{data.top.activeDebitOrders.toLocaleString("en-ZA")}</div>
            <div className="ttd-statSub">Currently running</div>
          </Card>

          <Card className="ttd-stat ttd-accent">
            <div className="ttd-statLabel">Next Run</div>
            <div className="ttd-statValue">{data.top.nextRun}</div>
            <div className="ttd-statSub">{data.top.queued} items queued</div>
          </Card>

          <Card className="ttd-stat ttd-accent">
            <div className="ttd-statLabel">Exceptions</div>
            <div className="ttd-statValue">{data.top.exceptions}</div>
            <div className="ttd-statSub">Needs attention</div>
          </Card>

          <Card className="ttd-stat ttd-accent">
            <div className="ttd-statLabel">Collections (MTD)</div>
            <div className="ttd-statValue">{formatZAR(data.top.collectionsMTD)}</div>
            <div className="ttd-statSub">Scheduled total</div>
          </Card>
        </div>

        {/* Monthly + annual cards */}
        <div className="ttd-grid ttd-grid--subsummary">
          <Card className="ttd-subCard ttd-accent">
            <div className="ttd-subTop">
              <div>
                <div className="ttd-subTitle">Monthly Subscriptions</div>
                <div className="ttd-subValue">
                  {data.monthlyActive} active <span className="ttd-dot">·</span> {formatZAR(data.monthlyMRR)} MRR
                </div>
                <div className="ttd-chipRow">
                  <Pill tone="purple">New 7d: {data.health.monthly.new7d}</Pill>
                  <Pill tone="danger">Churn 7d: {data.health.monthly.churn7d}</Pill>
                </div>
              </div>
              <Button variant="primary" onClick={() => setSubView("monthly")}>
                Open
              </Button>
            </div>
          </Card>

          <Card className="ttd-subCard ttd-accent">
            <div className="ttd-subTop">
              <div>
                <div className="ttd-subTitle">Annual Subscriptions</div>
                <div className="ttd-subValue">
                  {data.annualActive} active <span className="ttd-dot">·</span> {formatZAR(data.annualARR)} ARR
                </div>
                <div className="ttd-chipRow">
                  <Pill tone="purple">Renewals 30d: {data.health.annual.renew30d}</Pill>
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
        <div className="ttd-grid ttd-grid--bottom">
          {/* Left column */}
          <Card className="ttd-panel ttd-accent">
            <div className="ttd-panelHeader">
              <div className="ttd-panelTitle">Today’s Workflow</div>
              <Select
                ariaLabel="Workflow selector"
                value="subscription-tracking"
                onChange={() => {}}
                options={[
                  { value: "review", label: "Review exceptions" },
                  { value: "batch", label: "Prepare next batch" },
                  { value: "export", label: "Export bank files" },
                  { value: "subscription-tracking", label: "Subscription tracking" },
                ]}
                className="ttd-panelSelect"
              />
            </div>

            <div className="ttd-workList">
              <div className="ttd-workItem">
                <div>
                  <div className="ttd-workTitle">Review exceptions</div>
                  <div className="ttd-workSub">Prioritise failed deductions and follow ups</div>
                </div>
                <Button variant="dark">Open</Button>
              </div>

              <div className="ttd-workItem">
                <div>
                  <div className="ttd-workTitle">Prepare next batch</div>
                  <div className="ttd-workSub">Validate and queue debit orders for the next run</div>
                </div>
                <Button variant="primary">Start</Button>
              </div>

              <div className="ttd-workItem">
                <div>
                  <div className="ttd-workTitle">Export bank files</div>
                  <div className="ttd-workSub">Generate bank ready exports from approved batches</div>
                </div>
                <Button variant="dark">Export</Button>
              </div>
            </div>

            {/* Subscription tracking */}
            <div className="ttd-subTrack">
              <div className="ttd-subTrackTitle">Subscription tracking</div>
              <div className="ttd-subTrackDesc">
                This is a UI-only layer for now. Later we will sync this from Zoho CRM or Zoho Subscriptions and lock down
                edits to reduce risk.
              </div>

              {/* Box with premium styling */}
              <div className="ttd-subBox">
                {/* Row 1: Filters only (clean) */}
                <div className="ttd-filterRow">
                  <div className="ttd-control">
                    <div className="ttd-controlLabel">View</div>
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

                  <div className="ttd-control">
                    <div className="ttd-controlLabel">Range</div>
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

                  <div className="ttd-control">
                    <div className="ttd-controlLabel">Breakdown</div>
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
                </div>

                {/* Row 2: Anything that used to sit behind the filters goes underneath */}
                <div className="ttd-underRow">
                  <div className="ttd-chipRail">
                    {controlChips.map((c) => (
                      <Pill key={c.text} tone={c.tone}>
                        {c.text}
                      </Pill>
                    ))}
                  </div>

                  <Button
                    variant="dark"
                    className="ttd-paystackBtn"
                    onClick={() => alert("UI-only: This will open Settings > Paystack to paste API keys later.")}
                    title="Planned Settings integration for Paystack keys"
                  >
                    Paystack settings
                  </Button>
                </div>
              </div>

              <div className="ttd-metrics">
                <div className="ttd-mini">
                  <div className="ttd-miniLabel">Monthly MRR</div>
                  <div className="ttd-miniValue">{formatZAR(scope.mrr)}</div>
                  <div className="ttd-miniSub">Active: {scope.active} · Range: {range}</div>
                </div>
                <div className="ttd-mini">
                  <div className="ttd-miniLabel">Annual ARR</div>
                  <div className="ttd-miniValue">{formatZAR(scope.arr)}</div>
                  <div className="ttd-miniSub">View: {subView} · UI-only</div>
                </div>
              </div>

              <div className="ttd-breakdown ttd-accentInner">
                <div className="ttd-breakHeader">
                  <div>
                    <div className="ttd-breakTitle">Breakdown</div>
                    <div className="ttd-breakSub">Plan mix overview</div>
                  </div>
                  <div className="ttd-breakBadges">
                    <Pill tone="purple">{scope.label}</Pill>
                    <Pill tone="neutral">{metric === "revenue" ? "Revenue share" : "Count share"}</Pill>
                  </div>
                </div>

                <div className="ttd-breakRows">
                  {breakdown.map((r) => (
                    <div key={r.label} className="ttd-breakRow">
                      <div className="ttd-breakRowTop">
                        <div className="ttd-breakRowLabel">{r.label}</div>
                        <div className="ttd-breakRowRight">
                          <Pill tone="purple">{Math.round(r.pct)}%</Pill>
                          <div className="ttd-breakRowValue">{r.value}</div>
                        </div>
                      </div>
                      <Progress value={r.pct} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="ttd-note">
                <div className="ttd-noteTitle">Next wiring later</div>
                <div className="ttd-noteText">
                  We will fetch subscription plan and billing cadence from the Zoho CRM custom module. Paystack keys will be
                  managed in Settings and applied to webhook verification.
                </div>
              </div>
            </div>
          </Card>

          {/* Right column */}
          <Card className="ttd-panel ttd-accent">
            <div className="ttd-panelHeader">
              <div className="ttd-panelTitle">Recent Batches</div>
              <Select
                ariaLabel="Batch selector"
                value={selectedBatch}
                onChange={setSelectedBatch}
                options={data.recentBatches.map((b) => ({ value: b.batch, label: b.batch }))}
                className="ttd-panelSelect"
              />
            </div>

            <div className="ttd-tableHead">
              <div>Batch</div>
              <div>Status</div>
              <div style={{ textAlign: "right" }}>Items</div>
            </div>

            <div className="ttd-batchList">
              {filteredBatches.map((b) => (
                <button
                  key={b.batch}
                  className={cx("ttd-batchRow", selectedBatch === b.batch && "ttd-batchRow--active")}
                  onClick={() => setSelectedBatch(b.batch)}
                  type="button"
                >
                  <div className="ttd-batchName">{b.batch}</div>
                  <div className="ttd-batchStatus">{b.status}</div>
                  <div className="ttd-batchItems">{b.items}</div>
                </button>
              ))}
            </div>

            <div className="ttd-batchFooter">
              <div>
                <div className="ttd-batchFooterTitle">Selected: {selectedBatch}</div>
                <div className="ttd-batchFooterSub">UI-only actions. Will wire to batch workflows later.</div>

                <div className="ttd-localSearch">
                  <div className="ttd-localSearchLabel">Quick filter</div>
                  <input
                    className="ttd-localSearchInput"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Type to filter batches"
                  />
                </div>
              </div>

              <div className="ttd-batchFooterBtns">
                <Button variant="dark">View</Button>
                <Button variant="primary">Export</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const css = `
  :root{
    --bg: #060710;
    --stroke: rgba(255,255,255,0.10);
    --stroke2: rgba(255,255,255,0.08);
    --text: rgba(255,255,255,0.92);
    --muted: rgba(255,255,255,0.62);
    --muted2: rgba(255,255,255,0.48);

    --purple: #a855f7;
    --purple2:#8b5cf6;
    --purpleGlow: rgba(168,85,247,0.30);

    --shadow: 0 22px 80px rgba(0,0,0,0.58);
    --inner: inset 0 0 0 1px rgba(0,0,0,0.28);

    --r1: 20px;
    --r2: 16px;
  }

  *{ box-sizing:border-box; }

  .ttd-page{
    color: var(--text);
    width: 100%;
  }

  .ttd-wrap{
    width: 100%;
    padding: 14px 18px 24px;
  }

  /* Cards match sidebar vibe: deep glass + purple bloom */
  .ttd-card{
    border: 1px solid var(--stroke);
    border-radius: var(--r1);
    background: rgba(255,255,255,0.055);
    backdrop-filter: blur(18px);
    box-shadow: var(--shadow);
    position: relative;
    overflow: hidden;
  }

  .ttd-accent::before{
    content: "";
    position: absolute;
    inset: -2px;
    pointer-events: none;
    background:
      radial-gradient(900px 560px at 14% 10%, rgba(168,85,247,0.26), transparent 55%),
      radial-gradient(900px 560px at 92% 18%, rgba(168,85,247,0.12), transparent 60%),
      radial-gradient(900px 600px at 30% 115%, rgba(255,255,255,0.05), transparent 62%);
    opacity: 0.95;
  }
  .ttd-accent > *{ position: relative; z-index: 1; }

  .ttd-accentInner{
    background:
      radial-gradient(900px 560px at 14% 10%, rgba(168,85,247,0.18), transparent 55%),
      rgba(0,0,0,0.18);
  }

  .ttd-grid{ display:grid; gap: 12px; }
  .ttd-grid--hero{ grid-template-columns: 2fr 2fr 1fr 1fr; }
  .ttd-grid--subsummary{ grid-template-columns: 1fr 1fr; margin-top: 12px; }
  .ttd-grid--bottom{ grid-template-columns: 1.2fr 0.8fr; margin-top: 12px; align-items: start; }

  .ttd-stat{ padding: 16px; }
  .ttd-statLabel{ font-size: 13px; font-weight: 850; color: var(--muted); }
  .ttd-statValue{ margin-top: 10px; font-size: 32px; font-weight: 980; letter-spacing: -0.03em; }
  .ttd-statSub{ margin-top: 4px; font-size: 13px; color: var(--muted2); }

  .ttd-subCard{ padding: 16px; }
  .ttd-subTop{ display:flex; align-items:flex-start; justify-content:space-between; gap: 12px; }
  .ttd-subTitle{ font-size: 13px; font-weight: 850; color: var(--muted); }
  .ttd-subValue{ margin-top: 6px; font-size: 24px; font-weight: 980; letter-spacing: -0.02em; }
  .ttd-dot{ color: rgba(255,255,255,0.40); padding: 0 6px; }
  .ttd-chipRow{ margin-top: 12px; display:flex; gap: 8px; flex-wrap: wrap; }

  .ttd-panel{ padding: 16px; }
  .ttd-panelHeader{ display:flex; align-items:center; justify-content:space-between; gap: 12px; }
  .ttd-panelTitle{ font-size: 16px; font-weight: 980; letter-spacing: -0.02em; }
  .ttd-panelSelect{ width: 220px; }

  .ttd-workList{ margin-top: 12px; display:flex; flex-direction:column; gap: 10px; }
  .ttd-workItem{
    border-radius: var(--r2);
    border: 1px solid var(--stroke2);
    background: rgba(0,0,0,0.22);
    box-shadow: var(--inner);
    padding: 14px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap: 12px;
  }
  .ttd-workTitle{ font-weight: 980; font-size: 14px; }
  .ttd-workSub{ margin-top: 4px; font-size: 12px; color: var(--muted2); }

  .ttd-subTrack{ margin-top: 16px; }
  .ttd-subTrackTitle{ font-size: 14px; font-weight: 980; }
  .ttd-subTrackDesc{ margin-top: 6px; font-size: 13px; color: var(--muted2); }

  .ttd-subBox{
    margin-top: 14px;
    border-radius: var(--r2);
    border: 1px solid rgba(255,255,255,0.10);
    background:
      radial-gradient(900px 560px at 14% 10%, rgba(168,85,247,0.18), transparent 55%),
      rgba(0,0,0,0.22);
    box-shadow: var(--inner);
    padding: 14px;
  }

  /* Row 1: filters only */
  .ttd-filterRow{
    display:grid;
    grid-template-columns: 260px 260px 260px;
    gap: 12px;
    align-items:end;
  }

  /* Row 2: chips + Paystack below filters */
  .ttd-underRow{
    margin-top: 12px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap: 12px;
    border-top: 1px solid rgba(255,255,255,0.08);
    padding-top: 12px;
  }

  .ttd-chipRail{
    display:flex;
    align-items:center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ttd-paystackBtn{ white-space: nowrap; }

  .ttd-controlLabel{
    font-size: 11px;
    font-weight: 850;
    color: var(--muted2);
    margin-bottom: 6px;
  }

  .ttd-metrics{
    margin-top: 12px;
    display:grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .ttd-mini{
    border-radius: var(--r2);
    border: 1px solid var(--stroke2);
    background:
      radial-gradient(900px 560px at 14% 10%, rgba(168,85,247,0.12), transparent 55%),
      rgba(0,0,0,0.18);
    box-shadow: var(--inner);
    padding: 14px;
  }
  .ttd-miniLabel{ font-size: 11px; font-weight: 850; color: var(--muted2); }
  .ttd-miniValue{ margin-top: 10px; font-size: 22px; font-weight: 980; letter-spacing: -0.02em; }
  .ttd-miniSub{ margin-top: 6px; font-size: 12px; color: var(--muted2); }

  .ttd-breakdown{
    margin-top: 12px;
    border-radius: var(--r2);
    border: 1px solid var(--stroke2);
    box-shadow: var(--inner);
    padding: 14px;
  }
  .ttd-breakHeader{ display:flex; align-items:flex-start; justify-content:space-between; gap: 12px; }
  .ttd-breakTitle{ font-size: 14px; font-weight: 980; }
  .ttd-breakSub{ margin-top: 4px; font-size: 12px; color: var(--muted2); }
  .ttd-breakBadges{ display:flex; gap: 8px; flex-wrap: wrap; justify-content:flex-end; }
  .ttd-breakRows{ margin-top: 12px; display:flex; flex-direction:column; gap: 12px; }
  .ttd-breakRowTop{ display:flex; align-items:center; justify-content:space-between; gap: 10px; }
  .ttd-breakRowLabel{ font-size: 13px; font-weight: 950; color: rgba(255,255,255,0.86); }
  .ttd-breakRowRight{ display:flex; align-items:center; gap: 10px; }
  .ttd-breakRowValue{ font-weight: 980; font-size: 13px; }

  .ttd-progress{
    margin-top: 10px;
    height: 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.10);
    overflow:hidden;
  }
  .ttd-progressBar{
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(168,85,247,0.22), rgba(168,85,247,0.95));
    box-shadow: 0 0 26px rgba(168,85,247,0.35);
  }

  .ttd-note{
    margin-top: 12px;
    border-radius: var(--r2);
    border: 1px solid var(--stroke2);
    background: rgba(255,255,255,0.05);
    padding: 12px 14px;
  }
  .ttd-noteTitle{ font-weight: 950; font-size: 13px; }
  .ttd-noteText{ margin-top: 6px; font-size: 13px; color: var(--muted2); }

  .ttd-tableHead{
    margin-top: 12px;
    display:grid;
    grid-template-columns: 1fr 1fr 90px;
    gap: 10px;
    padding: 0 6px;
    font-size: 12px;
    font-weight: 850;
    color: var(--muted2);
  }

  .ttd-batchList{ margin-top: 10px; display:flex; flex-direction:column; gap: 10px; }
  .ttd-batchRow{
    width: 100%;
    border-radius: var(--r2);
    border: 1px solid var(--stroke2);
    background:
      radial-gradient(900px 560px at 14% 10%, rgba(168,85,247,0.12), transparent 60%),
      rgba(0,0,0,0.18);
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
  .ttd-batchRow:hover{ background: rgba(0,0,0,0.34); }
  .ttd-batchRow--active{ outline: 2px solid rgba(168,85,247,0.22); }

  .ttd-batchName{ font-weight: 980; }
  .ttd-batchStatus{
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
  .ttd-batchItems{ justify-self:end; font-weight: 980; }

  .ttd-batchFooter{
    margin-top: 12px;
    border-radius: var(--r2);
    border: 1px solid var(--stroke2);
    background: rgba(255,255,255,0.05);
    padding: 12px 14px;
    display:flex;
    align-items:flex-end;
    justify-content:space-between;
    gap: 12px;
  }
  .ttd-batchFooterTitle{ font-weight: 980; }
  .ttd-batchFooterSub{ margin-top: 4px; font-size: 12px; color: var(--muted2); }
  .ttd-batchFooterBtns{ display:flex; gap: 10px; }

  .ttd-localSearch{ margin-top: 10px; }
  .ttd-localSearchLabel{ font-size: 11px; font-weight: 850; color: var(--muted2); margin-bottom: 6px; }
  .ttd-localSearchInput{
    width: 260px;
    height: 38px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.45);
    color: rgba(255,255,255,0.86);
    outline: none;
    padding: 0 12px;
    box-shadow: var(--inner);
  }
  .ttd-localSearchInput:focus{
    border-color: rgba(168,85,247,0.35);
    box-shadow: var(--inner), 0 0 0 3px rgba(168,85,247,0.16);
  }
  .ttd-localSearchInput::placeholder{ color: rgba(255,255,255,0.38); }

  .ttd-btn{
    height: 40px;
    padding: 0 14px;
    border-radius: 14px;
    border: 1px solid var(--stroke2);
    font-weight: 980;
    font-size: 13px;
    cursor:pointer;
    transition: transform 120ms ease, background 120ms ease, border 120ms ease;
  }
  .ttd-btn:active{ transform: scale(0.99); }
  .ttd-btn--primary{
    border-color: rgba(168,85,247,0.30);
    background: linear-gradient(180deg, rgba(168,85,247,0.95), rgba(139,92,246,0.88));
    color: white;
    box-shadow: 0 14px 42px rgba(168,85,247,0.28);
  }
  .ttd-btn--primary:hover{
    background: linear-gradient(180deg, rgba(168,85,247,1), rgba(139,92,246,0.95));
  }
  .ttd-btn--dark{
    background: rgba(0,0,0,0.30);
    color: rgba(255,255,255,0.86);
    box-shadow: var(--inner);
  }
  .ttd-btn--dark:hover{ background: rgba(0,0,0,0.42); }

  .ttd-pill{
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
  .ttd-pill--neutral{
    border-color: rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.75);
  }
  .ttd-pill--danger{
    border-color: rgba(244,63,94,0.22);
    background: rgba(244,63,94,0.10);
    color: rgba(253,164,175,0.95);
  }

  /* Premium dropdown: black surface + purple accents */
  .ttd-selectWrap{ position: relative; }
  .ttd-select{
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
  .ttd-select:focus{
    border-color: rgba(168,85,247,0.35);
    box-shadow: var(--inner), 0 0 0 3px rgba(168,85,247,0.16);
  }
  .ttd-select option{
    background: #000;
    color: rgba(220,190,255,0.92);
    font-weight: 850;
  }
  .ttd-selectChevron{
    position:absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(220,190,255,0.82);
    pointer-events:none;
  }

  @media (max-width: 1280px){
    .ttd-grid--hero{ grid-template-columns: 1fr 1fr; }
    .ttd-grid--subsummary{ grid-template-columns: 1fr; }
    .ttd-grid--bottom{ grid-template-columns: 1fr; }
    .ttd-panelSelect{ width: 100%; }
    .ttd-filterRow{ grid-template-columns: 1fr; }
    .ttd-underRow{ flex-wrap: wrap; align-items: flex-start; }
    .ttd-localSearchInput{ width: 100%; }
  }
`;
