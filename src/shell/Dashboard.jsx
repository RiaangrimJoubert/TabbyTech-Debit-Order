// src/shell/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";

const LS = {
  range: "tabbytech.dashboard.range",
  subView: "tabbytech.dashboard.subView",
  metric: "tabbytech.dashboard.metric",
  batch: "tabbytech.dashboard.batch",
};

const DASHBOARD_CACHE_TTL_MS = 10 * 60 * 1000;

let dashboardScreenCache = {
  cronData: null,
  cronError: "",
  cronLoadedAt: 0,
  summaryByRange: {},
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
    } catch {}
  }, [key, val]);

  return [val, setVal];
}

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function safeNum(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v) {
  return String(v == null ? "" : v).trim();
}

function formatZAR(n) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(safeNum(n));
}

function formatZAR2(n) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeNum(n));
}

function fmtWhen(ts) {
  if (!ts) return "";
  return String(ts).trim();
}

function polarToCartesian(cx, cy, radius, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function makeLinePath(points) {
  if (!points.length) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

function makeAreaPath(points, baseY) {
  if (!points.length) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${makeLinePath(points)} L ${last.x.toFixed(2)} ${baseY.toFixed(
    2
  )} L ${first.x.toFixed(2)} ${baseY.toFixed(2)} Z`;
}

function getApiBase() {
  const v = safeStr(import.meta.env.VITE_API_BASE_URL);
  return v || "";
}

async function fetchJson(path) {
  const base = getApiBase();
  const url = `${base}${path}`;
  const resp = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json?.ok) {
    throw new Error(json?.error || `Request failed ${resp.status}`);
  }
  return json;
}

function isFresh(ts) {
  return Date.now() - safeNum(ts) < DASHBOARD_CACHE_TTL_MS;
}

async function fetchCronMetrics({ force = false } = {}) {
  if (!force && dashboardScreenCache.cronData && isFresh(dashboardScreenCache.cronLoadedAt)) {
    return dashboardScreenCache.cronData;
  }

  const data = await fetchJson("/api/dashboard/cron-metrics");
  dashboardScreenCache = {
    ...dashboardScreenCache,
    cronData: data,
    cronError: "",
    cronLoadedAt: Date.now(),
  };
  return data;
}

async function fetchDashboardSummary(range, { force = false } = {}) {
  const key = safeStr(range || "24h").toLowerCase();
  const cached = dashboardScreenCache.summaryByRange[key];

  if (!force && cached?.data && isFresh(cached.loadedAt)) {
    return cached.data;
  }

  const qs = new URLSearchParams({
    range: key,
  });

  const data = await fetchJson(`/api/dashboard/summary?${qs.toString()}`);
  dashboardScreenCache = {
    ...dashboardScreenCache,
    summaryByRange: {
      ...dashboardScreenCache.summaryByRange,
      [key]: {
        data,
        loadedAt: Date.now(),
        error: "",
      },
    },
  };
  return data;
}

function exportBatchesCsv(rows) {
  const header = ["Batch", "Status", "Items", "Value"];

  const body = (Array.isArray(rows) ? rows : []).map((row) => [
    safeStr(row.batch),
    safeStr(row.status),
    safeNum(row.items),
    safeNum(row.value),
  ]);

  const csvEscape = (v) => {
    const s = String(v == null ? "" : v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [header, ...body].map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "tabbytech-recent-batches.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function navigateToBatches(selectedBatch) {
  const batch = safeStr(selectedBatch);
  try {
    localStorage.setItem("tabbytech.batches.selectedBatch", JSON.stringify(batch));
  } catch {}

  try {
    window.dispatchEvent(
      new CustomEvent("tabbytech:navigate", {
        detail: { module: "batches", batch },
      })
    );
  } catch {}

  try {
    window.location.hash = batch
      ? `#/batches?batch=${encodeURIComponent(batch)}`
      : "#/batches";
  } catch {}
}

// Icons
const IconFileInvoice = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconCheckCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconRedo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const IconWallet = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
    <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
  </svg>
);

const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconEnvelope = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const IconExclamation = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconPaperPlane = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconAlert = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconClose = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconArrowUp = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const IconArrowDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

