// src/screens/NotificationMonitoring.jsx
import React, { useMemo } from "react";

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

export default function NotificationMonitoring() {
  const today = "UI-FIRST";
  const isLive = true;

  const kpis = {
    sentToday: 0,
    delivered: 0,
    opened: 0,
    failed: 0,
  };

  const deliveryDonut = useMemo(() => {
    return [
      { name: "Sent", value: 0, color: "#a78bfa" },
      { name: "Delivered", value: 0, color: "#10b981" },
      { name: "Failed", value: 0, color: "#ef4444" },
    ];
  }, []);

  const templateDonut = useMemo(() => {
    return [
      { name: "Subscription Confirmed", value: 0, color: "#a78bfa" },
      { name: "Payment Successful", value: 0, color: "#10b981" },
      { name: "Payment Failed", value: 0, color: "#f59e0b" },
      { name: "Service Suspended", value: 0, color: "#ef4444" },
      { name: "Pre-Debit Reminder 25th", value: 0, color: "#60a5fa" },
      { name: "Pre-Debit Reminder 1st", value: 0, color: "#8b5cf6" },
    ];
  }, []);

  const miniStatusList = useMemo(() => {
    return [
      { label: "Delivered", value: 0, pct: 0, color: "#10b981" },
      { label: "Opened", value: 0, pct: 0, color: "#60a5fa" },
      { label: "Pending", value: 0, pct: 0, color: "#f59e0b" },
      { label: "Failed", value: 0, pct: 0, color: "#ef4444" },
    ];
  }, []);

  const notificationRows = [];
  const failedRows = [];

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
            Premium email operations view for ZeptoMail delivery, opens, failures, and template usage
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
            {isLive ? "UI Ready" : "Offline"}
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
            title="Notification monitor mode"
          >
            {today}
          </div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <MetricCard
          title="Sent today"
          value={String(kpis.sentToday)}
          subtext="Emails queued or handed to ZeptoMail"
          trend="Ready to wire"
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
              <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Will track client, email, template, and send status from ZeptoMail flows</p>
            </div>

            <PremiumButton
              title="Export notification log to CSV"
              onClick={() => exportRowsToCsv("notification_log.csv", notificationRows, notificationColumns)}
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
                      No notification log data yet. Once we wire ZeptoMail logging, this will populate.
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
                      No failed notifications yet. This table will help prove whether an email sent or failed.
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
