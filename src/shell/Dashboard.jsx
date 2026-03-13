// src/shell/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";

const LS = {
  search: "tabbytech.dashboard.search",
  range: "tabbytech.dashboard.range",
  subView: "tabbytech.dashboard.subView",
  metric: "tabbytech.dashboard.metric",
  batch: "tabbytech.dashboard.batch",
  summaryCache: "tabbytech.dashboard.summaryCache",
  cronCache: "tabbytech.dashboard.cronCache",
};

const SUMMARY_CACHE_MS = 10 * 60 * 1000;
const CRON_LIVE_REFRESH_MS = 30 * 1000;

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

function fmtDateShort(value) {
  if (!value) return "";
  const d = new Date(String(value).length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-ZA", {
    month: "short",
    day: "2-digit",
  });
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

function getCachedObject(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function setCachedObject(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function getSummaryCache(range) {
  const cache = getCachedObject(LS.summaryCache);
  if (!cache) return null;
  if (cache.range !== range) return null;
  if (!cache.ts || Date.now() - cache.ts > SUMMARY_CACHE_MS) return null;
  return cache.data || null;
}

function setSummaryCache(range, data) {
  setCachedObject(LS.summaryCache, {
    range,
    ts: Date.now(),
    data,
  });
}

function getCronCache() {
  const cache = getCachedObject(LS.cronCache);
  if (!cache) return null;
  if (!cache.ts || Date.now() - cache.ts > CRON_LIVE_REFRESH_MS) return null;
  return cache.data || null;
}

function setCronCache(data) {
  setCachedObject(LS.cronCache, {
    ts: Date.now(),
    data,
  });
}

function exportRowsToCsv(filename, rows) {
  const safe = (value) => {
    const s = String(value == null ? "" : value);
    const mustQuote = /[",\n\r]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return mustQuote ? `"${escaped}"` : escaped;
  };

  const columns = [
    { key: "batch", label: "Batch" },
    { key: "status", label: "Status" },
    { key: "items", label: "Items" },
    { key: "value", label: "Value" },
    { key: "date", label: "Date" },
  ];

  const csv = [
    columns.map((c) => safe(c.label)).join(","),
    ...rows.map((row) =>
      columns
        .map((c) => {
          if (c.key === "value") return safe(formatZAR(safeNum(row[c.key])));
          return safe(row[c.key]);
        })
        .join(",")
    ),
  ].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function normalizeBatchStatus(raw) {
  const s = safeStr(raw).toUpperCase();
  if (!s) return "Pending";
  if (["SUCCESS", "SUCCESSFUL", "PAID", "COMPLETED", "COMPLETE"].includes(s)) return "Successful";
  if (["FAILED", "FAIL", "ERROR"].includes(s)) return "Failed";
  if (["RETRY", "RETRY SCHEDULED", "RETRY_SCHEDULED"].includes(s)) return "Retry Scheduled";
  if (["SUSPENDED", "SUSPEND"].includes(s)) return "Suspended";
  if (["RUNNING", "PROCESSING", "IN PROGRESS"].includes(s)) return "Running";
  if (["QUEUED", "PENDING", "INITIATED", "CREATED"].includes(s)) return "Pending";
  if (["EXPORTED", "EXPORT"].includes(s)) return "Exported";
  if (["SENT"].includes(s)) return "Sent";
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function normalizeDashboardBatchRow(raw, index) {
  const row = raw || {};

  const batchId =
    safeStr(row.batchId) ||
    safeStr(row.batch_id) ||
    safeStr(row.runId) ||
    safeStr(row.run_id) ||
    safeStr(row.id) ||
    safeStr(row.reference);

  const batchLabel =
    safeStr(row.batch) ||
    safeStr(row.batchName) ||
    safeStr(row.batch_name) ||
    safeStr(row.runLabel) ||
    safeStr(row.run_label) ||
    batchId ||
    safeStr(row.date) ||
    safeStr(row.createdAt) ||
    `Batch ${index + 1}`;

  const dateValue =
    safeStr(row.date) ||
    safeStr(row.batchDate) ||
    safeStr(row.batch_date) ||
    safeStr(row.createdAt) ||
    safeStr(row.created_at) ||
    safeStr(row.updatedAt) ||
    safeStr(row.updated_at);

  const itemsValue =
    safeNum(row.items) ||
    safeNum(row.itemCount) ||
    safeNum(row.item_count) ||
    safeNum(row.totalItems) ||
    safeNum(row.total_items) ||
    safeNum(row.attemptCount) ||
    safeNum(row.attempt_count) ||
    safeNum(row.count);

  const moneyValue =
    safeNum(row.value) ||
    safeNum(row.amount) ||
    safeNum(row.totalValue) ||
    safeNum(row.total_value) ||
    safeNum(row.totalAmount) ||
    safeNum(row.total_amount) ||
    safeNum(row.collectedAmount) ||
    safeNum(row.collected_amount);

  const statusValue = normalizeBatchStatus(
    row.runStatus ||
      row.run_status ||
      row.result ||
      row.outcome ||
      row.batchStatus ||
      row.batch_status ||
      row.status
  );

  return {
    key: batchId || batchLabel || `batch-${index + 1}`,
    batch: batchLabel,
    batchId: batchId || batchLabel,
    status: statusValue,
    items: itemsValue,
    value: moneyValue,
    date: dateValue,
    clientId: safeStr(row.clientId || row.client_id),
    raw: row,
  };
}

function getNextCollectionCycleLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  if (day < 25) {
    const next25 = new Date(year, month, 25);
    return `Next cycle • ${next25.toLocaleDateString("en-ZA", { month: "short", day: "2-digit" })} run`;
  }

  const next1 = new Date(year, month + 1, 1);
  return `Next cycle • ${next1.toLocaleDateString("en-ZA", { month: "short", day: "2-digit" })} run`;
}

function getCollectionScheduleText() {
  return "Collections run on the 25th and 1st of each month";
}

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

const IconExclamation = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
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

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
  const normalized = safeStr(status).toLowerCase();

  const styles = {
    running: { background: "rgba(34, 197, 94, 0.12)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.24)" },
    queued: { background: "rgba(234, 179, 8, 0.10)", color: "#facc15", border: "1px solid rgba(234, 179, 8, 0.22)" },
    active: { background: "rgba(34, 197, 94, 0.12)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.24)" },
    failed: { background: "rgba(239, 68, 68, 0.10)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.22)" },
    partial: { background: "rgba(249, 115, 22, 0.10)", color: "#fb923c", border: "1px solid rgba(249, 115, 22, 0.22)" },
    ok: { background: "rgba(34, 197, 94, 0.12)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.24)" },
    successful: { background: "rgba(34, 197, 94, 0.12)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.24)" },
    pending: { background: "rgba(234, 179, 8, 0.10)", color: "#facc15", border: "1px solid rgba(234, 179, 8, 0.22)" },
    retry: { background: "rgba(139, 92, 246, 0.10)", color: "#a78bfa", border: "1px solid rgba(139, 92, 246, 0.22)" },
    "retry scheduled": { background: "rgba(139, 92, 246, 0.10)", color: "#a78bfa", border: "1px solid rgba(139, 92, 246, 0.22)" },
    suspended: { background: "rgba(59, 130, 246, 0.10)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.22)" },
    draft: { background: "rgba(139, 92, 246, 0.10)", color: "#a78bfa", border: "1px solid rgba(139, 92, 246, 0.22)" },
    exported: { background: "rgba(34, 197, 94, 0.12)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.24)" },
    sent: { background: "rgba(59, 130, 246, 0.10)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.22)" },
  };

  const badgeStyle = styles[normalized] || styles.draft;

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

async function fetchCronMetrics() {
  return fetchJson("/api/dashboard/cron-metrics");
}

async function fetchDashboardSummary(range) {
  const qs = new URLSearchParams({
    range: String(range || "24h").toLowerCase(),
  });
  return fetchJson(`/api/dashboard/summary?${qs.toString()}`);
}

function resolveRealMetric(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function Dashboard() {
  const [search, setSearch] = useLocalStorageState(LS.search, "");
  const [range, setRange] = useLocalStorageState(LS.range, "24h");
  const [subView] = useLocalStorageState(LS.subView, "monthly");
  const [metric] = useLocalStorageState(LS.metric, "revenue");
  const [selectedBatch, setSelectedBatch] = useLocalStorageState(LS.batch, "");

  const [cronMetrics, setCronMetrics] = useState(() => getCronCache());
  const [cronLoading, setCronLoading] = useState(() => !getCronCache());
  const [cronError, setCronError] = useState("");

  const [dashboardSummary, setDashboardSummary] = useState(() => getSummaryCache("24h"));
  const [summaryLoading, setSummaryLoading] = useState(() => !getSummaryCache("24h"));
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadCron() {
      try {
        if (!getCronCache()) setCronLoading(true);
        setCronError("");
        const data = await fetchCronMetrics();
        setCronCache(data);
        if (alive) setCronMetrics(data);
      } catch (e) {
        if (alive) setCronError(String(e?.message || e));
      } finally {
        if (alive) setCronLoading(false);
      }
    }

    loadCron();
    const t = setInterval(loadCron, CRON_LIVE_REFRESH_MS);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const cached = getSummaryCache(range);

    if (cached) {
      setDashboardSummary(cached);
      setSummaryLoading(false);
    }

    async function loadSummary() {
      try {
        if (!cached) setSummaryLoading(true);
        setSummaryError("");
        const data = await fetchDashboardSummary(range);
        setSummaryCache(range, data);
        if (alive) setDashboardSummary(data);
      } catch (e) {
        if (alive) setSummaryError(String(e?.message || e));
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
  const rawSummaryBatches = Array.isArray(summaryData?.batches) ? summaryData.batches : [];

  const summaryBatches = useMemo(() => {
    return rawSummaryBatches.map((row, index) => normalizeDashboardBatchRow(row, index));
  }, [rawSummaryBatches]);

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

  const nextCycleLabel = getNextCollectionCycleLabel();
  const collectionScheduleText = getCollectionScheduleText();

  const cronJobs = [
    {
      id: 1,
      name: "Debit order cycle runner",
      schedule: "25th and 1st cycle schedule",
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

  const realMonthlyMRR =
    resolveRealMetric(summaryCards.monthlyMRR) ||
    resolveRealMetric(summaryCards.mrr) ||
    resolveRealMetric(summaryData.monthlyMRR) ||
    resolveRealMetric(summaryData.mrr);

  const realAnnualARR =
    resolveRealMetric(summaryCards.annualARR) ||
    resolveRealMetric(summaryCards.arr) ||
    resolveRealMetric(summaryData.annualARR) ||
    resolveRealMetric(summaryData.arr);

  const monthlyActive =
    resolveRealMetric(summaryCards.monthlyActive) ||
    resolveRealMetric(summaryData.monthlyActive) ||
    resolveRealMetric(summaryCards.activeMonthlySubscriptions) ||
    0;

  const annualActive =
    resolveRealMetric(summaryCards.annualActive) ||
    resolveRealMetric(summaryData.annualActive) ||
    resolveRealMetric(summaryCards.activeAnnualSubscriptions) ||
    0;

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
      monthlyActive,
      annualActive,
      monthlyMRR: realMonthlyMRR,
      annualARR: realAnnualARR,
      recentBatches: summaryBatches,
    };
  }, [summaryBatches, summaryCards, monthlyActive, annualActive, realMonthlyMRR, realAnnualARR]);

  const debitPerformanceData = useMemo(() => {
    return Array.isArray(summaryCharts?.debitPerformance) ? summaryCharts.debitPerformance : [];
  }, [summaryCharts]);

  const retryDistributionData = useMemo(() => {
    return Array.isArray(summaryCharts?.retryDistribution) ? summaryCharts.retryDistribution : [];
  }, [summaryCharts]);

  const filteredBatches = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return data.recentBatches;
    return data.recentBatches.filter(
      (b) =>
        safeStr(b.batch).toLowerCase().includes(q) ||
        safeStr(b.batchId).toLowerCase().includes(q) ||
        safeStr(b.status).toLowerCase().includes(q) ||
        String(safeNum(b.items)).includes(q) ||
        fmtDateShort(b.date).toLowerCase().includes(q)
    );
  }, [data.recentBatches, search]);

  useEffect(() => {
    if (!filteredBatches.length) return;
    const found = filteredBatches.some((b) => b.batch === selectedBatch || b.batchId === selectedBatch);
    if (!found) setSelectedBatch(filteredBatches[0].batchId || filteredBatches[0].batch);
  }, [filteredBatches, selectedBatch, setSelectedBatch]);

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

  function handleExportVisibleBatches() {
    const rows = filteredBatches.map((b) => ({
      batch: safeStr(b.batch),
      status: safeStr(b.status),
      items: safeNum(b.items),
      value: safeNum(b.value),
      date: safeStr(b.date || ""),
    }));

    exportRowsToCsv(`tabbytech-batches-${range}-${Date.now()}.csv`, rows);
  }

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
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .ttd-headerTools {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(12, 16, 33, 0.64);
      backdrop-filter: blur(12px);
      box-shadow: 0 12px 28px rgba(0,0,0,0.18);
      flex-wrap: wrap;
    }

    .ttd-headerFilter {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      color: #9ca3af;
    }

    .ttd-headerFilterIcon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #8b93a7;
      flex: 0 0 auto;
    }

    .ttd-headerFilterInput {
      width: 180px;
      background: transparent;
      border: none;
      outline: none;
      color: #d1d5db;
      font-size: 12px;
      font-weight: 600;
    }

    .ttd-headerFilterInput::placeholder {
      color: #6b7280;
    }

    .ttd-headerDivider {
      width: 1px;
      height: 22px;
      background: rgba(255,255,255,0.08);
      flex: 0 0 auto;
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
      white-space: nowrap;
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

    .ttd-gridBottomSingle {
      display: grid;
      grid-template-columns: 1fr;
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

    .ttd-opLabel {
      font-size: 12px;
      color: rgba(255,255,255,0.62);
      display: flex;
      align-items: center;
      gap: 8px;
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

    .ttd-financeCard {
      min-height: 0;
    }

    .ttd-financeValue {
      font-size: 24px;
      font-weight: 800;
      color: white;
      margin-bottom: 6px;
      letter-spacing: -0.02em;
      line-height: 1.05;
    }

    .ttd-financeValueMuted {
      color: #a1a1aa;
    }

    .ttd-financeSub {
      font-size: 12px;
      color: #9ca3af;
      margin-bottom: 10px;
    }

    .ttd-bottomStateNote {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 999px;
      background: rgba(249, 115, 22, 0.08);
      border: 1px solid rgba(249, 115, 22, 0.16);
      color: #fb923c;
      font-size: 11px;
      font-weight: 700;
    }

    .ttd-arrMrrStack {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      margin-bottom: 16px;
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
      .ttd-headerTools {
        width: 100%;
        justify-content: space-between;
      }
      .ttd-headerFilter {
        flex: 1 1 auto;
      }
      .ttd-headerFilterInput {
        width: 100%;
      }
    }
  `;

  return (
    <div className="ttd-root">
      <style>{css}</style>

      <header className="ttd-header">
        <div>
          <h2 className="ttd-title">Collection Cycle Overview</h2>
          <p className="ttd-subtitle">
            Debit order cycle dashboard for sign-ups, next collection windows, latest runs, exceptions, and finance visibility
            {overallLoading ? " • syncing..." : ""}
            {overallError ? " • error" : ""}
            {subView ? ` • ${String(subView)}` : ""}
            {metric ? ` • ${String(metric)}` : ""}
            {summaryData?.asOfDate ? ` • as of ${summaryData.asOfDate}` : ""}
            {` • ${nextCycleLabel}`}
          </p>
        </div>

        <div className="ttd-headerRight">
          <div className="ttd-headerTools">
            <div className="ttd-livePill">
              <span className="ttd-liveDot" />
              Cycle view
            </div>

            <div className="ttd-headerDivider" />

            <div className="ttd-headerFilter">
              <span className="ttd-headerFilterIcon">
                <IconSearch />
              </span>
              <input
                type="text"
                placeholder="Quick filter run history"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ttd-headerFilterInput"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="ttd-grid4">
        <MetricCard
          title="Cycle Pipeline Value"
          value={formatZAR(data.top.totalDebitOrderValue)}
          subtext={collectionScheduleText}
          trend={
            overallError
              ? "API Error"
              : overallLoading
              ? "Syncing"
              : nextCycleLabel
          }
          trendUp={!overallError}
          icon={IconFileInvoice}
          color="purple"
        />

        <MetricCard
          title="Latest Successful Collections"
          value={formatZAR(data.top.totalCollected)}
          subtext={`${safeNum(summaryCards.successfulToday)} successful items in current summary window`}
          trend={safeNum(summaryCards.successfulToday) > 0 ? "Latest run has successful collections" : "Awaiting next collection run"}
          trendUp={true}
          icon={IconCheckCircle}
          color="green"
        />

        <MetricCard
          title="Projected Settlement"
          value={formatZAR2(data.top.estimatedMoneyToBank)}
          subtext="Estimated money to bank after fees"
          trend={safeNum(data.top.estimatedMoneyToBank) > 0 ? "Settlement projection available" : "Projection updates after live collection runs"}
          trendUp={true}
          icon={IconWallet}
          color="blue"
        />

        <MetricCard
          title="Exceptions and Fees"
          value={formatZAR2(data.top.estimatedPaystackFees)}
          subtext={`Failed ${safeNum(summaryCards.failedToday)} • Retry ${safeNum(data.top.retryScheduled)}`}
          trend={safeNum(summaryCards.failedToday) > 0 || safeNum(data.top.retryScheduled) > 0 ? "Exception queue needs attention" : "Exception queue currently light"}
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
                <h3 className="ttd-panelTitle">Recent cycle performance</h3>
                <p className="ttd-panelSub">Use this to track the latest successful, failed, and retry movement across the selected cycle window</p>
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
                <h3 className="ttd-panelTitle">Retry pressure by cycle</h3>
                <p className="ttd-panelSub">Operational view of retry timing around your 25th and 1st collection windows</p>
              </div>
            </div>

            <div className="ttd-donutLayout">
              <DonutChart
                centerValue={safeNum(data.top.retryScheduled)}
                centerLabel="Retry queue"
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
                <h3 className="ttd-panelTitle">Current cycle activity</h3>
                <p className="ttd-panelSub">Snapshot of successful, failed, retry, and suspended activity inside the selected dashboard window</p>
              </div>
            </div>

            <div className="ttd-donutLayout">
              <DonutChart
                centerValue={safeNum(summaryCards.attemptedToday)}
                centerLabel="Cycle items"
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
                <h3 className="ttd-panelTitle">Cycle health and pressure</h3>
                <p className="ttd-panelSub">Fast finance view for latest run health, exception pressure, and collection quality</p>
              </div>
            </div>

            <div className="ttd-opGrid">
              <div className="ttd-opStat">
                <div className="ttd-opLabel">
                  <span className="ttd-miniDot" style={{ background: "#22c55e" }} />
                  Success rate
                </div>
                <div className="ttd-opValue">{safeNum(data.top.successRate).toFixed(0)}%</div>
                <div className="ttd-opSub">Based on the selected dashboard summary window</div>
              </div>

              <div className="ttd-opStat">
                <div className="ttd-opLabel">
                  <span className="ttd-miniDot" style={{ background: "#ef4444" }} />
                  Failure rate
                </div>
                <div className="ttd-opValue">{safeNum(data.top.failureRate).toFixed(0)}%</div>
                <div className="ttd-opSub">Tracks failed collection pressure</div>
              </div>

              <div className="ttd-opStat">
                <div className="ttd-opLabel">
                  <span className="ttd-miniDot" style={{ background: "#8b5cf6" }} />
                  Retry rate
                </div>
                <div className="ttd-opValue">{safeNum(data.top.retryRate).toFixed(0)}%</div>
                <div className="ttd-opSub">Indicates follow-up load between collection windows</div>
              </div>

              <div className="ttd-opStat">
                <div className="ttd-opLabel">
                  <span className="ttd-miniDot" style={{ background: "#60a5fa" }} />
                  Last run result
                </div>
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
                  <h3 className="ttd-panelTitle">Collection schedule monitor</h3>
                  <p className="ttd-panelSub">{cronError ? `API error: ${cronError}` : "Tracks the 25th and 1st debit order cycle runner"}</p>
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

        <div className="ttd-arrMrrStack">
          <Card className="ttd-card ttd-financeCard">
            <div className="ttd-panel">
              <div className="ttd-panelHeader">
                <div>
                  <h3 className="ttd-panelTitle">Monthly MRR</h3>
                  <p className="ttd-panelSub">Recurring monthly revenue view tied to active monthly subscriptions</p>
                </div>
              </div>

              <div className={cx("ttd-financeValue", !data.monthlyMRR && "ttd-financeValueMuted")}>
                {data.monthlyMRR ? formatZAR(data.monthlyMRR) : "Awaiting source"}
              </div>

              <div className="ttd-financeSub">
                Active {safeNum(data.monthlyActive)} • Retry pressure {safeNum(data.top.retryScheduled)}
              </div>

              {!data.monthlyMRR ? (
                <div className="ttd-bottomStateNote">No live MRR source exposed to dashboard yet</div>
              ) : null}
            </div>
          </Card>

          <Card className="ttd-card ttd-financeCard">
            <div className="ttd-panel">
              <div className="ttd-panelHeader">
                <div>
                  <h3 className="ttd-panelTitle">Annual ARR</h3>
                  <p className="ttd-panelSub">Recurring annual revenue view tied to active annual subscriptions</p>
                </div>
              </div>

              <div className={cx("ttd-financeValue", !data.annualARR && "ttd-financeValueMuted")}>
                {data.annualARR ? formatZAR(data.annualARR) : "Awaiting source"}
              </div>

              <div className="ttd-financeSub">
                View monthly • Active annual {safeNum(data.annualActive)}
              </div>

              {!data.annualARR ? (
                <div className="ttd-bottomStateNote">No live ARR source exposed to dashboard yet</div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <div className="ttd-gridBottomSingle">
        <Card className="ttd-card">
          <div className="ttd-panel">
            <div className="ttd-panelHeader">
              <div>
                <h3 className="ttd-panelTitle">Recent run history</h3>
                <p className="ttd-panelSub">Fast access to the latest debit order cycle runs and batch states</p>
              </div>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="ttd-select"
              >
                {filteredBatches.length ? (
                  filteredBatches.map((b) => (
                    <option key={b.key} value={b.batchId || b.batch}>
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
                    <th className="ttd-th">Run</th>
                    <th className="ttd-th">Status</th>
                    <th className="ttd-th" style={{ textAlign: "right" }}>Items</th>
                    <th className="ttd-th" style={{ textAlign: "right" }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map((b) => (
                    <tr
                      key={b.key}
                      className={cx(
                        "ttd-tr",
                        (selectedBatch === b.batch || selectedBatch === b.batchId) && "ttd-trSelected"
                      )}
                      onClick={() => setSelectedBatch(b.batchId || b.batch)}
                    >
                      <td className="ttd-td" style={{ fontWeight: 700 }}>{b.batch}</td>
                      <td className="ttd-td">
                        <StatusBadge status={safeStr(b.status).toLowerCase()}>
                          {safeStr(b.status) || "Pending"}
                        </StatusBadge>
                      </td>
                      <td className="ttd-td" style={{ textAlign: "right" }}>{safeNum(b.items)}</td>
                      <td className="ttd-td" style={{ textAlign: "right" }}>{formatZAR(b.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
              <button
                className="ttd-btn ttd-btnPrimary"
                onClick={handleExportVisibleBatches}
                disabled={!filteredBatches.length}
                style={{ maxWidth: "220px" }}
              >
                Export
              </button>
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
