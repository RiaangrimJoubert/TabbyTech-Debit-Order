// src/shell/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";

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
    } catch {}
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

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

// Basic time helper for UI labels
function fmtWhen(ts) {
  if (!ts) return "";
  // Catalyst stored started_at like "YYYY-MM-DD HH:mm:ss" (UTC in your cron code)
  const s = String(ts).trim();
  if (!s) return "";
  return s;
}

// SVG Icons
const IconFileInvoice = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const IconCheckCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const IconRedo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"></polyline>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
  </svg>
);

const IconWallet = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
    <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
  </svg>
);

const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const IconEnvelope = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const IconArrowRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const IconExclamation = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const IconPaperPlane = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const IconAlert = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const IconClose = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const IconArrowUp = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>
);

const IconArrowDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <polyline points="19 12 12 19 5 12"></polyline>
  </svg>
);

// SVG Line Chart Component (still UI-only demo)
function LineChart({ data }) {
  const width = 600;
  const height = 250;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxValue = Math.max(...data.flatMap((d) => [d.successful, d.failed, d.retry]));
  const minValue = 0;

  const getX = (index) => padding + (index / (data.length - 1)) * chartWidth;
  const getY = (value) => padding + chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;

  const createPath = (key) => {
    return data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d[key])}`).join(" ");
  };

  const createArea = (key) => {
    const path = createPath(key);
    const closePath = `L ${getX(data.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;
    return <path d={`${path} ${closePath}`} fill={`url(#gradient-${key})`} opacity="0.2" />;
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="gradient-successful" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gradient-failed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gradient-retry" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={padding}
          y1={padding + (chartHeight * i) / 4}
          x2={width - padding}
          y2={padding + (chartHeight * i) / 4}
          stroke="rgba(139, 92, 246, 0.1)"
          strokeDasharray="3,3"
        />
      ))}

      {createArea("successful")}
      {createArea("failed")}
      {createArea("retry")}

      <path d={createPath("successful")} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d={createPath("failed")} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={createPath("retry")} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="5,5" strokeLinecap="round" strokeLinejoin="round" />

      {data.map((d, i) => (
        <g key={i}>
          <circle cx={getX(i)} cy={getY(d.successful)} r="4" fill="#10b981" stroke="#0a0a0f" strokeWidth="2" />
          <circle cx={getX(i)} cy={getY(d.failed)} r="3" fill="#ef4444" stroke="#0a0a0f" strokeWidth="2" />
          <circle cx={getX(i)} cy={getY(d.retry)} r="3" fill="#8b5cf6" stroke="#0a0a0f" strokeWidth="2" />
        </g>
      ))}

      {data.map((d, i) => (
        <text key={i} x={getX(i)} y={height - 10} textAnchor="middle" fill="#6b7280" fontSize="10">
          {d.time}
        </text>
      ))}
    </svg>
  );
}

// SVG Donut Chart Component (UI-only demo)
function DonutChart({ data }) {
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const innerRadius = 50;

  const total = data.reduce((acc, item) => acc + item.value, 0) || 1;
  let currentAngle = 0;

  const createArc = (value, color, index) => {
    const angle = (value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle += angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = [
      `M ${center + innerRadius * Math.cos(startRad)} ${center + innerRadius * Math.sin(startRad)}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${center + innerRadius * Math.cos(endRad)} ${center + innerRadius * Math.sin(endRad)}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${center + innerRadius * Math.cos(startRad)} ${center + innerRadius * Math.sin(startRad)}`,
      "Z",
    ].join(" ");

    return <path key={index} d={path} fill={color} stroke="#0a0a0f" strokeWidth="2" />;
  };

  const totalValue = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "12rem", height: "12rem", transform: "rotate(-90deg)" }}>
        {data.map((item, index) => createArc(item.value, item.color, index))}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontSize: "1.875rem", fontWeight: "bold", color: "white" }}>{totalValue}</div>
        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Total</div>
      </div>
    </div>
  );
}

