// src/shell/DebitOrderMonitor.jsx
import React, { useEffect, useMemo, useState } from "react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function safeStr(v) {
  return String(v == null ? "" : v);
}

function fmtWhen(ts) {
  if (!ts) return "";
  const s = String(ts).trim();
  return s;
}

function exportRowsToCsv(filename, rows, columns) {
  const safe = (value) => {
    const s = String(value == null ? "" : value);
    const mustQuote = /[",\n\r]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return mustQuote ? `"${escaped}"` : escaped;
  };

  const header = columns.map((c) => safe(c.label)).join(",");
  const lines = rows.map((r) => columns.map((c) => safe(r?.[c.key])).join(","));
  const csv = [header, ...lines].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const IconList = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
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
    failed: { background: "rgba(239, 68, 68, 0.1)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.2)" },
    partial: { background: "rgba(249, 115, 22, 0.1)", color: "#fb923c", border: "1px solid rgba(249, 115, 22, 0.2)" },
    ok: { background: "rgba(34, 197, 94, 0.1)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.2)" },
    retry: { background: "rgba(139, 92, 246, 0.1)", color: "#a78bfa", border: "1px solid rgba(139, 92, 246, 0.2)" },
    pending: { background: "rgba(59, 130, 246, 0.1)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.2)" },
  };

  const badgeStyle = styles[status] || styles.pending;

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

function MetricCard({ title, value, subtext, trend, trendUp, icon, color = "purple" }) {
  const colorClasses = {
    purple: { gradient: "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.05))", text: "#a78bfa" },
    green: { gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.05))", text: "#4ade80" },
    orange: { gradient: "linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.05))", text: "#fb923c" },
    blue: { gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.05))", text: "#60a5fa" },
    red: { gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.05))", text: "#f87171" },
  };

  const colors = colorClasses[color] || colorClasses.purple;

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
        {icon}
      </div>

      <div style={{ position: "relative", zIndex: 10 }}>
        <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.5rem" }}>{title}</p>
        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem", letterSpacing: "-0.025em" }}>{value}</h3>
        <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{subtext}</p>

        {trend ? (
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
        ) : null}
      </div>
    </Card>
  );
}

