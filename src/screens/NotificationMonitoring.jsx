import React, { useEffect, useMemo, useState } from "react";

const NOTIFICATION_MONITOR_CACHE_TTL_MS = 5 * 60 * 1000;

let notificationMonitorCache = {
  today: "LIVE",
  kpis: {
    sentToday: 0,
    delivered: 0,
    opened: 0,
    failed: 0,
    queued: 0,
  },
  notificationRows: [],
  failedRows: [],
  byTemplate: [],
  error: "",
  lastLoadedAt: 0,
};

function hasFreshNotificationMonitorCache() {
  return (
    (Array.isArray(notificationMonitorCache.notificationRows) &&
      notificationMonitorCache.notificationRows.length > 0) ||
    (Array.isArray(notificationMonitorCache.byTemplate) &&
      notificationMonitorCache.byTemplate.length > 0)
  ) && Date.now() - Number(notificationMonitorCache.lastLoadedAt || 0) < NOTIFICATION_MONITOR_CACHE_TTL_MS;
}

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function safeStr(v) {
  return String(v == null ? "" : v);
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

function buildApiUrl(path) {
  const base = String(import.meta.env.VITE_API_BASE_URL || "https://api.tabbytech.co.za")
    .trim()
    .replace(/\/+$/, "");
  const cleanPath = String(path || "").trim();
  return `${base}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
}

function normalizeTemplateName(name) {
  const v = String(name || "").trim().toLowerCase();

  if (v === "pre-debit reminder (25th)" || v === "pre-debit reminder 25th") return "Pre-Debit Reminder 25th";
  if (v === "pre-debit reminder (1st)" || v === "pre-debit reminder 1st") return "Pre-Debit Reminder 1st";
  if (v === "payment successful") return "Payment Successful";
  if (v === "payment failed") return "Payment Failed";
  if (v === "service suspended") return "Service Suspended";
  if (v === "subscription confirmed") return "Subscription Confirmed";

  return String(name || "").trim() || "Other";
}

function readTemplateCount(byTemplate, label) {
  const wanted = String(label || "").trim().toLowerCase();
  const row = Array.isArray(byTemplate)
    ? byTemplate.find((item) => String(item?.template_name || "").trim().toLowerCase() === wanted)
    : null;
  const n = Number(row?.count || 0);
  return Number.isFinite(n) ? n : 0;
}

function mapTodayStatus(todayStatus) {
  const sent = Number(todayStatus?.SENT || 0);
  const failed = Number(todayStatus?.FAILED || 0);
  const queued = Number(todayStatus?.QUEUED || 0);
  const delivered = sent;
  const opened = 0;

  return {
    sentToday: sent + queued,
    delivered,
    opened,
    failed,
    queued,
  };
}

const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"></path>
  </svg>
);

const IconOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const IconAlert = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
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
    sent: { background: "rgba(139, 92, 246, 0.1)", color: "#a78bfa", border: "1px solid rgba(139, 92, 246, 0.2)" },
    delivered: { background: "rgba(34, 197, 94, 0.1)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.2)" },
    opened: { background: "rgba(59, 130, 246, 0.1)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.2)" },
    failed: { background: "rgba(239, 68, 68, 0.1)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.2)" },
    pending: { background: "rgba(234, 179, 8, 0.1)", color: "#facc15", border: "1px solid rgba(234, 179, 8, 0.2)" },
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

function PremiumButton({ children, onClick, title, disabled = false }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.5rem 1rem",
        borderRadius: "0.75rem",
        background: "linear-gradient(90deg, #8b5cf6, #7c3aed)",
        color: "white",
        fontSize: "0.75rem",
        fontWeight: 600,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
        boxShadow: "0 4px 14px rgba(139, 92, 246, 0.3)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export default function NotificationMonitoring() {
  const [loading, setLoading] = useState(() => !hasFreshNotificationMonitorCache());
  const [error, setError] = useState(() => safeStr(notificationMonitorCache.error));
  const [today, setToday] = useState(() => safeStr(notificationMonitorCache.today || "LIVE"));
  const [kpis, setKpis] = useState(() => ({
    sentToday: Number(notificationMonitorCache.kpis?.sentToday || 0),
    delivered: Number(notificationMonitorCache.kpis?.delivered || 0),
    opened: Number(notificationMonitorCache.kpis?.opened || 0),
    failed: Number(notificationMonitorCache.kpis?.failed || 0),
    queued: Number(notificationMonitorCache.kpis?.queued || 0),
  }));
  const [notificationRows, setNotificationRows] = useState(() =>
    Array.isArray(notificationMonitorCache.notificationRows) ? notificationMonitorCache.notificationRows : []
  );
  const [failedRows, setFailedRows] = useState(() =>
    Array.isArray(notificationMonitorCache.failedRows) ? notificationMonitorCache.failedRows : []
  );
  const [byTemplate, setByTemplate] = useState(() =>
    Array.isArray(notificationMonitorCache.byTemplate) ? notificationMonitorCache.byTemplate : []
  );

  useEffect(() => {
    notificationMonitorCache = {
      ...notificationMonitorCache,
      today,
      kpis,
      notificationRows,
      failedRows,
      byTemplate,
      error,
      lastLoadedAt: notificationMonitorCache.lastLoadedAt,
    };
  }, [today, kpis, notificationRows, failedRows, byTemplate, error]);

  useEffect(() => {
    let active = true;

    async function loadNotificationMonitor({ force = false } = {}) {
      if (!force && hasFreshNotificationMonitorCache()) {
        if (!active) return;
        setToday(safeStr(notificationMonitorCache.today || "LIVE"));
        setKpis({
          sentToday: Number(notificationMonitorCache.kpis?.sentToday || 0),
          delivered: Number(notificationMonitorCache.kpis?.delivered || 0),
          opened: Number(notificationMonitorCache.kpis?.opened || 0),
          failed: Number(notificationMonitorCache.kpis?.failed || 0),
          queued: Number(notificationMonitorCache.kpis?.queued || 0),
        });
        setByTemplate(Array.isArray(notificationMonitorCache.byTemplate) ? notificationMonitorCache.byTemplate : []);
        setNotificationRows(Array.isArray(notificationMonitorCache.notificationRows) ? notificationMonitorCache.notificationRows : []);
        setFailedRows(Array.isArray(notificationMonitorCache.failedRows) ? notificationMonitorCache.failedRows : []);
        setError(safeStr(notificationMonitorCache.error));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await fetch(buildApiUrl("/api/dashboard/notification-monitor"), {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json?.ok) {
          throw new Error(String(json?.error || `Request failed (${res.status})`));
        }

        const data = json?.data || {};
        const todayStatus = data?.todayStatus || {};
        const latest = Array.isArray(data?.latest) ? data.latest : [];
        const templates = Array.isArray(data?.byTemplate) ? data.byTemplate : [];

        const mappedKpis = mapTodayStatus(todayStatus);

        const mappedRows = latest.map((row) => ({
          created_at: safeStr(row?.created_at || row?.sent_at || ""),
          client_id: safeStr(row?.related_id || ""),
          email: safeStr(row?.recipient_email || ""),
          template_name: normalizeTemplateName(row?.template_name || ""),
          status: safeStr(row?.status || ""),
          failure_reason: safeStr(row?.error_message || ""),
          related_type: safeStr(row?.related_type || ""),
          provider: safeStr(row?.provider || ""),
          provider_message_id: safeStr(row?.provider_message_id || ""),
          reference: safeStr(row?.reference || ""),
        }));

        const mappedFailedRows = mappedRows.filter((row) => String(row?.status || "").trim().toLowerCase() === "failed");

        if (!active) return;

        const nextToday = safeStr(data?.today || "LIVE");

        setToday(nextToday);
        setKpis(mappedKpis);
        setByTemplate(templates);
        setNotificationRows(mappedRows);
        setFailedRows(mappedFailedRows);

        notificationMonitorCache = {
          ...notificationMonitorCache,
          today: nextToday,
          kpis: mappedKpis,
          byTemplate: templates,
          notificationRows: mappedRows,
          failedRows: mappedFailedRows,
          error: "",
          lastLoadedAt: Date.now(),
        };
      } catch (e) {
        if (!active) return;
        const nextError = String(e?.message || e);
        setError(nextError);

        notificationMonitorCache = {
          ...notificationMonitorCache,
          error: nextError,
          lastLoadedAt: 0,
        };
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }

    loadNotificationMonitor({ force: false });

    return () => {
      active = false;
    };
  }, []);

  async function syncNow() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(buildApiUrl("/api/dashboard/notification-monitor"), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(String(json?.error || `Request failed (${res.status})`));
      }

      const data = json?.data || {};
      const todayStatus = data?.todayStatus || {};
      const latest = Array.isArray(data?.latest) ? data.latest : [];
      const templates = Array.isArray(data?.byTemplate) ? data.byTemplate : [];

      const mappedKpis = mapTodayStatus(todayStatus);

      const mappedRows = latest.map((row) => ({
        created_at: safeStr(row?.created_at || row?.sent_at || ""),
        client_id: safeStr(row?.related_id || ""),
        email: safeStr(row?.recipient_email || ""),
        template_name: normalizeTemplateName(row?.template_name || ""),
        status: safeStr(row?.status || ""),
        failure_reason: safeStr(row?.error_message || ""),
        related_type: safeStr(row?.related_type || ""),
        provider: safeStr(row?.provider || ""),
        provider_message_id: safeStr(row?.provider_message_id || ""),
        reference: safeStr(row?.reference || ""),
      }));

      const mappedFailedRows = mappedRows.filter((row) => String(row?.status || "").trim().toLowerCase() === "failed");
      const nextToday = safeStr(data?.today || "LIVE");

      setToday(nextToday);
      setKpis(mappedKpis);
      setByTemplate(templates);
      setNotificationRows(mappedRows);
      setFailedRows(mappedFailedRows);

      notificationMonitorCache = {
        ...notificationMonitorCache,
        today: nextToday,
        kpis: mappedKpis,
        byTemplate: templates,
        notificationRows: mappedRows,
        failedRows: mappedFailedRows,
        error: "",
        lastLoadedAt: Date.now(),
      };
    } catch (e) {
      const nextError = String(e?.message || e);
      setError(nextError);

      notificationMonitorCache = {
        ...notificationMonitorCache,
        error: nextError,
        lastLoadedAt: 0,
      };
    } finally {
      setLoading(false);
    }
  }

  const isLive = !error;

  const deliveryDonut = useMemo(() => {
    return [
      { name: "Sent", value: Number(kpis.sentToday || 0), color: "#a78bfa" },
      { name: "Delivered", value: Number(kpis.delivered || 0), color: "#10b981" },
      { name: "Failed", value: Number(kpis.failed || 0), color: "#ef4444" },
    ];
  }, [kpis]);

  const templateDonut = useMemo(() => {
    return [
      { name: "Subscription Confirmed", value: readTemplateCount(byTemplate, "Subscription Confirmed"), color: "#a78bfa" },
      { name: "Payment Successful", value: readTemplateCount(byTemplate, "Payment Successful"), color: "#10b981" },
      { name: "Payment Failed", value: readTemplateCount(byTemplate, "Payment Failed"), color: "#f59e0b" },
      { name: "Service Suspended", value: readTemplateCount(byTemplate, "Service Suspended"), color: "#ef4444" },
      { name: "Pre-Debit Reminder 25th", value: readTemplateCount(byTemplate, "Pre-Debit Reminder (25th)"), color: "#60a5fa" },
      { name: "Pre-Debit Reminder 1st", value: readTemplateCount(byTemplate, "Pre-Debit Reminder (1st)"), color: "#8b5cf6" },
    ];
  }, [byTemplate]);

  const miniStatusList = useMemo(() => {
    const total = Number(kpis.sentToday || 0) + Number(kpis.opened || 0) + Number(kpis.queued || 0) + Number(kpis.failed || 0);

    const pct = (value) => {
      if (!total) return 0;
      return Math.round((Number(value || 0) / total) * 100);
    };

    return [
      { label: "Delivered", value: Number(kpis.delivered || 0), pct: pct(kpis.delivered), color: "#10b981" },
      { label: "Opened", value: Number(kpis.opened || 0), pct: pct(kpis.opened), color: "#60a5fa" },
      { label: "Pending", value: Number(kpis.queued || 0), pct: pct(kpis.queued), color: "#f59e0b" },
      { label: "Failed", value: Number(kpis.failed || 0), pct: pct(kpis.failed), color: "#ef4444" },
    ];
  }, [kpis]);

  const notificationColumns = useMemo(
    () => [
      { key: "created_at", label: "Created at" },
      { key: "client_id", label: "Client id (CRM Record Id)" },
      { key: "email", label: "Email" },
      { key: "template_name", label: "Template" },
      { key: "status", label: "Status" },
    ],
    []
  );

  const failedColumns = useMemo(
    () => [
      { key: "created_at", label: "Created at" },
      { key: "client_id", label: "Client id (CRM Record Id)" },
      { key: "email", label: "Email" },
      { key: "template_name", label: "Template" },
      { key: "failure_reason", label: "Failure reason" },
    ],
    []
  );

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
            Notification Monitoring
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
            Operation view for ZeptoMail delivery, opens, failures, and template usage
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <PremiumButton title="Refresh notification monitor" onClick={syncNow} disabled={loading}>
            {loading ? "Syncing..." : "Sync now"}
          </PremiumButton>

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
              className={isLive && !loading ? "animate-pulse" : ""}
              style={{
                width: "0.5rem",
                height: "0.5rem",
                backgroundColor: isLive ? "#22c55e" : "#ef4444",
                borderRadius: "50%",
              }}
            ></span>
            {loading ? "Loading" : isLive ? "Live" : "Offline"}
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
            title="Notification monitor date"
          >
            {today}
          </div>
        </div>
      </header>

      {error ? (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.875rem 1rem",
            borderRadius: "0.875rem",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.18)",
            color: "#fca5a5",
            fontSize: "0.875rem",
          }}
        >
          Failed to load notification monitor: {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <MetricCard
          title="Sent today"
          value={String(kpis.sentToday)}
          subtext="Emails queued or handed to ZeptoMail"
          trend={loading ? "Loading..." : "Live data"}
          trendUp={true}
          icon={<IconMail />}
          color="purple"
        />

        <MetricCard
          title="Delivered"
          value={String(kpis.delivered)}
          subtext="Accepted delivery events"
          trend=""
          trendUp={true}
          icon={<IconCheck />}
          color="green"
        />

        <MetricCard
          title="Opened"
          value={String(kpis.opened)}
          subtext="Tracked email opens"
          trend=""
          trendUp={true}
          icon={<IconOpen />}
          color="blue"
        />

        <MetricCard
          title="Failed"
          value={String(kpis.failed)}
          subtext="Bounce, reject, or send failure"
          trend={kpis.failed > 0 ? "Needs attention" : "Clear"}
          trendUp={kpis.failed === 0}
          icon={<IconAlert />}
          color="red"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <Card style={{ padding: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem" }}>Delivery distribution</h3>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1rem" }}>Sent vs delivered vs failed</p>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <DonutChart data={deliveryDonut} />
          </div>

          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {deliveryDonut.map((item) => (
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
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem" }}>Template distribution</h3>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1rem" }}>Email template usage across TabbyPay flows</p>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <DonutChart data={templateDonut} />
          </div>

          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {templateDonut.map((item) => (
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
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1rem" }}>Snapshot of notification pipeline health</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {miniStatusList.map((s) => (
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
                      background: s.color,
                      transition: "all 0.5s ease",
                    }}
                  ></div>
                </div>

                <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#6b7280" }}>{s.pct}% of notification activity</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <Card style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem" }}>Recent notification log</h3>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Tracks client, email, template, and send status from ZeptoMail flows</p>
            </div>

            <PremiumButton
              title="Export notification log to CSV"
              onClick={() => exportRowsToCsv("notification_log.csv", notificationRows, notificationColumns)}
              disabled={notificationRows.length === 0}
            >
              Export to Excel
            </PremiumButton>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: "0.75rem", color: "#6b7280", borderBottom: "1px solid rgba(139, 92, 246, 0.1)" }}>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Created</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Client id</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Email</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Template</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Status</th>
                </tr>
              </thead>

              <tbody style={{ fontSize: "0.875rem" }}>
                {notificationRows.slice(0, 10).map((row, idx) => {
                  const st = safeStr(row?.status || "").toLowerCase();
                  let badge = "pending";
                  if (st === "sent") badge = "sent";
                  else if (st === "delivered") badge = "delivered";
                  else if (st === "opened") badge = "opened";
                  else if (st === "failed") badge = "failed";

                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid rgba(139, 92, 246, 0.05)" }}>
                      <td style={{ padding: "0.75rem 0", color: "#9ca3af", fontSize: "0.75rem" }}>{safeStr(row?.created_at || "") || "N/A"}</td>
                      <td style={{ padding: "0.75rem 0", color: "white", fontWeight: 600, fontSize: "0.75rem", fontFamily: "monospace" }}>
                        {safeStr(row?.client_id || "") || "N/A"}
                      </td>
                      <td style={{ padding: "0.75rem 0", color: "white", fontSize: "0.75rem" }}>{safeStr(row?.email || "") || "N/A"}</td>
                      <td style={{ padding: "0.75rem 0", color: "#9ca3af", fontSize: "0.75rem" }}>{safeStr(row?.template_name || "") || "N/A"}</td>
                      <td style={{ padding: "0.75rem 0" }}>
                        <StatusBadge status={badge}>{st ? st.toUpperCase() : "PENDING"}</StatusBadge>
                      </td>
                    </tr>
                  );
                })}

                {notificationRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "1rem 0", color: "#6b7280", fontSize: "0.75rem" }}>
                      {loading ? "Loading notification log..." : "No notification log data yet."}
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
              <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem" }}>Failed notifications</h3>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Useful when clients say they never received an email</p>
            </div>

            <PremiumButton
              title="Export failed notifications to CSV"
              onClick={() => exportRowsToCsv("failed_notifications.csv", failedRows, failedColumns)}
              disabled={failedRows.length === 0}
            >
              Export to Excel
            </PremiumButton>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: "0.75rem", color: "#6b7280", borderBottom: "1px solid rgba(139, 92, 246, 0.1)" }}>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Created</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Client id</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Email</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Template</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Reason</th>
                </tr>
              </thead>

              <tbody style={{ fontSize: "0.875rem" }}>
                {failedRows.slice(0, 10).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid rgba(139, 92, 246, 0.05)" }}>
                    <td style={{ padding: "0.75rem 0", color: "#9ca3af", fontSize: "0.75rem" }}>{safeStr(row?.created_at || "") || "N/A"}</td>
                    <td style={{ padding: "0.75rem 0", color: "white", fontWeight: 600, fontSize: "0.75rem", fontFamily: "monospace" }}>
                      {safeStr(row?.client_id || "") || "N/A"}
                    </td>
                    <td style={{ padding: "0.75rem 0", color: "white", fontSize: "0.75rem" }}>{safeStr(row?.email || "") || "N/A"}</td>
                    <td style={{ padding: "0.75rem 0", color: "#9ca3af", fontSize: "0.75rem" }}>{safeStr(row?.template_name || "") || "N/A"}</td>
                    <td style={{ padding: "0.75rem 0", color: "#f87171", fontSize: "0.75rem" }}>{safeStr(row?.failure_reason || "") || "N/A"}</td>
                  </tr>
                ))}

                {failedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "1rem 0", color: "#6b7280", fontSize: "0.75rem" }}>
                      {loading ? "Loading failed notifications..." : "No failed notifications yet."}
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