// SVG Bar Chart Component (UI-only demo)
function BarChart({ data }) {
  const width = 400;
  const height = 150;
  const padding = 30;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = chartWidth / data.length / 3;
  const maxValue = Math.max(...data.flatMap((d) => [d.sent, d.opened])) || 1;

  const getX = (index, offset) => padding + (index * chartWidth) / data.length + offset * barWidth + barWidth / 2;
  const getY = (value) => padding + chartHeight - (value / maxValue) * chartHeight;
  const getHeight = (value) => (value / maxValue) * chartHeight;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "100%" }}>
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={padding}
          y1={padding + (chartHeight * i) / 3}
          x2={width - padding}
          y2={padding + (chartHeight * i) / 3}
          stroke="rgba(139, 92, 246, 0.1)"
          strokeDasharray="3,3"
        />
      ))}

      {data.map((d, i) => (
        <g key={i}>
          <rect x={getX(i, 0) - barWidth / 4} y={getY(d.sent)} width={barWidth / 2} height={getHeight(d.sent)} fill="rgba(139, 92, 246, 0.6)" rx="2" />
          <rect x={getX(i, 1) - barWidth / 4} y={getY(d.opened)} width={barWidth / 2} height={getHeight(d.opened)} fill="rgba(59, 130, 246, 0.6)" rx="2" />
        </g>
      ))}

      {data.map((d, i) => (
        <text key={i} x={getX(i, 0.5)} y={height - 5} textAnchor="middle" fill="#6b7280" fontSize="10">
          {d.day}
        </text>
      ))}
    </svg>
  );
}