function DonutChart({ data }) {
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const innerRadius = 50;

  const total = data.reduce((acc, item) => acc + Number(item.value || 0), 0) || 1;
  let currentAngle = 0;

  const polar = (r, deg) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  };

  const buildSlicePath = (startAngle, endAngle) => {
    const angle = endAngle - startAngle;
    const largeArc = angle > 180 ? 1 : 0;

    const pOuterStart = polar(radius, startAngle);
    const pOuterEnd = polar(radius, endAngle);
    const pInnerEnd = polar(innerRadius, endAngle);
    const pInnerStart = polar(innerRadius, startAngle);

    return [
      `M ${pInnerStart.x} ${pInnerStart.y}`,
      `L ${pOuterStart.x} ${pOuterStart.y}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${pOuterEnd.x} ${pOuterEnd.y}`,
      `L ${pInnerEnd.x} ${pInnerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${pInnerStart.x} ${pInnerStart.y}`,
      "Z",
    ].join(" ");
  };

  const createArc = (value, color, index) => {
    const v = Number(value || 0);
    if (v <= 0) return null;

    const angle = (v / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle += angle;

    // SVG arc cannot render a full 360 in one path.
    // Split full circle into two 180 degree slices.
    if (angle >= 359.999) {
      const mid = startAngle + 180;
      const p1 = buildSlicePath(startAngle, mid);
      const p2 = buildSlicePath(mid, endAngle);

      return (
        <g key={index}>
          <path d={p1} fill={color} stroke="#0a0a0f" strokeWidth="2" />
          <path d={p2} fill={color} stroke="#0a0a0f" strokeWidth="2" />
        </g>
      );
    }

    const path = buildSlicePath(startAngle, endAngle);
    return <path key={index} d={path} fill={color} stroke="#0a0a0f" strokeWidth="2" />;
  };

  const totalValue = data.reduce((acc, d) => acc + Number(d.value || 0), 0);

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
function PremiumButton({ children, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        padding: "0.5rem 1rem",
        borderRadius: "0.75rem",
        background: "linear-gradient(90deg, #8b5cf6, #7c3aed)",
        color: "white",
        fontSize: "0.75rem",
        fontWeight: 600,
        border: "none",
        cursor: "pointer",
        boxShadow: "0 4px 14px rgba(139, 92, 246, 0.3)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

/**
 * IMPORTANT FIX
 * Your Slate build is sometimes not injecting VITE_API_BASE_URL at runtime even if .env.production exists.
 * To reduce break risk, we fallback to the known API domain if the env var is missing.
 */
function getApiBase() {
  const envBase = String(import.meta?.env?.VITE_API_BASE_URL || "").trim();
  const winBase = String(window?.__TABBYTECH_API_BASE_URL || "").trim(); // optional future injection
  const hardDefault = "https://api.tabbytech.co.za";

  const base = (envBase || winBase || hardDefault).replace(/\/+$/, "");
  return base;
}

async function fetchDebitOrderMonitor() {
  const BASE = getApiBase();
  const url = `${BASE}/api/dashboard/debit-order-monitor`;

  const resp = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const ct = String(resp.headers.get("content-type") || "").toLowerCase();

  // If we accidentally got HTML, show a useful error immediately
  if (!ct.includes("application/json")) {
    const preview = await resp.text().catch(() => "");
    const head = preview.slice(0, 220).replace(/\s+/g, " ").trim();
    throw new Error(`Non-JSON response (${resp.status}). Check API base URL. Using: ${BASE}. Preview: ${head}`);
  }

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json?.ok) {
    throw new Error(json?.error || `Request failed ${resp.status}`);
  }
  return json;
}

export default function DebitOrderMonitor() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const d = await fetchDebitOrderMonitor();
        if (alive) setData(d);
      } catch (e) {
        if (alive) setError(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Your API response is: { ok: true, data: { today, crm, lastCron } }
  const api = data?.data || {};
  const today = api?.today || "";

  const crm = api?.crm || {};
  const statusMap = crm?.status || {};
  const lastCron = api?.lastCron || {};

  const dueToday = Number(crm?.dueTodayTotal || 0);
  const scheduled25th = Number(statusMap?.Scheduled || 0);
  const retryScheduled1st = Number(statusMap?.["Retry Scheduled"] || 0);
  const failed = Number(statusMap?.Failed || 0);

  const cronRuns = useMemo(() => {
    if (!lastCron || !lastCron.run_id) return [];
    const summary = lastCron?.summary || {};
    return [
      {
        started_at: safeStr(lastCron.started_at || ""),
        ended_at: safeStr(lastCron.ended_at || ""),
        result: safeStr(lastCron.run_status || ""),
        success_count: Number(summary?.success || 0),
        fail_count: Number(summary?.failed || 0),
        last_error: safeStr(lastCron.last_error || ""),
      },
    ];
  }, [lastCron]);

  // No attempts are returned by your current API response, so keep empty for now
  const attempts = [];

  const successToday = Number(lastCron?.summary?.success || 0);
  const failedToday = Number(lastCron?.summary?.failed || 0);
  const retryToday = 0;
  const pendingToday = Math.max(0, Number(lastCron?.summary?.attempted || 0) - successToday - failedToday);

  const kpis = {
    dueToday,
    scheduled25th,
    retryScheduled1st,
    failed,
  };

  const healthDonut = useMemo(() => {
    const ok = Number(successToday || 0);
    const failedN = Number(failedToday || 0);
    const retryN = Number(retryToday || 0);

    const total = ok + failedN + retryN;
    if (total <= 0) {
      return [
        { name: "Successful", value: 0, color: "#10b981" },
        { name: "Failed", value: 0, color: "#ef4444" },
        { name: "Scheduled retry queued", value: 0, color: "#8b5cf6" },
      ];
    }

    return [
      { name: "Successful", value: ok, color: "#10b981" },
      { name: "Failed", value: failedN, color: "#ef4444" },
      { name: "Scheduled retry queued", value: retryN, color: "#8b5cf6" },
    ];
  }, [failedToday, retryToday, successToday]);

  const scheduleDonut = useMemo(() => {
    const due = kpis.dueToday;
    const s25 = kpis.scheduled25th;
    const r1 = kpis.retryScheduled1st;
    const f = kpis.failed;

    const total = due + s25 + r1 + f;
    if (total <= 0) {
      return [
        { name: "Due today", value: 0, color: "#60a5fa" },
        { name: "25th scheduled", value: 0, color: "#a78bfa" },
        { name: "Retry 1st", value: 0, color: "#f59e0b" },
        { name: "Failed", value: 0, color: "#ef4444" },
      ];
    }

    return [
      { name: "Due today", value: due, color: "#60a5fa" },
      { name: "25th scheduled", value: s25, color: "#a78bfa" },
      { name: "Retry 1st", value: r1, color: "#f59e0b" },
      { name: "Failed", value: f, color: "#ef4444" },
    ];
  }, [kpis.dueToday, kpis.failed, kpis.retryScheduled1st, kpis.scheduled25th]);

  const attemptStatusMini = useMemo(() => {
    const by = {
      success: Number(successToday || 0),
      failed: Number(failedToday || 0),
      retry: Number(retryToday || 0),
      pending: Number(pendingToday || 0),
    };
    const total = Math.max(1, by.success + by.failed + by.retry + by.pending);

    return [
      { label: "Successful", value: by.success, pct: Math.round((by.success / total) * 100), color: "#10b981" },
      { label: "Failed", value: by.failed, pct: Math.round((by.failed / total) * 100), color: "#ef4444" },
      { label: "Scheduled retry queued", value: by.retry, pct: Math.round((by.retry / total) * 100), color: "#8b5cf6" },
      { label: "Pending", value: by.pending, pct: Math.round((by.pending / total) * 100), color: "#60a5fa" },
    ];
  }, [failedToday, pendingToday, retryToday, successToday]);

  const cronColumns = useMemo(
    () => [
      { key: "started_at", label: "Started at" },
      { key: "ended_at", label: "Ended at" },
      { key: "result", label: "Status" },
      { key: "success_count", label: "Success" },
      { key: "fail_count", label: "Failed" },
      { key: "last_error", label: "Last error" },
    ],
    []
  );

  const attemptsColumns = useMemo(
    () => [
      { key: "created_at", label: "Created at" },
      { key: "client_id", label: "Client id (CRM Record Id)" },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Attempt status" },
      { key: "attempt_key", label: "Attempt key" },
      { key: "error", label: "Error" },
    ],
    []
  );

  const isLive = !error && !!data?.ok;

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

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>

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
            Debit Order Monitor
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
            Live operational view for due, scheduled, retry, and failed
            {loading ? " • syncing..." : ""}
            {error ? " • error" : ""}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.375rem 0.75rem",
              borderRadius: "9999px",
              backgroundColor: isLive ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
              border: isLive ? "1px solid rgba(34, 197, 94, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
              color: isLive ? "#4ade80" : "#f87171",
              fontSize: "0.875rem",
            }}
          >
            <span
              className={isLive ? "animate-pulse" : ""}
              style={{
                width: "0.5rem",
                height: "0.5rem",
                backgroundColor: isLive ? "#22c55e" : "#ef4444",
                borderRadius: "50%",
              }}
            ></span>
            {isLive ? "Live" : "Degraded"}
          </div>

          <div
            style={{
              padding: "0.375rem 0.75rem",
              borderRadius: "9999px",
              backgroundColor: "rgba(18, 18, 31, 0.6)",
              border: "1px solid rgba(139, 92, 246, 0.2)",
              color: "#9ca3af",
              fontSize: "0.75rem",
              fontFamily: "monospace",
            }}
            title="Monitor date from API"
          >
            {today || "date unknown"}
          </div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <MetricCard
          title="Due today"
          value={String(kpis.dueToday)}
          subtext="Debit orders due for charge"
          trend={kpis.dueToday > 0 ? "Action required" : "Clear"}
          trendUp={kpis.dueToday === 0}
          icon={<IconClock />}
          color="blue"
        />

        <MetricCard
          title="Scheduled"
          value={String(kpis.scheduled25th)}
          subtext="Currently scheduled"
          trend={kpis.scheduled25th > 0 ? "Upcoming" : ""}
          trendUp={true}
          icon={<IconList />}
          color="purple"
        />

        <MetricCard
          title="Retry scheduled"
          value={String(kpis.retryScheduled1st)}
          subtext="Retry queue"
          trend={kpis.retryScheduled1st > 0 ? "Watchlist" : "Clear"}
          trendUp={kpis.retryScheduled1st === 0}
          icon={<IconClock />}
          color="orange"
        />

        <MetricCard
          title="Failed"
          value={String(kpis.failed)}
          subtext="Needs fix or retry"
          trend={kpis.failed > 0 ? "Critical" : "Clear"}
          trendUp={kpis.failed === 0}
          icon={<IconClock />}
          color="red"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <Card style={{ padding: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem" }}>Today health</h3>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1rem" }}>Successful vs failed vs scheduled retry</p>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <DonutChart data={healthDonut} />
          </div>

          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {healthDonut.map((item) => (
              <div key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", backgroundColor: item.color }}></div>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{item.name}</span>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "white" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem" }}>Schedule distribution</h3>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1rem" }}>Due, scheduled, retry, failed</p>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <DonutChart data={scheduleDonut} />
          </div>

          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {scheduleDonut.map((item) => (
              <div key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", backgroundColor: item.color }}></div>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{item.name}</span>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "white" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem" }}>Mini status list</h3>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1rem" }}>Snapshot from last cron summary</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {attemptStatusMini.map((s) => (
              <div
                key={s.label}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "rgba(18, 18, 31, 0.4)",
                  border: "1px solid rgba(139, 92, 246, 0.1)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", backgroundColor: s.color }}></div>
                    <span style={{ fontSize: "0.875rem", color: "white", fontWeight: 600 }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{s.value}</span>
                </div>

                <div style={{ height: "0.25rem", backgroundColor: "rgba(55, 65, 81, 0.5)", borderRadius: "9999px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(0, s.pct))}%`,
                      borderRadius: "9999px",
                      background: s.label === "Scheduled retry queued" ? "linear-gradient(90deg, #8b5cf6, #a78bfa)" : s.color,
                      transition: "all 0.5s ease",
                    }}
                  ></div>
                </div>

                <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#6b7280" }}>{s.pct}% of last cron activity</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <Card style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem" }}>Last Cron run</h3>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                From API lastCron
                {error ? ` • API error: ${error}` : ""}
              </p>
            </div>

            <PremiumButton title="Export Cron runs to CSV" onClick={() => exportRowsToCsv("cron_runs.csv", cronRuns, cronColumns)}>
              Export to Excel
            </PremiumButton>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: "0.75rem", color: "#6b7280", borderBottom: "1px solid rgba(139, 92, 246, 0.1)" }}>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Started</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Ended</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Status</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500, textAlign: "right" }}>OK</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500, textAlign: "right" }}>Fail</th>
                </tr>
              </thead>

              <tbody style={{ fontSize: "0.875rem" }}>
                {cronRuns.slice(0, 10).map((r, idx) => {
                  const result = safeStr(r?.result || "").toUpperCase();
                  let badge = "queued";
                  if (result === "RUNNING") badge = "running";
                  else if (result === "FAILED") badge = "failed";
                  else if (result === "PARTIAL") badge = "partial";
                  else if (result === "SUCCESS") badge = "ok";

                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid rgba(139, 92, 246, 0.05)" }}>
                      <td style={{ padding: "0.75rem 0", color: "white", fontWeight: 500, fontSize: "0.75rem" }}>{fmtWhen(r?.started_at) || "N/A"}</td>
                      <td style={{ padding: "0.75rem 0", color: "#9ca3af", fontSize: "0.75rem" }}>{fmtWhen(r?.ended_at) || "N/A"}</td>
                      <td style={{ padding: "0.75rem 0" }}>
                        <StatusBadge status={badge}>{result || "QUEUED"}</StatusBadge>
                      </td>
                      <td style={{ padding: "0.75rem 0", textAlign: "right", color: "white", fontWeight: 600 }}>{Number(r?.success_count || 0)}</td>
                      <td style={{ padding: "0.75rem 0", textAlign: "right", color: "white", fontWeight: 600 }}>{Number(r?.fail_count || 0)}</td>
                    </tr>
                  );
                })}

                {cronRuns.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "1rem 0", color: "#6b7280", fontSize: "0.75rem" }}>
                      No cron data yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem" }}>Recent charge attempts</h3>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Not wired in current API response</p>
            </div>

            <PremiumButton title="Export Attempts to CSV" onClick={() => exportRowsToCsv("charge_attempts_recent.csv", attempts, attemptsColumns)}>
              Export to Excel
            </PremiumButton>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: "0.75rem", color: "#6b7280", borderBottom: "1px solid rgba(139, 92, 246, 0.1)" }}>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Created</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Client id</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500, textAlign: "right" }}>Amount</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Status</th>
                </tr>
              </thead>

              <tbody style={{ fontSize: "0.875rem" }}>
                {attempts.slice(0, 10).map((a, idx) => {
                  const st = safeStr(a?.status || "").toLowerCase();
                  let badge = "pending";
                  if (st === "success" || st === "successful") badge = "ok";
                  else if (st === "failed") badge = "failed";
                  else if (st === "retry") badge = "retry";
                  else if (st === "queued" || st === "pending") badge = "queued";

                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid rgba(139, 92, 246, 0.05)" }}>
                      <td style={{ padding: "0.75rem 0", color: "#9ca3af", fontSize: "0.75rem" }}>{fmtWhen(a?.created_at) || "N/A"}</td>
                      <td style={{ padding: "0.75rem 0", color: "white", fontWeight: 600, fontSize: "0.75rem", fontFamily: "monospace" }}>
                        {safeStr(a?.client_id || a?.crm_client_id || "") || "N/A"}
                      </td>
                      <td style={{ padding: "0.75rem 0", textAlign: "right", color: "white", fontWeight: 600 }}>{safeStr(a?.amount || "0")}</td>
                      <td style={{ padding: "0.75rem 0" }}>
                        <StatusBadge status={badge}>{st ? st.toUpperCase() : "PENDING"}</StatusBadge>
                      </td>
                    </tr>
                  );
                })}

                {attempts.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "1rem 0", color: "#6b7280", fontSize: "0.75rem" }}>
                      No data yet. Once we add attempts to the API response, this will populate.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
