// Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * TabbyTech Dashboard
 * UI-only (backend paused), but designed to feel functional.
 * Includes:
 * - Subscription tracking (monthly vs annual, counts, MRR, ARR, breakdown)
 * - Key UI state persisted to localStorage (filters, selections)
 * - Premium dropdown styling (black surface + purple accents)
 */

const LS_KEYS = {
  search: "tabbytech.dashboard.search",
  range: "tabbytech.dashboard.range",
  subView: "tabbytech.dashboard.subView",
  segment: "tabbytech.dashboard.segment",
  selectedBatch: "tabbytech.dashboard.selectedBatch",
  selectedWorkflow: "tabbytech.dashboard.selectedWorkflow",
};

function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return initialValue;
      return JSON.parse(raw);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage failures (private mode, quota, etc)
    }
  }, [key, value]);

  return [value, setValue];
}

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function formatZAR(amount) {
  const n = Number(amount || 0);
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(n);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function ProgressBar({ value = 0, className = "" }) {
  const pct = clamp(value, 0, 100);
  return (
    <div className={cn("h-2 w-full rounded-full bg-white/10 overflow-hidden", className)}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          background:
            "linear-gradient(90deg, rgba(168,85,247,0.15), rgba(168,85,247,0.9))",
          boxShadow: "0 0 24px rgba(168,85,247,0.35)",
        }}
      />
    </div>
  );
}

function GlassCard({ className = "", children }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl",
        "shadow-[0_20px_60px_rgba(0,0,0,0.55)]",
        className
      )}
      style={{
        backgroundImage:
          "radial-gradient(1200px 600px at 30% -20%, rgba(168,85,247,0.22), transparent 55%), radial-gradient(900px 500px at 120% 10%, rgba(168,85,247,0.12), transparent 60%)",
      }}
    >
      {children}
    </div>
  );
}

function Pill({ children, tone = "neutral" }) {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold";
  const tones = {
    neutral: "border-white/10 bg-white/5 text-white/80",
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-200",
    danger: "border-rose-400/20 bg-rose-500/10 text-rose-200",
    ok: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  };
  return <span className={cn(base, tones[tone] || tones.neutral)}>{children}</span>;
}

function PremiumSelect({ value, onChange, options, className = "", ariaLabel }) {
  return (
    <div className={cn("relative", className)}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full appearance-none rounded-xl border border-white/10 bg-black/60",
          "px-3 py-2 pr-9 text-sm text-purple-200 outline-none",
          "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)]",
          "focus:border-purple-400/40 focus:ring-2 focus:ring-purple-500/25"
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-black text-purple-100">
            {opt.label}
          </option>
        ))}
      </select>

      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-purple-200/80">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7 10l5 5 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function Button({ children, variant = "primary", size = "md", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-sm",
  };
  const variants = {
    primary:
      "bg-purple-600 text-white shadow-[0_14px_40px_rgba(168,85,247,0.35)] hover:bg-purple-500",
    ghost: "bg-white/5 text-white/85 border border-white/10 hover:bg-white/8",
    dark: "bg-black/40 text-white/85 border border-white/10 hover:bg-black/55",
  };

  return (
    <button
      className={cn(base, sizes[size] || sizes.md, variants[variant] || variants.primary, className)}
      {...props}
    >
      {children}
    </button>
  );
}

function StatCard({ title, value, sub, tone = "neutral" }) {
  const toneTitle = tone === "purple" ? "text-purple-300" : "text-white/70";
  return (
    <GlassCard className="p-5">
      <div className="text-sm font-semibold text-white/70">{title}</div>
      <div className={cn("mt-2 text-3xl font-extrabold tracking-tight", toneTitle === "text-purple-300" ? "text-white" : "text-white")}>
        {value}
      </div>
      <div className="mt-1 text-sm text-white/55">{sub}</div>
    </GlassCard>
  );
}

function SectionTitle({ title, right }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-lg font-extrabold text-white">{title}</div>
      </div>
      {right}
    </div>
  );
}

function MiniMetric({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="text-xs font-semibold text-white/60">{label}</div>
      <div className="mt-2 text-2xl font-extrabold text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/50">{hint}</div> : null}
    </div>
  );
}