function Card({ children, style = {}, className = "" }) {
  return (
    <div
      className={cx("ttd-card", className)}
      style={{
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status, children }) {
  const styles = {
    running: { background: "rgba(34, 197, 94, 0.12)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.24)" },
    queued: { background: "rgba(234, 179, 8, 0.10)", color: "#facc15", border: "1px solid rgba(234, 179, 8, 0.22)" },
    active: { background: "rgba(34, 197, 94, 0.12)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.24)" },
    failed: { background: "rgba(239, 68, 68, 0.10)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.22)" },
    partial: { background: "rgba(249, 115, 22, 0.10)", color: "#fb923c", border: "1px solid rgba(249, 115, 22, 0.22)" },
    ok: { background: "rgba(34, 197, 94, 0.12)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.24)" },
    draft: { background: "rgba(139, 92, 246, 0.10)", color: "#a78bfa", border: "1px solid rgba(139, 92, 246, 0.22)" },
    exported: { background: "rgba(34, 197, 94, 0.12)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.24)" },
    sent: { background: "rgba(59, 130, 246, 0.10)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.22)" },
  };

  const badgeStyle = styles[status] || styles.draft;

  return (
    <span
      style={{
        height: "24px",
        padding: "0 10px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 900,
        letterSpacing: "0.2px",
        display: "inline-flex",
        alignItems: "center",
        ...badgeStyle,
      }}
    >
      {children}
    </span>
  );
}

function MetricCard({ title, value, subtext, trend, trendUp, icon: Icon, color = "purple" }) {
  return (
    <div className={cx("ttd-metricCard", `ttd-metric-${color}`)}>
      <div className={cx("ttd-metricIcon", `ttd-metricIcon-${color}`)}>
        <Icon />
      </div>

      <div className="ttd-metricLabel">{title}</div>
      <div className="ttd-metricValue">{value}</div>
      <div className="ttd-metricSub">{subtext}</div>

      {trend ? (
        <div
          className="ttd-metricTrend"
          style={{ color: trendUp ? "#4ade80" : "#f87171" }}
        >
          {trendUp ? <IconArrowUp /> : <IconArrowDown />}
          <span>{trend}</span>
        </div>
      ) : null}
    </div>
  );
}

function DonutChart({ size = 190, strokeWidth = 18, centerValue, centerLabel, segments }) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  let angleCursor = 0;

  return (
    <div className="ttd-donutWrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ttd-donutSvg">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {segments
          .filter((s) => safeNum(s.value) > 0)
          .map((segment, idx) => {
            const pct = Math.max(0, Math.min(100, safeNum(segment.pct)));
            const sweep = (pct / 100) * 359.999;
            const startAngle = angleCursor;
            const endAngle = angleCursor + sweep;
            angleCursor += sweep;

            return (
              <path
                key={`${segment.label}-${idx}`}
                d={describeArc(cx, cy, radius, startAngle, endAngle)}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            );
          })}
        <circle
          cx={cx}
          cy={cy}
          r={radius - strokeWidth / 2 - 8}
          fill="rgba(7,10,24,0.96)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      </svg>

      <div className="ttd-donutCenter">
        <div className="ttd-donutCenterValue">{centerValue}</div>
        <div className="ttd-donutCenterLabel">{centerLabel}</div>
      </div>
    </div>
  );
}

function LineTrendChart({ data }) {
  const rows = Array.isArray(data) ? data : [];
  const chartWidth = 100;
  const chartHeight = 230;
  const leftPad = 8;
  const rightPad = 8;
  const topPad = 16;
  const bottomPad = 26;
  const innerW = chartWidth - leftPad - rightPad;
  const innerH = chartHeight - topPad - bottomPad;

  const allValues = rows.flatMap((d) => [safeNum(d.successful), safeNum(d.failed), safeNum(d.retry)]);
  const maxY = Math.max(1, ...allValues);

  function buildSeries(key) {
    return rows.map((item, idx) => ({
      x: leftPad + (rows.length === 1 ? innerW / 2 : (idx / (rows.length - 1)) * innerW),
      y: topPad + innerH - (safeNum(item[key]) / maxY) * innerH,
      label: item.time,
      value: safeNum(item[key]),
    }));
  }

  const successPoints = buildSeries("successful");
  const failedPoints = buildSeries("failed");
  const retryPoints = buildSeries("retry");

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((step) => topPad + innerH * step);

  return (
    <div>
      <div className="ttd-chartHeaderMeta">
        <div>
          <div className="ttd-chartValue">
            {rows.length ? safeNum(rows[rows.length - 1].successful) : 0}
          </div>
          <div className="ttd-chartSub">Latest successful count</div>
        </div>
        <div className="ttd-chartPills">
          <span className="ttd-chartPill">
            <span className="ttd-miniDot" style={{ background: "#22c55e" }} />
            Successful
          </span>
          <span className="ttd-chartPill">
            <span className="ttd-miniDot" style={{ background: "#ef4444" }} />
            Failed
          </span>
          <span className="ttd-chartPill">
            <span className="ttd-miniDot" style={{ background: "#8b5cf6" }} />
            Retry
          </span>
        </div>
      </div>

      <div className="ttd-lineChartArea">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="ttd-success-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(34,197,94,0.32)" />
              <stop offset="100%" stopColor="rgba(34,197,94,0.02)" />
            </linearGradient>
          </defs>

          {gridLines.map((y, idx) => (
            <line
              key={`g-${idx}`}
              x1={leftPad}
              x2={chartWidth - rightPad}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="2 4"
            />
          ))}

          <path
            d={makeAreaPath(successPoints, topPad + innerH)}
            fill="url(#ttd-success-fill)"
          />
          <path
            d={makeLinePath(successPoints)}
            fill="none"
            stroke="#22c55e"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={makeLinePath(failedPoints)}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={makeLinePath(retryPoints)}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2.1"
            strokeDasharray="4 5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {successPoints.map((p, idx) => (
            <circle key={`sp-${idx}`} cx={p.x} cy={p.y} r="2.7" fill="#22c55e" />
          ))}
        </svg>
      </div>

      <div className="ttd-xAxis">
        {rows.map((d, idx) => (
          <div key={`lx-${idx}`} className="ttd-xAxisLabel">
            {d.time}
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data }) {
  const rows = Array.isArray(data) ? data : [];
  const allValues = rows.flatMap((d) => [safeNum(d.sent), safeNum(d.opened)]);
  const maxVal = Math.max(1, ...allValues);

  return (
    <div>
      <div className="ttd-chartHeaderMeta">
        <div>
          <div className="ttd-chartValue">
            {rows.reduce((sum, row) => sum + safeNum(row.sent), 0)}
          </div>
          <div className="ttd-chartSub">Weekly email activity demo</div>
        </div>
        <div className="ttd-chartPills">
          <span className="ttd-chartPill">
            <span className="ttd-miniDot" style={{ background: "#8b5cf6" }} />
            Sent
          </span>
          <span className="ttd-chartPill">
            <span className="ttd-miniDot" style={{ background: "#60a5fa" }} />
            Opened
          </span>
        </div>
      </div>

      <div className="ttd-barsWrap">
        {rows.map((row, idx) => (
          <div key={`b-${idx}`} className="ttd-barCol">
            <div className="ttd-barPair">
              <div
                className="ttd-bar ttd-barPurple"
                style={{ height: `${Math.max(8, (safeNum(row.sent) / maxVal) * 100)}%` }}
              />
              <div
                className="ttd-bar ttd-barBlue"
                style={{ height: `${Math.max(8, (safeNum(row.opened) / maxVal) * 100)}%` }}
              />
            </div>
            <div className="ttd-barLabel">{row.day}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [range, setRange] = useLocalStorageState(LS.range, "24h");
  const [subView] = useLocalStorageState(LS.subView, "monthly");
  const [metric] = useLocalStorageState(LS.metric, "revenue");
  const [selectedBatch, setSelectedBatch] = useLocalStorageState(LS.batch, "");

  const [cronMetrics, setCronMetrics] = useState(() => dashboardScreenCache.cronData || null);
  const [cronLoading, setCronLoading] = useState(() => !dashboardScreenCache.cronData || !isFresh(dashboardScreenCache.cronLoadedAt));
  const [cronError, setCronError] = useState(() => dashboardScreenCache.cronError || "");

  const [dashboardSummary, setDashboardSummary] = useState(() => {
    const key = safeStr(range || "24h").toLowerCase();
    return dashboardScreenCache.summaryByRange[key]?.data || null;
  });
  const [summaryLoading, setSummaryLoading] = useState(() => {
    const key = safeStr(range || "24h").toLowerCase();
    const cached = dashboardScreenCache.summaryByRange[key];
    return !(cached?.data && isFresh(cached.loadedAt));
  });
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadCron() {
      try {
        setCronLoading(true);
        setCronError("");
        const data = await fetchCronMetrics({ force: false });
        if (!alive) return;
        setCronMetrics(data);
      } catch (e) {
        const msg = String(e?.message || e);
        dashboardScreenCache = {
          ...dashboardScreenCache,
          cronError: msg,
        };
        if (!alive) return;
        setCronError(msg);
      } finally {
        if (alive) setCronLoading(false);
      }
    }

    loadCron();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadSummary() {
      try {
        setSummaryLoading(true);
        setSummaryError("");
        const data = await fetchDashboardSummary(range, { force: false });
        if (!alive) return;
        setDashboardSummary(data);
      } catch (e) {
        const msg = String(e?.message || e);
        if (!alive) return;
        setSummaryError(msg);
      } finally {
        if (alive) setSummaryLoading(false);
      }
    }

    loadSummary();

    return () => {
      alive = false;
    };
  }, [range]);

  const summaryData = dashboardSummary?.data || {};
  const summaryCards = summaryData?.cards || {};
  const summaryCharts = summaryData?.charts || {};
  const summaryNotifications = summaryData?.notifications || {};
  const summaryBatches = Array.isArray(summaryData?.batches) ? summaryData.batches : [];

  const attemptsToday = cronMetrics?.attemptsToday || {
    attempted: safeNum(summaryCards.attemptedToday),
    success: safeNum(summaryCards.successfulToday),
    failed: safeNum(summaryCards.failedToday),
    retry: safeNum(summaryCards.retryScheduledToday),
    suspended: safeNum(summaryCards.suspendedToday),
  };

  const cronLastRun = cronMetrics?.lastRun || null;
  const summaryLastRun = summaryData?.cron?.lastRun || null;
  const lastRun = cronLastRun || summaryLastRun || null;

  const lastResult = String(
    cronLastRun?.runStatus ||
      cronLastRun?.result ||
      summaryLastRun?.runStatus ||
      summaryLastRun?.result ||
      ""
  ).toUpperCase();

  let cronStatus = "queued";
  if (!lastRun) cronStatus = "queued";
  else if (lastResult === "FAILED") cronStatus = "failed";
  else if (lastResult === "PARTIAL") cronStatus = "partial";
  else if (lastResult === "SUCCESS") cronStatus = "ok";
  else if (lastResult === "RUNNING") cronStatus = "running";

  const cronJobs = [
    {
      id: 1,
      name: "Daily Debit Order Runner",
      schedule: "Daily 02:10",
      status: cronStatus,
      lastRun: lastRun?.startedAt
        ? fmtWhen(lastRun.startedAt)
        : lastRun?.started_at
        ? fmtWhen(lastRun.started_at)
        : "Not yet run",
      error: safeStr(lastRun?.lastError || lastRun?.last_error),
      progress:
        safeNum(attemptsToday.attempted) > 0
          ? Math.min(
              100,
              Math.round(
                (safeNum(attemptsToday.success) / Math.max(1, safeNum(attemptsToday.attempted))) * 100
              )
            )
          : 0,
    },
  ];

  const data = useMemo(() => {
    return {
      top: {
        totalDebitOrderValue: safeNum(summaryCards.totalDebitOrderValue),
        totalCollected: safeNum(summaryCards.totalCollected),
        estimatedMoneyToBank: safeNum(summaryCards.estimatedMoneyToBank),
        estimatedPaystackFees: safeNum(summaryCards.estimatedPaystackFees),
        retryScheduled: safeNum(summaryCards.retryScheduledToday),
        suspended: safeNum(summaryCards.suspendedToday),
        successRate: safeNum(summaryCards.successRate),
        failureRate: safeNum(summaryCards.failureRate),
        retryRate: safeNum(summaryCards.retryRate),
      },
      recentBatches: summaryBatches,
      notifications: {
        confirmation: {
          label: safeStr(summaryNotifications?.confirmation?.label || "Debit Order Confirmations"),
          status: safeStr(summaryNotifications?.confirmation?.status || "Pending"),
          count: safeNum(summaryNotifications?.confirmation?.count),
        },
        failed: {
          label: safeStr(summaryNotifications?.failed?.label || "Failed Payment Alerts"),
          status: safeStr(summaryNotifications?.failed?.status || "Pending"),
          count: safeNum(summaryNotifications?.failed?.count),
        },
        retry: {
          label: safeStr(summaryNotifications?.retry?.label || "Retry Notifications"),
          status: safeStr(summaryNotifications?.retry?.status || "Pending"),
          count: safeNum(summaryNotifications?.retry?.count),
        },
      },
    };
  }, [summaryBatches, summaryCards, summaryNotifications]);

  const debitPerformanceData = useMemo(() => {
    return Array.isArray(summaryCharts?.debitPerformance) ? summaryCharts.debitPerformance : [];
  }, [summaryCharts]);

  const retryDistributionData = useMemo(() => {
    return Array.isArray(summaryCharts?.retryDistribution) ? summaryCharts.retryDistribution : [];
  }, [summaryCharts]);

  const emailData = [
    { day: "Mon", sent: 120, opened: 80 },
    { day: "Tue", sent: 190, opened: 120 },
    { day: "Wed", sent: 150, opened: 100 },
    { day: "Thu", sent: 220, opened: 140 },
    { day: "Fri", sent: 180, opened: 110 },
    { day: "Sat", sent: 90, opened: 50 },
    { day: "Sun", sent: 110, opened: 70 },
  ];

  const visibleBatches = useMemo(() => {
    return data.recentBatches;
  }, [data.recentBatches]);

  useEffect(() => {
    if (!visibleBatches.length) return;
    const found = visibleBatches.some((b) => b.batch === selectedBatch);
    if (!found) setSelectedBatch(visibleBatches[0].batch);
  }, [visibleBatches, selectedBatch, setSelectedBatch]);

  const retrySegments = useMemo(() => {
    const total = retryDistributionData.reduce((sum, item) => sum + safeNum(item.value), 0) || 1;
    return retryDistributionData.map((item) => ({
      label: safeStr(item.name),
      value: safeNum(item.value),
      pct: (safeNum(item.value) / total) * 100,
      color: safeStr(item.color) || "#8b5cf6",
    }));
  }, [retryDistributionData]);

  const outcomeTotal = Math.max(
    1,
    safeNum(attemptsToday.success) +
      safeNum(attemptsToday.failed) +
      safeNum(data.top.retryScheduled) +
      safeNum(data.top.suspended)
  );

  const operationalSegments = [
    {
      label: "Successful",
      value: safeNum(attemptsToday.success),
      pct: (safeNum(attemptsToday.success) / outcomeTotal) * 100,
      color: "#22c55e",
    },
    {
      label: "Failed",
      value: safeNum(attemptsToday.failed),
      pct: (safeNum(attemptsToday.failed) / outcomeTotal) * 100,
      color: "#ef4444",
    },
    {
      label: "Retry",
      value: safeNum(data.top.retryScheduled),
      pct: (safeNum(data.top.retryScheduled) / outcomeTotal) * 100,
      color: "#8b5cf6",
    },
    {
      label: "Suspended",
      value: safeNum(data.top.suspended),
      pct: (safeNum(data.top.suspended) / outcomeTotal) * 100,
      color: "#60a5fa",
    },
  ];

  const overallLoading = cronLoading || summaryLoading;
  const overallError = cronError || summaryError;

  const selectedBatchRow = useMemo(() => {
    return visibleBatches.find((b) => b.batch === selectedBatch) || visibleBatches[0] || null;
  }, [visibleBatches, selectedBatch]);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap');

    .ttd-root {
      color: #d1d5db;
      font-family: 'Montserrat', sans-serif;
      width: 100%;
      height: 100%;
      overflow: auto;
      --ttd-purple: rgba(124,58,237,0.95);
      --ttd-purple2: rgba(168,85,247,0.95);
    }

    .ttd-root * {
      box-sizing: border-box;
    }

    .ttd-card {
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.10);
      background:
        radial-gradient(circle at top right, rgba(124,58,237,0.14), transparent 28%),
        linear-gradient(180deg, rgba(18,18,31,0.72) 0%, rgba(10,10,20,0.62) 100%);
      backdrop-filter: blur(14px);
      box-shadow: 0 18px 50px rgba(0,0,0,0.28);
      overflow: hidden;
    }

    .ttd-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 18px;
      padding: 0 4px;
      flex-wrap: wrap;
    }

    .ttd-title {
      font-size: 26px;
      font-weight: 800;
      color: white;
      margin: 0 0 4px 0;
      letter-spacing: -0.02em;
    }

    .ttd-subtitle {
      font-size: 13px;
      color: #9ca3af;
      margin: 0;
    }

    .ttd-headerRight {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: flex-end;
      width: 100%;
    }

    .ttd-livePill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(34,197,94,0.10);
      border: 1px solid rgba(34,197,94,0.20);
      color: #4ade80;
      font-size: 12px;
      font-weight: 700;
      margin-left: auto;
    }

    .ttd-liveDot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #22c55e;
      animation: ttdPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes ttdPulse {
      0%,100% { opacity: 1; transform: scale(1); }
      50% { opacity: .5; transform: scale(0.9); }
    }

    .ttd-grid4 {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .ttd-grid2 {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .ttd-grid2-equal {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .ttd-metricCard {
      min-height: 132px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.10);
      padding: 16px;
      position: relative;
      overflow: hidden;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.04),
        0 18px 40px rgba(0,0,0,0.24);
      background:
        radial-gradient(circle at 85% 120%, rgba(124,58,237,0.22), transparent 42%),
        linear-gradient(180deg, rgba(6,11,35,0.94) 0%, rgba(12,18,48,0.84) 100%);
    }

    .ttd-metric-green {
      background:
        radial-gradient(circle at 85% 120%, rgba(16,185,129,0.22), transparent 42%),
        linear-gradient(180deg, rgba(6,11,35,0.94) 0%, rgba(12,18,48,0.84) 100%);
    }

    .ttd-metric-orange {
      background:
        radial-gradient(circle at 85% 120%, rgba(249,115,22,0.20), transparent 42%),
        linear-gradient(180deg, rgba(6,11,35,0.94) 0%, rgba(12,18,48,0.84) 100%);
    }

    .ttd-metric-blue {
      background:
        radial-gradient(circle at 85% 120%, rgba(59,130,246,0.22), transparent 42%),
        linear-gradient(180deg, rgba(6,11,35,0.94) 0%, rgba(12,18,48,0.84) 100%);
    }

    .ttd-metricIcon {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 34px;
      height: 34px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(255,255,255,0.10);
      color: rgba(255,255,255,0.95);
    }

    .ttd-metricIcon-purple { background: rgba(124,58,237,0.28); }
    .ttd-metricIcon-green { background: rgba(16,185,129,0.22); }
    .ttd-metricIcon-orange { background: rgba(249,115,22,0.20); }
    .ttd-metricIcon-blue { background: rgba(59,130,246,0.22); }

    .ttd-metricLabel {
      font-size: 12px;
      color: rgba(255,255,255,0.62);
      margin-bottom: 16px;
    }

    .ttd-metricValue {
      font-size: 24px;
      font-weight: 800;
      color: white;
      line-height: 1.1;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }

    .ttd-metricSub {
      font-size: 12px;
      color: rgba(255,255,255,0.56);
    }

    .ttd-metricTrend {
      margin-top: 10px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
    }

    .ttd-panel {
      padding: 16px;
    }

    .ttd-panelHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }

    .ttd-panelTitle {
      font-size: 15px;
      font-weight: 800;
      color: white;
      margin: 0 0 4px 0;
    }

    .ttd-panelSub {
      font-size: 12px;
      color: #9ca3af;
      margin: 0;
    }

    .ttd-rangeGroup {
      display: inline-flex;
      gap: 6px;
      background: rgba(0,0,0,0.18);
      padding: 4px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.06);
    }

    .ttd-rangeBtn {
      padding: 7px 10px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 800;
      border: none;
      cursor: pointer;
      background: transparent;
      color: #9ca3af;
      transition: all 0.2s ease;
    }

    .ttd-rangeBtnActive {
      background: linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95));
      color: white;
      box-shadow: 0 12px 28px rgba(124,58,237,0.20);
    }

    .ttd-chartHeaderMeta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .ttd-chartValue {
      font-size: 22px;
      font-weight: 800;
      color: white;
      line-height: 1;
    }

    .ttd-chartSub {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 4px;
    }

    .ttd-chartPills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .ttd-chartPill {
      height: 28px;
      padding: 0 10px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      font-size: 11px;
      font-weight: 800;
      color: rgba(255,255,255,0.82);
    }

    .ttd-miniDot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      display: inline-block;
      flex: 0 0 auto;
    }

    .ttd-lineChartArea {
      height: 230px;
      width: 100%;
    }

    .ttd-lineChartArea svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    .ttd-xAxis {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 4px;
      margin-top: 10px;
    }

    .ttd-xAxisLabel {
      font-size: 10px;
      color: rgba(255,255,255,0.46);
      text-align: center;
      line-height: 1.2;
    }

    .ttd-donutLayout {
      display: grid;
      grid-template-columns: 210px 1fr;
      gap: 14px;
      align-items: center;
    }

    .ttd-donutWrap {
      width: 190px;
      height: 190px;
      position: relative;
      margin: 0 auto;
    }

    .ttd-donutSvg {
      display: block;
      filter: drop-shadow(0 14px 28px rgba(0,0,0,0.28));
    }

    .ttd-donutCenter {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      pointer-events: none;
      text-align: center;
    }

    .ttd-donutCenterValue {
      font-size: 24px;
      font-weight: 800;
      color: white;
      line-height: 1;
    }

    .ttd-donutCenterLabel {
      margin-top: 6px;
      font-size: 11px;
      color: rgba(255,255,255,0.56);
    }

    .ttd-legendStack {
      display: grid;
      gap: 10px;
    }

    .ttd-legendCard {
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.04);
      padding: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .ttd-legendLeft {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .ttd-legendSwatch {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      flex: 0 0 auto;
    }

    .ttd-legendLabel {
      font-size: 12px;
      font-weight: 800;
      color: rgba(255,255,255,0.82);
    }

    .ttd-legendSub {
      margin-top: 2px;
      font-size: 11px;
      color: rgba(255,255,255,0.54);
    }

    .ttd-legendPct {
      font-size: 14px;
      font-weight: 800;
      color: white;
      white-space: nowrap;
    }

    .ttd-opGrid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .ttd-opStat {
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.04);
      padding: 12px;
    }

    .ttd-opValue {
      margin-top: 8px;
      font-size: 16px;
      font-weight: 800;
      color: white;
    }

    .ttd-opSub {
      margin-top: 4px;
      font-size: 11px;
      color: rgba(255,255,255,0.52);
    }

    .ttd-cronList {
      display: grid;
      gap: 12px;
      min-height: 170px;
    }

    .ttd-cronItem {
      padding: 14px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(18,18,31,0.40);
      position: relative;
      overflow: hidden;
    }

    .ttd-cronItem::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(139,92,246,0.08), transparent);
      animation: ttdShimmer 2.2s infinite;
    }

    @keyframes ttdShimmer {
      100% { left: 100%; }
    }

    .ttd-cronTop {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 10px;
      position: relative;
      z-index: 1;
    }

    .ttd-cronTitle {
      font-size: 13px;
      font-weight: 800;
      color: white;
      margin-bottom: 4px;
    }

    .ttd-cronMeta {
      font-size: 11px;
      color: rgba(255,255,255,0.54);
      font-family: monospace;
    }

    .ttd-cronRow {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #9ca3af;
      margin-bottom: 10px;
      position: relative;
      z-index: 1;
    }

    .ttd-progressTrack {
      height: 8px;
      border-radius: 999px;
      background: rgba(55,65,81,0.5);
      overflow: hidden;
      position: relative;
      z-index: 1;
    }

    .ttd-progressFill {
      height: 100%;
      border-radius: 999px;
      transition: all 0.5s ease;
      background: linear-gradient(90deg, #8b5cf6, #a78bfa);
    }

    .ttd-errorText {
      margin-top: 8px;
      font-size: 11px;
      color: #f87171;
      display: flex;
      align-items: center;
      gap: 5px;
      position: relative;
      z-index: 1;
    }

    .ttd-batchTableWrap {
      overflow-x: auto;
    }

    .ttd-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 13px;
    }

    .ttd-th {
      text-align: left;
      padding: 0 0 10px 0;
      font-size: 11px;
      color: #6b7280;
      font-weight: 700;
      border-bottom: 1px solid rgba(139,92,246,0.10);
    }

    .ttd-tr {
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .ttd-trSelected {
      background: rgba(139,92,246,0.05);
    }

    .ttd-td {
      padding: 12px 0;
      border-bottom: 1px solid rgba(139,92,246,0.05);
      color: white;
    }

    .ttd-select {
      background: rgba(18,18,31,0.60);
      border: 1px solid rgba(139,92,246,0.20);
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 12px;
      color: #d1d5db;
      outline: none;
    }

    .ttd-actionsRow {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .ttd-btn {
      flex: 1;
      padding: 10px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .ttd-btnGhost {
      background: rgba(26,26,46,0.8);
      border: 1px solid rgba(139,92,246,0.20);
      color: white;
    }

    .ttd-btnPrimary {
      border: none;
      color: white;
      background: linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95));
      box-shadow: 0 12px 28px rgba(124,58,237,0.20);
    }

    .ttd-selectedBox {
      margin-top: 14px;
      padding: 14px;
      border-radius: 14px;
      background: rgba(18,18,31,0.30);
      border: 1px solid rgba(139,92,246,0.10);
    }

    @media (max-width: 1500px) {
      .ttd-grid4 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .ttd-grid2,
      .ttd-grid2-equal {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 980px) {
      .ttd-donutLayout {
        grid-template-columns: 1fr;
      }
      .ttd-opGrid {
        grid-template-columns: 1fr;
      }
      .ttd-grid4 {
        grid-template-columns: 1fr;
      }
    }
  `;

  return (
    <div className="ttd-root">
      <style>{css}</style>

      <header className="ttd-header">
        <div>
          <h2 className="ttd-title">Dashboard Overview</h2>
          <p className="ttd-subtitle">
            Executive financial overview for collections, settlement, cron health, batches, and notifications
            {overallLoading ? " • syncing..." : ""}
            {overallError ? " • error" : ""}
            {subView ? ` • ${String(subView)}` : ""}
            {metric ? ` • ${String(metric)}` : ""}
            {summaryData?.asOfDate ? ` • as of ${summaryData.asOfDate}` : ""}
          </p>
        </div>

        <div className="ttd-headerRight">
          <div className="ttd-livePill">
            <span className="ttd-liveDot" />
            Live
          </div>
        </div>
      </header>

      <div className="ttd-grid4">
        <MetricCard
          title="Total Debit Order Value"
          value={formatZAR(data.top.totalDebitOrderValue)}
          subtext={`${safeNum(summaryCards.attemptedToday)} attempts in current live view`}
          trend={
            overallError
              ? "API Error"
              : overallLoading
              ? "Syncing"
              : `${safeNum(data.top.successRate).toFixed(0)}% success rate`
          }
          trendUp={!overallError}
          icon={IconFileInvoice}
          color="purple"
        />

        <MetricCard
          title="Total Collected"
          value={formatZAR(data.top.totalCollected)}
          subtext={`${safeNum(summaryCards.successfulToday)} successful charges today`}
          trend={safeNum(summaryCards.successfulToday) > 0 ? "Collections active" : ""}
          trendUp={true}
          icon={IconCheckCircle}
          color="green"
        />

        <MetricCard
          title="Money To Bank"
          value={formatZAR2(data.top.estimatedMoneyToBank)}
          subtext="Estimated net after fees"
          trend={safeNum(data.top.estimatedMoneyToBank) > 0 ? "Settlement positive" : ""}
          trendUp={true}
          icon={IconWallet}
          color="blue"
        />

        <MetricCard
          title="Paystack Fees"
          value={formatZAR2(data.top.estimatedPaystackFees)}
          subtext={`Failed today ${safeNum(summaryCards.failedToday)} • Retry ${safeNum(data.top.retryScheduled)}`}
          trend={safeNum(summaryCards.failedToday) > 0 ? "Watch fee leakage" : ""}
          trendUp={false}
          icon={IconRedo}
          color="orange"
        />
      </div>

      <div className="ttd-grid2">
        <Card className="ttd-card">
          <div className="ttd-panel">
            <div className="ttd-panelHeader">
              <div>
                <h3 className="ttd-panelTitle">Debit order performance</h3>
                <p className="ttd-panelSub">Live executive view of successful, failed, and retry flow</p>
              </div>

              <div className="ttd-rangeGroup">
                {["24H", "7D", "30D"].map((r) => {
                  const val = r.toLowerCase();
                  return (
                    <button
                      key={r}
                      onClick={() => setRange(val)}
                      className={cx("ttd-rangeBtn", range === val && "ttd-rangeBtnActive")}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            <LineTrendChart data={debitPerformanceData} />
          </div>
        </Card>

        <Card className="ttd-card">
          <div className="ttd-panel">
            <div className="ttd-panelHeader">
              <div>
                <h3 className="ttd-panelTitle">Retry distribution</h3>
                <p className="ttd-panelSub">Operational view of retry timing pressure</p>
              </div>
            </div>

            <div className="ttd-donutLayout">
              <DonutChart
                centerValue={safeNum(data.top.retryScheduled)}
                centerLabel="Retry items"
                segments={retrySegments}
              />

              <div className="ttd-legendStack">
                {retrySegments.map((item) => (
                  <div key={item.label} className="ttd-legendCard">
                    <div className="ttd-legendLeft">
                      <span className="ttd-legendSwatch" style={{ background: item.color }} />
                      <div>
                        <div className="ttd-legendLabel">{item.label}</div>
                        <div className="ttd-legendSub">{safeNum(item.value)} scheduled</div>
                      </div>
                    </div>
                    <div className="ttd-legendPct">{safeNum(item.pct).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="ttd-grid2-equal">
        <Card className="ttd-card">
          <div className="ttd-panel">
            <div className="ttd-panelHeader">
              <div>
                <h3 className="ttd-panelTitle">Operations snapshot</h3>
                <p className="ttd-panelSub">Financial and operational pressure points from the live cron state</p>
              </div>
            </div>

            <div className="ttd-donutLayout">
              <DonutChart
                centerValue={safeNum(summaryCards.attemptedToday)}
                centerLabel="Attempts today"
                segments={operationalSegments}
              />

              <div className="ttd-legendStack">
                {operationalSegments.map((segment) => (
                  <div key={segment.label} className="ttd-legendCard">
                    <div className="ttd-legendLeft">
                      <span className="ttd-legendSwatch" style={{ background: segment.color }} />
                      <div>
                        <div className="ttd-legendLabel">{segment.label}</div>
                        <div className="ttd-legendSub">{safeNum(segment.value)} items</div>
                      </div>
                    </div>
                    <div className="ttd-legendPct">{safeNum(segment.pct).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="ttd-card">
          <div className="ttd-panel">
            <div className="ttd-panelHeader">
              <div>
                <h3 className="ttd-panelTitle">Rates and pressure</h3>
                <p className="ttd-panelSub">Fast finance summary for live decision making</p>
              </div>
            </div>

            <div className="ttd-opGrid">
              <div className="ttd-opStat">
                <div className="ttd-legendLabel">Success rate</div>
                <div className="ttd-opValue">{safeNum(data.top.successRate).toFixed(0)}%</div>
                <div className="ttd-opSub">Based on attempts processed today</div>
              </div>

              <div className="ttd-opStat">
                <div className="ttd-legendLabel">Failure rate</div>
                <div className="ttd-opValue">{safeNum(data.top.failureRate).toFixed(0)}%</div>
                <div className="ttd-opSub">Live failed attempt pressure</div>
              </div>

              <div className="ttd-opStat">
                <div className="ttd-legendLabel">Retry rate</div>
                <div className="ttd-opValue">{safeNum(data.top.retryRate).toFixed(0)}%</div>
                <div className="ttd-opSub">Estimated retry queue from failures</div>
              </div>

              <div className="ttd-opStat">
                <div className="ttd-legendLabel">Last cron result</div>
                <div className="ttd-opValue">
                  {safeStr(lastRun?.runStatus || lastRun?.result || "N/A") || "N/A"}
                </div>
                <div className="ttd-opSub">
                  {lastRun?.startedAt
                    ? fmtWhen(lastRun.startedAt)
                    : lastRun?.started_at
                    ? fmtWhen(lastRun.started_at)
                    : "No run yet"}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="ttd-grid2-equal">
        <Card className="ttd-card">
          <div className="ttd-panel">
            <div className="ttd-panelHeader">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "12px",
                    background: "rgba(139, 92, 246, 0.12)",
                    border: "1px solid rgba(139, 92, 246, 0.20)",
                    color: "#a78bfa",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <IconClock />
                </div>
                <div>
                  <h3 className="ttd-panelTitle">Cron job monitor</h3>
                  <p className="ttd-panelSub">{cronError ? `API error: ${cronError}` : "Live from DataStore"}</p>
                </div>
              </div>
            </div>

            <div className="ttd-cronList">
              {cronJobs.map((job) => (
                <div
                  key={job.id}
                  className="ttd-cronItem"
                  style={{
                    borderColor:
                      job.status === "failed"
                        ? "rgba(239,68,68,0.20)"
                        : job.status === "partial"
                        ? "rgba(249,115,22,0.20)"
                        : "rgba(255,255,255,0.08)",
                    background:
                      job.status === "failed"
                        ? "rgba(239,68,68,0.05)"
                        : job.status === "partial"
                        ? "rgba(249,115,22,0.05)"
                        : "rgba(18,18,31,0.40)",
                  }}
                >
                  <div className="ttd-cronTop">
                    <div>
                      <div className="ttd-cronTitle">{job.name}</div>
                      <div className="ttd-cronMeta">{job.schedule}</div>
                    </div>

                    <StatusBadge status={job.status}>
                      {job.status === "running"
                        ? "Running"
                        : job.status === "failed"
                        ? "Failed"
                        : job.status === "partial"
                        ? "Partial"
                        : job.status === "ok"
                        ? "Success"
                        : "Queued"}
                    </StatusBadge>
                  </div>

                  <div className="ttd-cronRow">
                    <span>Last run: {job.lastRun}</span>
                    <span style={{ color: job.status === "ok" ? "#4ade80" : job.status === "failed" ? "#f87171" : "#9ca3af" }}>
                      {job.status === "ok" ? "Healthy" : job.status === "failed" ? "Needs fix" : "Monitoring"}
                    </span>
                  </div>

                  <div className="ttd-progressTrack">
                    <div
                      className="ttd-progressFill"
                      style={{
                        width: `${job.progress}%`,
                        background:
                          job.status === "failed"
                            ? "#ef4444"
                            : job.status === "partial"
                            ? "#f97316"
                            : "linear-gradient(90deg, #8b5cf6, #a78bfa)",
                      }}
                    />
                  </div>

                  {job.error ? (
                    <div className="ttd-errorText">
                      <IconExclamation />
                      {job.error}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="ttd-card">
          <div className="ttd-panel">
            <div className="ttd-panelHeader">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "12px",
                    background: "rgba(59, 130, 246, 0.12)",
                    border: "1px solid rgba(59, 130, 246, 0.20)",
                    color: "#60a5fa",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <IconEnvelope />
                </div>
                <div>
                  <h3 className="ttd-panelTitle">ZeptoMail tracker</h3>
                  <p className="ttd-panelSub">UI-ready summary until live email wiring is complete</p>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "14px" }}>
              <div className="ttd-opStat" style={{ textAlign: "center" }}>
                <div className="ttd-opValue">{safeNum(data.notifications.confirmation.count)}</div>
                <div className="ttd-opSub">Sent</div>
              </div>
              <div className="ttd-opStat" style={{ textAlign: "center" }}>
                <div className="ttd-opValue" style={{ color: "#4ade80" }}>0%</div>
                <div className="ttd-opSub">Delivered</div>
              </div>
              <div className="ttd-opStat" style={{ textAlign: "center" }}>
                <div className="ttd-opValue" style={{ color: "#60a5fa" }}>0%</div>
                <div className="ttd-opSub">Opened</div>
              </div>
            </div>

            <BarChart data={emailData} />

            <div className="ttd-legendStack" style={{ marginTop: "14px" }}>
              <div className="ttd-legendCard">
                <div className="ttd-legendLeft">
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      background: "rgba(139, 92, 246, 0.10)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <IconPaperPlane />
                  </div>
                  <div>
                    <div className="ttd-legendLabel">{data.notifications.confirmation.label}</div>
                    <div className="ttd-legendSub">{safeNum(data.notifications.confirmation.count)} items</div>
                  </div>
                </div>
                <div className="ttd-legendPct">{data.notifications.confirmation.status}</div>
              </div>

              <div className="ttd-legendCard">
                <div className="ttd-legendLeft">
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      background: "rgba(249,115,22,0.10)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <IconAlert />
                  </div>
                  <div>
                    <div className="ttd-legendLabel">{data.notifications.failed.label}</div>
                    <div className="ttd-legendSub">{safeNum(data.notifications.failed.count)} items waiting</div>
                  </div>
                </div>
                <div className="ttd-legendPct">{data.notifications.failed.status}</div>
              </div>

              <div className="ttd-legendCard">
                <div className="ttd-legendLeft">
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      background: "rgba(239,68,68,0.10)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <IconClose />
                  </div>
                  <div>
                    <div className="ttd-legendLabel">{data.notifications.retry.label}</div>
                    <div className="ttd-legendSub">{safeNum(data.notifications.retry.count)} items waiting</div>
                  </div>
                </div>
                <div className="ttd-legendPct">{data.notifications.retry.status}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="ttd-grid2-equal">
        <Card className="ttd-card">
          <div className="ttd-panel">
            <div className="ttd-panelHeader">
              <div>
                <h3 className="ttd-panelTitle">Recent batches</h3>
                <p className="ttd-panelSub">Fast access to the most recent debit order batch states</p>
              </div>
              <select
                value={selectedBatch || ""}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="ttd-select"
              >
                {visibleBatches.length ? (
                  visibleBatches.map((b) => (
                    <option key={b.batch} value={b.batch}>
                      {b.batch}
                    </option>
                  ))
                ) : (
                  <option value="">No batches</option>
                )}
              </select>
            </div>

            <div className="ttd-batchTableWrap">
              <table className="ttd-table">
                <thead>
                  <tr>
                    <th className="ttd-th">Batch</th>
                    <th className="ttd-th">Status</th>
                    <th className="ttd-th" style={{ textAlign: "right" }}>Items</th>
                    <th className="ttd-th" style={{ textAlign: "right" }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBatches.map((b) => (
                    <tr
                      key={b.batch}
                      className={cx("ttd-tr", selectedBatch === b.batch && "ttd-trSelected")}
                      onClick={() => setSelectedBatch(b.batch)}
                    >
                      <td className="ttd-td" style={{ fontWeight: 700 }}>{b.batch}</td>
                      <td className="ttd-td">
                        <StatusBadge status={safeStr(b.status).toLowerCase()}>
                          {safeStr(b.status).charAt(0).toUpperCase() + safeStr(b.status).slice(1)}
                        </StatusBadge>
                      </td>
                      <td className="ttd-td" style={{ textAlign: "right" }}>{safeNum(b.items)}</td>
                      <td className="ttd-td" style={{ textAlign: "right" }}>{formatZAR(b.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ttd-selectedBox">
              <div style={{ fontSize: "12px", fontWeight: 800, color: "white", marginBottom: "4px" }}>
                Selected: {selectedBatchRow?.batch || "None"}
              </div>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "10px" }}>
                Open the selected batch in the Batches module or export the visible table.
              </div>

              <div className="ttd-actionsRow">
                <button
                  className="ttd-btn ttd-btnGhost"
                  onClick={() => navigateToBatches(selectedBatchRow?.batch)}
                  disabled={!selectedBatchRow}
                >
                  View
                </button>
                <button
                  className="ttd-btn ttd-btnPrimary"
                  onClick={() => exportBatchesCsv(visibleBatches)}
                  disabled={!visibleBatches.length}
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {overallError ? (
        <div
          style={{
            marginTop: "16px",
            padding: "14px",
            borderRadius: "14px",
            border: "1px solid rgba(239,68,68,0.22)",
            background: "rgba(239,68,68,0.06)",
            color: "#f87171",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          Dashboard API error: {overallError}
        </div>
      ) : null}
    </div>
  );
}