function Card({ children, style = {}, glow = false }) {
  return (
    <div
      className={cx("glass-panel", glow && "glow-border")}
      style={{
        background: "linear-gradient(145deg, rgba(26, 26, 46, 0.4) 0%, rgba(18, 18, 31, 0.6) 100%)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(139, 92, 246, 0.15)",
        borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        transition: "all 0.3s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status, children }) {
  const styles = {
    running: { background: "rgba(34, 197, 94, 0.1)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.2)" },
    queued: { background: "rgba(234, 179, 8, 0.1)", color: "#facc15", border: "1px solid rgba(234, 179, 8, 0.2)" },
    active: { background: "rgba(34, 197, 94, 0.1)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.2)" },
    failed: { background: "rgba(239, 68, 68, 0.1)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.2)" },
    partial: { background: "rgba(249, 115, 22, 0.1)", color: "#fb923c", border: "1px solid rgba(249, 115, 22, 0.2)" },
    ok: { background: "rgba(34, 197, 94, 0.1)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.2)" },
    draft: { background: "rgba(139, 92, 246, 0.1)", color: "#a78bfa", border: "1px solid rgba(139, 92, 246, 0.2)" },
    exported: { background: "rgba(34, 197, 94, 0.1)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.2)" },
    sent: { background: "rgba(59, 130, 246, 0.1)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.2)" },
  };

  const badgeStyle = styles[status] || styles.draft;

  return (
    <span
      style={{
        padding: "0.25rem 0.75rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        ...badgeStyle,
      }}
    >
      {children}
    </span>
  );
}

function MetricCard({ title, value, subtext, trend, trendUp, icon: Icon, color = "purple" }) {
  const colorClasses = {
    purple: { gradient: "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.05))", text: "#a78bfa" },
    green: { gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.05))", text: "#4ade80" },
    orange: { gradient: "linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.05))", text: "#fb923c" },
    blue: { gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.05))", text: "#60a5fa" },
  };

  const colors = colorClasses[color];

  return (
    <Card style={{ position: "relative", overflow: "hidden", padding: "1.25rem" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          padding: "0.75rem",
          borderBottomLeftRadius: "1rem",
          background: colors.gradient,
          color: colors.text,
        }}
      >
        <Icon />
      </div>

      <div style={{ position: "relative", zIndex: 10 }}>
        <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.5rem" }}>{title}</p>
        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem", letterSpacing: "-0.025em" }}>{value}</h3>
        <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{subtext}</p>

        {trend && (
          <div
            style={{
              marginTop: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.75rem",
              color: trendUp ? "#4ade80" : "#f87171",
            }}
          >
            {trendUp ? <IconArrowUp /> : <IconArrowDown />}
            <span>{trend}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

async function fetchCronMetrics() {
  const resp = await fetch("/api/dashboard/cron-metrics", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json?.ok) {
    throw new Error(json?.error || `Request failed ${resp.status}`);
  }
  return json;
}

export default function Dashboard() {
  const [search, setSearch] = useLocalStorageState(LS.search, "");
  const [range, setRange] = useLocalStorageState(LS.range, "24h");
  const [subView] = useLocalStorageState(LS.subView, "monthly");
  const [metric] = useLocalStorageState(LS.metric, "revenue");
  const [selectedBatch, setSelectedBatch] = useLocalStorageState(LS.batch, "FEB-03-PM");

  const [cronMetrics, setCronMetrics] = useState(null);
  const [cronLoading, setCronLoading] = useState(true);
  const [cronError, setCronError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setCronLoading(true);
        setCronError("");
        const data = await fetchCronMetrics();
        if (alive) setCronMetrics(data);
      } catch (e) {
        if (alive) setCronError(String(e?.message || e));
      } finally {
        if (alive) setCronLoading(false);
      }
    }

    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const attemptsToday = cronMetrics?.attemptsToday || { attempted: 0, success: 0, failed: 0 };
  const lastRun = cronMetrics?.lastRun || null;

  // Cron status mapping
  const lastResult = String(lastRun?.result || "").toUpperCase();
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
      lastRun: lastRun?.started_at ? fmtWhen(lastRun.started_at) : "Not yet run",
      error: lastRun?.last_error ? String(lastRun.last_error) : "",
      progress:
        attemptsToday.attempted > 0
          ? Math.min(100, Math.round((attemptsToday.success / Math.max(1, attemptsToday.attempted)) * 100))
          : 0,
      queued: 0,
    },
  ];

  const data = useMemo(() => {
    return {
      top: {
        activeDebitOrders: 0,
        successToday: attemptsToday.success,
        failedToday: attemptsToday.failed,
        collectionsMTD: 0,
        scheduledTotal: 0,
      },
      monthlyActive: 86,
      annualActive: 19,
      monthlyMRR: 129900,
      annualARR: 228000,
      recentBatches: [
        { batch: "FEB-05-AM", status: "draft", items: 112 },
        { batch: "FEB-03-PM", status: "exported", items: 98 },
        { batch: "JAN-29-AM", status: "sent", items: 141 },
      ],
    };
  }, [attemptsToday.failed, attemptsToday.success]);

  const debitPerformanceData = [
    { time: "00:00", successful: 45, failed: 12, retry: 5 },
    { time: "04:00", successful: 52, failed: 8, retry: 3 },
    { time: "08:00", successful: 89, failed: 15, retry: 8 },
    { time: "12:00", successful: 134, failed: 22, retry: 12 },
    { time: "16:00", successful: 156, failed: 18, retry: 15 },
    { time: "20:00", successful: 178, failed: 14, retry: 19 },
    { time: "Now", successful: 192, failed: 11, retry: 23 },
  ];

  const retryDistributionData = [
    { name: "Immediate", value: 45, color: "#10b981" },
    { name: "24H Delay", value: 30, color: "#f59e0b" },
    { name: "48H+ Delay", value: 25, color: "#ef4444" },
  ];

  const emailData = [
    { day: "Mon", sent: 120, opened: 80 },
    { day: "Tue", sent: 190, opened: 120 },
    { day: "Wed", sent: 150, opened: 100 },
    { day: "Thu", sent: 220, opened: 140 },
    { day: "Fri", sent: 180, opened: 110 },
    { day: "Sat", sent: 90, opened: 50 },
    { day: "Sun", sent: 110, opened: 70 },
  ];

  const filteredBatches = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return data.recentBatches;
    return data.recentBatches.filter((b) => b.batch.toLowerCase().includes(q) || b.status.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <div
      style={{
        color: "#d1d5db",
        fontFamily: "'Montserrat', sans-serif",
        width: "100%",
        height: "100%",
        overflow: "auto",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');
        
        .cron-indicator {
          position: relative;
          overflow: hidden;
        }
        
        .cron-indicator::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent);
          animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
          100% { left: 100%; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          padding: "0 0.5rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem", letterSpacing: "-0.025em" }}>
            Dashboard Overview
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
            Real-time monitoring and analytics
            {cronLoading ? " • syncing..." : ""}
            {cronError ? " • error" : ""}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search orders, batches..."
              style={{
                backgroundColor: "rgba(18, 18, 31, 0.6)",
                border: "1px solid rgba(139, 92, 246, 0.2)",
                borderRadius: "0.75rem",
                padding: "0.5rem 1rem 0.5rem 2.5rem",
                fontSize: "0.875rem",
                color: "#d1d5db",
                width: "16rem",
                outline: "none",
              }}
            />
            <div style={{ position: "absolute", left: "0.875rem", top: "0.625rem", color: "#6b7280" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.375rem 0.75rem",
              borderRadius: "9999px",
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
              color: "#4ade80",
              fontSize: "0.875rem",
            }}
          >
            <span className="animate-pulse" style={{ width: "0.5rem", height: "0.5rem", backgroundColor: "#22c55e", borderRadius: "50%" }}></span>
            Live
          </div>
        </div>
      </header>

      {/* Top Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <MetricCard
          title="Attempts Today"
          value={String(attemptsToday.attempted || 0)}
          subtext={`Date: ${cronMetrics?.today || "unknown"}`}
          trend={cronError ? "API Error" : cronLoading ? "Syncing" : "Live"}
          trendUp={!cronError}
          icon={IconFileInvoice}
          color="purple"
        />

        <MetricCard
          title="Successful Today"
          value={String(attemptsToday.success || 0)}
          subtext="Paystack charges"
          trend={attemptsToday.success > 0 ? "OK" : ""}
          trendUp={true}
          icon={IconCheckCircle}
          color="green"
        />

        <MetricCard
          title="Failed Today"
          value={String(attemptsToday.failed || 0)}
          subtext={`Failed MTD: ${String(cronMetrics?.failedThisMonth || 0)}`}
          trend={attemptsToday.failed > 0 ? "Needs Attention" : ""}
          trendUp={false}
          icon={IconRedo}
          color="orange"
        />

        <MetricCard
          title="Last Cron Result"
          value={lastRun?.result ? String(lastRun.result) : "N/A"}
          subtext={lastRun?.started_at ? `Started: ${fmtWhen(lastRun.started_at)}` : "No run yet"}
          trend={lastRun?.last_error ? "Error" : ""}
          trendUp={!lastRun?.last_error}
          icon={IconWallet}
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <Card style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem" }}>Debit Order Performance</h3>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Success vs Failed vs Retry Schedule</p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {["24H", "7D", "30D"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r.toLowerCase())}
                  style={{
                    padding: "0.375rem 0.75rem",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: range === r.toLowerCase() ? "#8b5cf6" : "rgba(18, 18, 31, 0.6)",
                    color: range === r.toLowerCase() ? "white" : "#9ca3af",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: "250px" }}>
            <LineChart data={debitPerformanceData} />
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "0.75rem", height: "0.75rem", borderRadius: "50%", backgroundColor: "#10b981" }}></div>
              <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Successful</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "0.75rem", height: "0.75rem", borderRadius: "50%", backgroundColor: "#ef4444" }}></div>
              <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Failed</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "0.75rem", height: "0.75rem", borderRadius: "50%", backgroundColor: "#8b5cf6" }}></div>
              <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Scheduled Retry</span>
            </div>
          </div>
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem" }}>Retry Distribution</h3>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1rem" }}>Scheduled retry timeline</p>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <DonutChart data={retryDistributionData} />
          </div>

          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {retryDistributionData.map((item) => (
              <div key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", backgroundColor: item.color }}></div>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{item.name}</span>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "white" }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Cron & ZeptoMail Section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        {/* Cron Job Monitor */}
        <Card style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "rgba(139, 92, 246, 0.1)",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  color: "#a78bfa",
                }}
              >
                <IconClock />
              </div>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white" }}>Cron Job Monitor</h3>
                <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                  {cronError ? `API error: ${cronError}` : "Live from DataStore"}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {cronJobs.map((job) => (
              <div
                key={job.id}
                className="cron-indicator"
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: `1px solid ${
                    job.status === "failed" ? "rgba(239, 68, 68, 0.2)" : job.status === "partial" ? "rgba(249, 115, 22, 0.2)" : "rgba(139, 92, 246, 0.1)"
                  }`,
                  backgroundColor:
                    job.status === "failed"
                      ? "rgba(239, 68, 68, 0.05)"
                      : job.status === "partial"
                      ? "rgba(249, 115, 22, 0.05)"
                      : "rgba(18, 18, 31, 0.4)",
                  cursor: "default",
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        width: "0.5rem",
                        height: "0.5rem",
                        borderRadius: "50%",
                        backgroundColor: job.status === "running" || job.status === "ok" ? "#22c55e" : job.status === "queued" ? "#eab308" : job.status === "partial" ? "#f97316" : "#ef4444",
                        animation: job.status === "running" || job.status === "failed" ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none",
                      }}
                    ></div>
                    <div>
                      <p style={{ fontWeight: 600, color: "white", fontSize: "0.875rem" }}>{job.name}</p>
                      <p style={{ fontSize: "0.75rem", color: "#6b7280", fontFamily: "monospace" }}>{job.schedule}</p>
                    </div>
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

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.5rem" }}>
                  <span>Last run: {job.lastRun}</span>
                  <span style={{ color: job.status === "ok" ? "#4ade80" : job.status === "failed" ? "#f87171" : "#6b7280" }}>
                    {job.status === "ok" ? "OK" : job.status === "failed" ? "Needs Fix" : ""}
                  </span>
                </div>

                <div style={{ height: "0.25rem", backgroundColor: "rgba(55, 65, 81, 0.5)", borderRadius: "9999px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: "9999px",
                      transition: "all 0.5s ease",
                      width: `${job.progress}%`,
                      background: job.status === "failed" ? "#ef4444" : "linear-gradient(90deg, #8b5cf6, #a78bfa)",
                    }}
                  ></div>
                </div>

                {job.error ? (
                  <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#f87171", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <IconExclamation />
                    {job.error}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        {/* ZeptoMail Tracker (still UI-only until we wire Zepto) */}
        <Card style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  color: "#60a5fa",
                }}
              >
                <IconEnvelope />
              </div>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white" }}>ZeptoMail Tracker</h3>
                <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>UI-only until we wire Zepto Mail</p>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{ textAlign: "center", padding: "0.75rem", borderRadius: "0.75rem", backgroundColor: "rgba(18, 18, 31, 0.4)", border: "1px solid rgba(139, 92, 246, 0.1)" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem" }}>0</div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Sent</div>
            </div>
            <div style={{ textAlign: "center", padding: "0.75rem", borderRadius: "0.75rem", backgroundColor: "rgba(34, 197, 94, 0.05)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#4ade80", marginBottom: "0.25rem" }}>0%</div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Delivered</div>
            </div>
            <div style={{ textAlign: "center", padding: "0.75rem", borderRadius: "0.75rem", backgroundColor: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#60a5fa", marginBottom: "0.25rem" }}>0%</div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Opened</div>
            </div>
          </div>

          <div style={{ height: "120px" }}>
            <BarChart data={emailData} />
          </div>

          <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.625rem", borderRadius: "0.5rem", backgroundColor: "rgba(18, 18, 31, 0.3)", border: "1px solid rgba(139, 92, 246, 0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", backgroundColor: "rgba(139, 92, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconPaperPlane />
                </div>
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "white" }}>Debit Order Confirmations</p>
                  <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Not wired yet</p>
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#9ca3af", backgroundColor: "rgba(55, 65, 81, 0.2)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem" }}>Pending</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.625rem", borderRadius: "0.5rem", backgroundColor: "rgba(18, 18, 31, 0.3)", border: "1px solid rgba(139, 92, 246, 0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", backgroundColor: "rgba(249, 115, 22, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconAlert />
                </div>
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "white" }}>Failed Payment Alerts</p>
                  <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Not wired yet</p>
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#9ca3af", backgroundColor: "rgba(55, 65, 81, 0.2)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem" }}>Pending</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.625rem", borderRadius: "0.5rem", backgroundColor: "rgba(18, 18, 31, 0.3)", border: "1px solid rgba(139, 92, 246, 0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", backgroundColor: "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconClose />
                </div>
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "white" }}>Retry Notifications</p>
                  <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Not wired yet</p>
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#9ca3af", backgroundColor: "rgba(55, 65, 81, 0.2)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem" }}>Pending</span>
            </div>
          </div>
        </Card>
      </div>

      {/* The rest of your original layout stays unchanged */}
      {/* Original TabbyTech Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
        {/* Today's Workflow */}
        <Card style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white" }}>Today's Workflow</h3>
            <select
              style={{
                backgroundColor: "rgba(18, 18, 31, 0.6)",
                border: "1px solid rgba(139, 92, 246, 0.2)",
                borderRadius: "0.75rem",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                color: "#d1d5db",
              }}
            >
              <option>Subscription tracking</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem",
                borderRadius: "0.75rem",
                backgroundColor: "rgba(18, 18, 31, 0.4)",
                border: "1px solid rgba(139, 92, 246, 0.1)",
              }}
            >
              <div>
                <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "white", marginBottom: "0.25rem" }}>Review exceptions</h4>
                <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Prioritise failed deductions and follow ups</p>
              </div>
              <button
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "rgba(26, 26, 46, 0.8)",
                  color: "white",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  cursor: "pointer",
                }}
              >
                Open
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem",
                borderRadius: "0.75rem",
                backgroundColor: "rgba(18, 18, 31, 0.4)",
                border: "1px solid rgba(139, 92, 246, 0.1)",
              }}
            >
              <div>
                <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "white", marginBottom: "0.25rem" }}>Prepare next batch</h4>
                <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Validate and queue debit orders for the next run</p>
              </div>
              <button
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.75rem",
                  background: "linear-gradient(90deg, #8b5cf6, #7c3aed)",
                  color: "white",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(139, 92, 246, 0.3)",
                }}
              >
                Start
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem",
                borderRadius: "0.75rem",
                backgroundColor: "rgba(18, 18, 31, 0.4)",
                border: "1px solid rgba(139, 92, 246, 0.1)",
              }}
            >
              <div>
                <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "white", marginBottom: "0.25rem" }}>Export bank files</h4>
                <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Generate bank ready exports from approved batches</p>
              </div>
              <button
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "rgba(26, 26, 46, 0.8)",
                  color: "white",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  cursor: "pointer",
                }}
              >
                Export
              </button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(139, 92, 246, 0.1)", paddingTop: "1rem" }}>
            <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "white", marginBottom: "0.5rem" }}>Subscription tracking</h4>
            <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.75rem" }}>
              This is a UI-only layer for now. Later we will sync this from Zoho CRM or Zoho Subscriptions and lock down edits to reduce risk.
            </p>
          </div>
        </Card>

        {/* Recent Batches */}
        <Card style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white" }}>Recent Batches</h3>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              style={{
                backgroundColor: "rgba(18, 18, 31, 0.6)",
                border: "1px solid rgba(139, 92, 246, 0.2)",
                borderRadius: "0.75rem",
                padding: "0.375rem 0.75rem",
                fontSize: "0.75rem",
                color: "#d1d5db",
              }}
            >
              {data.recentBatches.map((b) => (
                <option key={b.batch} value={b.batch}>
                  {b.batch}
                </option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: "0.75rem", color: "#6b7280", borderBottom: "1px solid rgba(139, 92, 246, 0.1)" }}>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Batch</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Status</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500, textAlign: "right" }}>Items</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "0.875rem" }}>
                {filteredBatches.map((b) => (
                  <tr
                    key={b.batch}
                    style={{
                      borderBottom: "1px solid rgba(139, 92, 246, 0.05)",
                      cursor: "pointer",
                      backgroundColor: selectedBatch === b.batch ? "rgba(139, 92, 246, 0.05)" : "transparent",
                    }}
                    onClick={() => setSelectedBatch(b.batch)}
                  >
                    <td style={{ padding: "0.75rem 0", color: "white", fontWeight: 500, fontSize: "0.75rem" }}>{b.batch}</td>
                    <td style={{ padding: "0.75rem 0" }}>
                      <StatusBadge status={b.status}>{b.status.charAt(0).toUpperCase() + b.status.slice(1)}</StatusBadge>
                    </td>
                    <td style={{ padding: "0.75rem 0", textAlign: "right", color: "white", fontWeight: 500 }}>{b.items}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: "0.75rem", backgroundColor: "rgba(18, 18, 31, 0.3)", border: "1px solid rgba(139, 92, 246, 0.1)" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "white", marginBottom: "0.25rem" }}>Selected: {selectedBatch}</p>
            <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.75rem" }}>UI-only actions. Will wire to batch workflows later.</p>

            <div style={{ marginBottom: "0.75rem" }}>
              <input
                type="text"
                placeholder="Type to filter batches"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "rgba(10, 10, 15, 0.6)",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.75rem",
                  color: "#d1d5db",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "rgba(26, 26, 46, 0.8)",
                  color: "white",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  cursor: "pointer",
                }}
              >
                View
              </button>
              <button
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "#8b5cf6",
                  color: "white",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Export
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
        <Card style={{ padding: "1.25rem" }}>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.5rem" }}>Monthly MRR</p>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem" }}>{formatZAR(data.monthlyMRR)}</h3>
          <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Active {data.monthlyActive} • Churn 7d: 2</p>
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.5rem" }}>Annual ARR</p>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem" }}>
            {formatZAR(data.annualARR * 12 + data.monthlyMRR * 12)}
          </h3>
          <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>View monthly • 11 only</p>
        </Card>
      </div>
    </div>
  );
}