function BreakdownRow({ label, value, pct, tone }) {
  const pctText = `${Math.round(pct)}%`;
  const pillTone = tone || "purple";
  return (
    <div className="flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="truncate text-sm font-semibold text-white/85">{label}</div>
          <div className="flex items-center gap-2">
            <Pill tone={pillTone}>{pctText}</Pill>
            <div className="text-sm font-bold text-white">{value}</div>
          </div>
        </div>
        <div className="mt-2">
          <ProgressBar value={pct} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  // Persisted UI state
  const [search, setSearch] = useLocalStorageState(LS_KEYS.search, "");
  const [range, setRange] = useLocalStorageState(LS_KEYS.range, "30d");
  const [subView, setSubView] = useLocalStorageState(LS_KEYS.subView, "all"); // all | monthly | annual
  const [segment, setSegment] = useLocalStorageState(LS_KEYS.segment, "revenue"); // revenue | counts
  const [selectedBatch, setSelectedBatch] = useLocalStorageState(LS_KEYS.selectedBatch, "FEB-05-AM");
  const [selectedWorkflow, setSelectedWorkflow] = useLocalStorageState(LS_KEYS.selectedWorkflow, "review-exceptions");

  // UI-only mock data, structured to be swapped out later with Zoho CRM or Zoho Subscriptions
  const mock = useMemo(() => {
    const monthlyActive = 86;
    const annualActive = 19;

    const monthlyMRR = 129900; // ZAR
    const annualARR = 228000; // ZAR

    // Derived totals for a combined view
    const totalMRR = monthlyMRR + annualARR / 12;
    const totalARR = monthlyMRR * 12 + annualARR;

    // A few breakdown dimensions that feel realistic
    const breakdown = {
      planMix: [
        { label: "Starter", monthlyCount: 34, annualCount: 6, monthlyMRR: 45900, annualARR: 54000 },
        { label: "Business", monthlyCount: 38, annualCount: 10, monthlyMRR: 62400, annualARR: 132000 },
        { label: "Enterprise", monthlyCount: 14, annualCount: 3, monthlyMRR: 21600, annualARR: 42000 },
      ],
      health: [
        { label: "New (7d)", monthlyCount: 6, annualCount: 1, monthlyMRR: 8400, annualARR: 12000 },
        { label: "Renewals (30d)", monthlyCount: 0, annualCount: 3, monthlyMRR: 0, annualARR: 36000 },
        { label: "At risk (14d)", monthlyCount: 5, annualCount: 2, monthlyMRR: 7500, annualARR: 24000 },
        { label: "Churn (7d)", monthlyCount: 2, annualCount: 0, monthlyMRR: 2400, annualARR: 0 },
      ],
    };

    const recentBatches = [
      { batch: "FEB-05-AM", status: "Draft", items: 112 },
      { batch: "FEB-03-PM", status: "Exported", items: 98 },
      { batch: "JAN-29-AM", status: "Sent", items: 141 },
    ];

    // Top stats for the hero row
    const activeDebitOrders = 1284;
    const nextRun = "Fri 08:00";
    const queued = 112;
    const exceptions = 23;
    const collectionsMTD = 482910;

    return {
      monthlyActive,
      annualActive,
      monthlyMRR,
      annualARR,
      totalMRR,
      totalARR,
      breakdown,
      recentBatches,
      activeDebitOrders,
      nextRun,
      queued,
      exceptions,
      collectionsMTD,
    };
  }, []);

  const filteredBatches = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return mock.recentBatches;
    return mock.recentBatches.filter((b) => b.batch.toLowerCase().includes(q) || b.status.toLowerCase().includes(q));
  }, [mock.recentBatches, search]);

  const subScope = useMemo(() => {
    // Return counts + MRR/ARR depending on view
    if (subView === "monthly") {
      return {
        label: "Monthly subscriptions",
        active: mock.monthlyActive,
        mrr: mock.monthlyMRR,
        arr: mock.monthlyMRR * 12,
      };
    }
    if (subView === "annual") {
      return {
        label: "Annual subscriptions",
        active: mock.annualActive,
        mrr: mock.annualARR / 12,
        arr: mock.annualARR,
      };
    }
    return {
      label: "All subscriptions",
      active: mock.monthlyActive + mock.annualActive,
      mrr: mock.totalMRR,
      arr: mock.totalARR,
    };
  }, [mock, subView]);

  const breakdownRows = useMemo(() => {
    const items = mock.breakdown.planMix;
    const scoped = items.map((x) => {
      const count =
        subView === "monthly"
          ? x.monthlyCount
          : subView === "annual"
          ? x.annualCount
          : x.monthlyCount + x.annualCount;

      const revenueMonthly =
        subView === "monthly"
          ? x.monthlyMRR
          : subView === "annual"
          ? x.annualARR / 12
          : x.monthlyMRR + x.annualARR / 12;

      const revenueAnnual =
        subView === "monthly"
          ? x.monthlyMRR * 12
          : subView === "annual"
          ? x.annualARR
          : x.monthlyMRR * 12 + x.annualARR;

      return { label: x.label, count, revenueMonthly, revenueAnnual };
    });

    const totalCount = scoped.reduce((a, b) => a + b.count, 0) || 1;
    const totalRevenue = scoped.reduce((a, b) => a + (segment === "revenue" ? b.revenueMonthly : b.count), 0) || 1;

    return scoped
      .map((x) => {
        const basis = segment === "revenue" ? x.revenueMonthly : x.count;
        const pct = (basis / totalRevenue) * 100;
        return {
          label: x.label,
          value: segment === "revenue" ? formatZAR(x.revenueMonthly) : `${x.count}`,
          pct,
        };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [mock.breakdown.planMix, segment, subView]);

  const subscriptionChips = useMemo(() => {
    if (subView === "annual") {
      return [
        { text: "Renewals 30d: 3", tone: "purple" },
        { text: "New 30d: 1", tone: "neutral" },
      ];
    }
    if (subView === "monthly") {
      return [
        { text: "New 7d: 6", tone: "purple" },
        { text: "Churn 7d: 2", tone: "danger" },
      ];
    }
    return [
      { text: "New 7d: 7", tone: "purple" },
      { text: "At risk 14d: 7", tone: "neutral" },
      { text: "Churn 7d: 2", tone: "danger" },
    ];
  }, [subView]);

  return (
    <div className="min-h-screen bg-[#05060a] text-white">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(900px 500px at 18% 14%, rgba(168,85,247,0.22), transparent 60%), radial-gradient(900px 500px at 78% 18%, rgba(168,85,247,0.12), transparent 62%), radial-gradient(900px 600px at 50% 110%, rgba(255,255,255,0.05), transparent 55%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-6">
        {/* Top bar */}
        <GlassCard className="px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="text-xs font-semibold text-white/60">TabbyTech</div>
              <div className="text-xl font-extrabold text-white">Dashboard</div>
            </div>

            <div className="flex flex-1 items-center justify-end gap-3">
              <div className="relative w-full max-w-[520px]">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search clients, batches, reports"
                  className={cn(
                    "h-10 w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-3 text-sm text-white/85",
                    "outline-none focus:border-purple-400/40 focus:ring-2 focus:ring-purple-500/25"
                  )}
                />
              </div>

              <Button variant="dark" size="md" className="w-10 px-0">
                <span className="text-lg">🔔</span>
              </Button>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-sm font-extrabold">
                  T
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-extrabold">TabbyTech</div>
                  <div className="text-xs text-white/55">Ops</div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Main content shell */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          {/* Hero stats */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4">
              <StatCard title="Active Debit Orders" value={mock.activeDebitOrders.toLocaleString("en-ZA")} sub="Currently running" />
            </div>
            <div className="col-span-4">
              <StatCard title="Next Run" value={mock.nextRun} sub={`${mock.queued} items queued`} />
            </div>
            <div className="col-span-2">
              <StatCard title="Exceptions" value={`${mock.exceptions}`} sub="Needs attention" />
            </div>
            <div className="col-span-2">
              <StatCard title="Collections (MTD)" value={formatZAR(mock.collectionsMTD)} sub="Scheduled total" />
            </div>
          </div>

          {/* Subscription summary row */}
          <div className="mt-4 grid grid-cols-12 gap-4">
            <div className="col-span-6">
              <GlassCard className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white/70">Monthly subscriptions</div>
                    <div className="mt-1 text-2xl font-extrabold text-white">
                      {mock.monthlyActive} active <span className="text-white/45">·</span> {formatZAR(mock.monthlyMRR)} MRR
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Pill tone="purple">New 7d: 6</Pill>
                      <Pill tone="danger">Churn 7d: 2</Pill>
                    </div>
                  </div>
                  <Button variant="primary" size="md" onClick={() => setSubView("monthly")}>
                    Open
                  </Button>
                </div>
              </GlassCard>
            </div>

            <div className="col-span-6">
              <GlassCard className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white/70">Annual subscriptions</div>
                    <div className="mt-1 text-2xl font-extrabold text-white">
                      {mock.annualActive} active <span className="text-white/45">·</span> {formatZAR(mock.annualARR)} ARR
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Pill tone="purple">Renewals 30d: 3</Pill>
                      <Pill tone="neutral">New 30d: 1</Pill>
                    </div>
                  </div>
                  <Button variant="primary" size="md" onClick={() => setSubView("annual")}>
                    Open
                  </Button>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Lower grid: workflow + batches */}
          <div className="mt-4 grid grid-cols-12 gap-4">
            {/* Left column */}
            <div className="col-span-7">
              <GlassCard className="p-5">
                <SectionTitle
                  title="Today's Workflow"
                  right={
                    <PremiumSelect
                      ariaLabel="Select workflow focus"
                      value={selectedWorkflow}
                      onChange={setSelectedWorkflow}
                      options={[
                        { value: "review-exceptions", label: "Review exceptions" },
                        { value: "prepare-batch", label: "Prepare next batch" },
                        { value: "export-bank-files", label: "Export bank files" },
                        { value: "subscription-tracking", label: "Subscription tracking" },
                      ]}
                      className="w-[220px]"
                    />
                  }
                />

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-4">
                    <div>
                      <div className="text-sm font-extrabold text-white">Review exceptions</div>
                      <div className="mt-1 text-xs text-white/55">Prioritise failed deductions and follow ups</div>
                    </div>
                    <Button variant="dark" size="md" onClick={() => setSelectedWorkflow("review-exceptions")}>
                      Open
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-4">
                    <div>
                      <div className="text-sm font-extrabold text-white">Prepare next batch</div>
                      <div className="mt-1 text-xs text-white/55">Validate and queue debit orders for the next run</div>
                    </div>
                    <Button variant="primary" size="md" onClick={() => setSelectedWorkflow("prepare-batch")}>
                      Start
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-4">
                    <div>
                      <div className="text-sm font-extrabold text-white">Export bank files</div>
                      <div className="mt-1 text-xs text-white/55">Generate bank ready exports from approved batches</div>
                    </div>
                    <Button variant="dark" size="md" onClick={() => setSelectedWorkflow("export-bank-files")}>
                      Export
                    </Button>
                  </div>
                </div>

                {/* Subscription tracking section */}
                <div className="mt-6">
                  <div className="text-sm font-extrabold text-white">Subscription tracking</div>
                  <div className="mt-1 text-sm text-white/55">
                    UI-only for now. Later we will sync this from Zoho CRM or Zoho Subscriptions and lock down edits to reduce risk.
                  </div>

                  <div className="mt-4 grid grid-cols-12 gap-4">
                    {/* Controls */}
                    <div className="col-span-12">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="min-w-[220px]">
                            <div className="mb-1 text-xs font-semibold text-white/60">View</div>
                            <PremiumSelect
                              ariaLabel="Subscription view"
                              value={subView}
                              onChange={setSubView}
                              options={[
                                { value: "all", label: "All subscriptions" },
                                { value: "monthly", label: "Monthly only" },
                                { value: "annual", label: "Annual only" },
                              ]}
                            />
                          </div>

                          <div className="min-w-[220px]">
                            <div className="mb-1 text-xs font-semibold text-white/60">Range</div>
                            <PremiumSelect
                              ariaLabel="Time range"
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

                          <div className="min-w-[220px]">
                            <div className="mb-1 text-xs font-semibold text-white/60">Breakdown</div>
                            <PremiumSelect
                              ariaLabel="Breakdown metric"
                              value={segment}
                              onChange={setSegment}
                              options={[
                                { value: "revenue", label: "By revenue" },
                                { value: "counts", label: "By counts" },
                              ]}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {subscriptionChips.map((c) => (
                            <Pill key={c.text} tone={c.tone}>
                              {c.text}
                            </Pill>
                          ))}
                          <Button
                            variant="dark"
                            size="md"
                            onClick={() => {
                              // UI-only: planned integration handoff to Settings (Paystack keys)
                              // Keep this as a placeholder so it "feels wired".
                              alert("UI-only: This will open Settings > Paystack to paste API keys later.");
                            }}
                          >
                            Paystack settings
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="col-span-6">
                      <MiniMetric
                        label="Monthly MRR"
                        value={formatZAR(subScope.mrr)}
                        hint={`Active: ${subScope.active} · Range: ${range}`}
                      />
                    </div>
                    <div className="col-span-6">
                      <MiniMetric
                        label="Annual ARR"
                        value={formatZAR(subScope.arr)}
                        hint={`View: ${subView === "all" ? "All" : subView} · UI-only`}
                      />
                    </div>

                    {/* Breakdown widget */}
                    <div className="col-span-12">
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-extrabold text-white">Breakdown</div>
                            <div className="mt-1 text-sm text-white/55">
                              Plan mix overview. Designed to match TabbyTech premium dark glass.
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Pill tone="purple">{subScope.label}</Pill>
                            <Pill tone="neutral">{segment === "revenue" ? "Revenue share" : "Count share"}</Pill>
                          </div>
                        </div>

                        <div className="mt-5 space-y-4">
                          {breakdownRows.map((r) => (
                            <BreakdownRow
                              key={r.label}
                              label={r.label}
                              value={r.value}
                              pct={r.pct}
                              tone="purple"
                            />
                          ))}
                        </div>

                        <div className="mt-5 grid grid-cols-12 gap-3">
                          <div className="col-span-4 rounded-2xl border border-white/10 bg-black/35 p-4">
                            <div className="text-xs font-semibold text-white/60">Active</div>
                            <div className="mt-2 text-xl font-extrabold text-white">{subScope.active}</div>
                            <div className="mt-1 text-xs text-white/50">Monthly + annual combined when view is All</div>
                          </div>
                          <div className="col-span-4 rounded-2xl border border-white/10 bg-black/35 p-4">
                            <div className="text-xs font-semibold text-white/60">MRR (est.)</div>
                            <div className="mt-2 text-xl font-extrabold text-white">{formatZAR(subScope.mrr)}</div>
                            <div className="mt-1 text-xs text-white/50">Annual converted to monthly equivalent</div>
                          </div>
                          <div className="col-span-4 rounded-2xl border border-white/10 bg-black/35 p-4">
                            <div className="text-xs font-semibold text-white/60">ARR (est.)</div>
                            <div className="mt-2 text-xl font-extrabold text-white">{formatZAR(subScope.arr)}</div>
                            <div className="mt-1 text-xs text-white/50">Monthly multiplied by 12</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes: future wiring */}
                    <div className="col-span-12">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-sm font-semibold text-white/80">Next wiring later</div>
                        <div className="mt-1 text-sm text-white/55">
                          We will fetch subscription plan and billing cadence from Zoho CRM custom module, and we will allow limited
                          edits only for the single admin user. Paystack keys will be managed in Settings and applied to webhook verification.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Right column */}
            <div className="col-span-5">
              <GlassCard className="p-5">
                <SectionTitle
                  title="Recent Batches"
                  right={
                    <div className="w-[220px]">
                      <PremiumSelect
                        ariaLabel="Select batch"
                        value={selectedBatch}
                        onChange={setSelectedBatch}
                        options={mock.recentBatches.map((b) => ({ value: b.batch, label: b.batch }))}
                      />
                    </div>
                  }
                />

                <div className="mt-4">
                  <div className="grid grid-cols-12 px-2 text-xs font-semibold text-white/55">
                    <div className="col-span-5">Batch</div>
                    <div className="col-span-5">Status</div>
                    <div className="col-span-2 text-right">Items</div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {filteredBatches.map((b) => (
                      <div
                        key={b.batch}
                        className={cn(
                          "flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-4",
                          selectedBatch === b.batch ? "ring-2 ring-purple-500/25" : ""
                        )}
                        onClick={() => setSelectedBatch(b.batch)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-white">{b.batch}</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "inline-flex min-w-[120px] items-center justify-center rounded-full border px-3 py-1 text-xs font-extrabold",
                              "bg-purple-500/10 text-purple-200 border-purple-400/20"
                            )}
                          >
                            {b.status}
                          </span>
                          <div className="w-12 text-right text-sm font-extrabold text-white">{b.items}</div>
                        </div>
                      </div>
                    ))}

                    {filteredBatches.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-6 text-sm text-white/55">
                        No batches match your search.
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-white">Selected: {selectedBatch}</div>
                      <div className="mt-1 text-sm text-white/55">UI-only actions. Will wire to batch workflows later.</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="dark" size="md">
                        View
                      </Button>
                      <Button variant="primary" size="md">
                        Export
                      </Button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
