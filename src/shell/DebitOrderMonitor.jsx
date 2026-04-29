import React, { useEffect, useMemo, useRef, useState } from "react";
import { request } from "../api";

const DEBIT_ORDER_MONITOR_CACHE_TTL_MS = 10 * 60 * 1000;
const ATTEMPTS_PER_PAGE = 10;
const CRON_PER_PAGE = 10;

let debitOrderMonitorCache = {
  summaryData: null,
  attemptsData: null,
  cronData: null,
  error: "",
  startDate: "",
  endDate: "",
  lastLoadedAt: 0,
};

function todayYmdLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfMonthYmdLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

function hasFreshDebitOrderMonitorCache(startDate, endDate) {
  return (
    !!debitOrderMonitorCache.summaryData &&
    !!debitOrderMonitorCache.attemptsData &&
    debitOrderMonitorCache.startDate === String(startDate || "") &&
    debitOrderMonitorCache.endDate === String(endDate || "") &&
    Date.now() - Number(debitOrderMonitorCache.lastLoadedAt || 0) <
      DEBIT_ORDER_MONITOR_CACHE_TTL_MS
  );
}

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function safeStr(v) {
  return String(v == null ? "" : v).trim();
}

function safeNum(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function fmtWhen(ts) {
  return safeStr(ts) || "N/A";
}

function fmtDate(v) {
  if (!v) return "Not supplied";
  const d = new Date(String(v).length <= 10 ? `${v}T00:00:00` : v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function fmtDateTime(v) {
  if (!v) return "Not supplied";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPickerMonth(date) {
  return date.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });
}

function toYmd(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseYmdLocal(value) {
  if (!value) return null;
  const s = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    function onDown(e) {
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;
      handler();
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [ref, handler]);
}

function useWindowWidth() {
  const [width, setWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1440
  );

  useEffect(() => {
    function onResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width;
}

function normalizeOutcome(status) {
  const s = String(status || "").trim().toUpperCase();
  if (s === "SUCCESS") return "Successful";
  if (s === "FAILED") return "Failed";
  if (s === "INITIATED") return "Pending";
  if (s === "RETRY" || s === "RETRY SCHEDULED") return "Retry Scheduled";
  if (s === "SUSPENDED") return "Suspended";
  if (s === "PAID") return "Successful";
  return s ? s[0] + s.slice(1).toLowerCase() : "Pending";
}

function PremiumDatePicker({ value, onChange, ariaLabel }) {
  const wrapRef = useRef(null);
  const parsedValue = parseYmdLocal(value) || new Date();
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(
    () => new Date(parsedValue.getFullYear(), parsedValue.getMonth(), 1)
  );

  useEffect(() => {
    const next = parseYmdLocal(value);
    if (!next) return;
    setViewDate(new Date(next.getFullYear(), next.getMonth(), 1));
  }, [value]);

  useOnClickOutside(wrapRef, () => setOpen(false));

  const selectedYmd = value || "";
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({ type: "empty", key: `e-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dt = new Date(year, month, day);
    const ymd = toYmd(dt);
    cells.push({
      type: "day",
      key: ymd,
      ymd,
      label: day,
      isSelected: ymd === selectedYmd,
      isToday: ymd === todayYmdLocal(),
    });
  }

  function selectDate(ymd) {
    onChange(ymd);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="tdm-datePickerWrap">
      <button
        type="button"
        className={open ? "tdm-dateInput tdm-dateInputOpen" : "tdm-dateInput"}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((x) => !x)}
      >
        <span>{value || "Select date"}</span>
        <span className="tdm-dateCaret">▾</span>
      </button>

      {open && (
        <div className="tdm-datePopup" role="dialog" aria-label={ariaLabel}>
          <div className="tdm-datePopupHead">
            <button
              type="button"
              className="tdm-dateNavBtn"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              aria-label="Previous month"
            >
              ‹
            </button>

            <div className="tdm-dateMonthLabel">
              {formatPickerMonth(viewDate)}
            </div>

            <button
              type="button"
              className="tdm-dateNavBtn"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="tdm-dateWeekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="tdm-dateWeekday">
                {d}
              </div>
            ))}
          </div>

          <div className="tdm-dateGrid">
            {cells.map((cell) => {
              if (cell.type === "empty") {
                return (
                  <div
                    key={cell.key}
                    className="tdm-dateCell tdm-dateCellEmpty"
                  />
                );
              }

              const cls = [
                "tdm-dateCell",
                "tdm-dateCellDay",
                cell.isSelected ? "tdm-dateCellSelected" : "",
                cell.isToday ? "tdm-dateCellToday" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={cell.key}
                  type="button"
                  className={cls}
                  onClick={() => selectDate(cell.ymd)}
                >
                  {cell.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const IconList = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

const IconArrowUp = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>
);

const IconArrowDown = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <polyline points="19 12 12 19 5 12"></polyline>
  </svg>
);

function Card({ children, style = {}, glow = false }) {
  return (
    <div
      className={cx("glass-panel", glow && "glow-border")}
      style={{
        background:
          "linear-gradient(145deg, rgba(26, 26, 46, 0.4) 0%, rgba(18, 18, 31, 0.6) 100%)",
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
    running: {
      background: "rgba(34, 197, 94, 0.1)",
      color: "#4ade80",
      border: "1px solid rgba(34, 197, 94, 0.2)",
    },
    queued: {
      background: "rgba(234, 179, 8, 0.1)",
      color: "#facc15",
      border: "1px solid rgba(234, 179, 8, 0.2)",
    },
    failed: {
      background: "rgba(239, 68, 68, 0.1)",
      color: "#f87171",
      border: "1px solid rgba(239, 68, 68, 0.2)",
    },
    partial: {
      background: "rgba(249, 115, 22, 0.1)",
      color: "#fb923c",
      border: "1px solid rgba(249, 115, 22, 0.2)",
    },
    ok: {
      background: "rgba(34, 197, 94, 0.1)",
      color: "#4ade80",
      border: "1px solid rgba(34, 197, 94, 0.2)",
    },
    retry: {
      background: "rgba(139, 92, 246, 0.1)",
      color: "#a78bfa",
      border: "1px solid rgba(139, 92, 246, 0.2)",
    },
    pending: {
      background: "rgba(59, 130, 246, 0.1)",
      color: "#60a5fa",
      border: "1px solid rgba(59, 130, 246, 0.2)",
    },
    suspended: {
      background: "rgba(107, 114, 128, 0.14)",
      color: "#d1d5db",
      border: "1px solid rgba(107, 114, 128, 0.2)",
    },
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

function MetricCard({
  title,
  value,
  subtext,
  trend,
  trendUp,
  icon,
  color = "purple",
}) {
  const colorClasses = {
    purple: {
      gradient:
        "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.05))",
      text: "#a78bfa",
    },
    green: {
      gradient:
        "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.05))",
      text: "#4ade80",
    },
    orange: {
      gradient:
        "linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.05))",
      text: "#fb923c",
    },
    blue: {
      gradient:
        "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.05))",
      text: "#60a5fa",
    },
    red: {
      gradient:
        "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.05))",
      text: "#f87171",
    },
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
        <p
          style={{
            fontSize: "0.875rem",
            color: "#9ca3af",
            marginBottom: "0.5rem",
          }}
        >
          {title}
        </p>
        <h3
          style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "white",
            marginBottom: "0.25rem",
            letterSpacing: "-0.025em",
          }}
        >
          {value}
        </h3>
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
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: "12rem", height: "12rem", transform: "rotate(-90deg)" }}
      >
        {data.map((item, index) => createArc(item.value, item.color, index))}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <div style={{ fontSize: "1.875rem", fontWeight: "bold", color: "white" }}>
          {totalValue}
        </div>
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

async function fetchJson(path) {
  return request(path, { method: "GET" });
}

async function fetchDebitOrderMonitorData({ startDate, endDate }) {
  const summaryQs = new URLSearchParams({
    startDate,
    endDate,
  });

  const attemptsQs = new URLSearchParams({
    startDate,
    endDate,
    page: "1",
    perPage: "300",
  });

  const [summaryJson, attemptsJson, cronJson] = await Promise.all([
    fetchJson(`/api/reports/summary?${summaryQs.toString()}`),
    fetchJson(`/api/reports/attempts?${attemptsQs.toString()}`),
    fetchJson(`/api/dashboard/cron-metrics`),
  ]);

  return { summaryJson, attemptsJson, cronJson };
}

export default function DebitOrderMonitor() {
  const windowWidth = useWindowWidth();
  const isXL = windowWidth >= 1500;
  const isDesktop = windowWidth >= 1200;
  const isTablet = windowWidth >= 768 && windowWidth < 1200;
  const isMobile = windowWidth < 768;

  const kpiGridColumns = isXL
    ? "repeat(4, 1fr)"
    : isDesktop
    ? "repeat(2, 1fr)"
    : "1fr";

  const middleGridColumns = isXL
    ? "1.25fr 1fr 1fr"
    : isDesktop
    ? "1fr 1fr"
    : "1fr";

  const bottomGridColumns = isDesktop ? "1fr 1fr" : "1fr";

  const [startDate, setStartDate] = useState(
    () => debitOrderMonitorCache.startDate || startOfMonthYmdLocal()
  );
  const [endDate, setEndDate] = useState(
    () => debitOrderMonitorCache.endDate || todayYmdLocal()
  );
  const [loading, setLoading] = useState(
    () => !hasFreshDebitOrderMonitorCache(startOfMonthYmdLocal(), todayYmdLocal())
  );
  const [error, setError] = useState(() => safeStr(debitOrderMonitorCache.error));
  const [summaryData, setSummaryData] = useState(
    () => debitOrderMonitorCache.summaryData || null
  );
  const [attemptsData, setAttemptsData] = useState(
    () => debitOrderMonitorCache.attemptsData || null
  );
  const [cronData, setCronData] = useState(
    () => debitOrderMonitorCache.cronData || null
  );
  const [attemptsPage, setAttemptsPage] = useState(1);
  const [cronPage, setCronPage] = useState(1);

  useEffect(() => {
    debitOrderMonitorCache = {
      ...debitOrderMonitorCache,
      summaryData,
      attemptsData,
      cronData,
      error,
      startDate,
      endDate,
      lastLoadedAt: debitOrderMonitorCache.lastLoadedAt,
    };
  }, [summaryData, attemptsData, cronData, error, startDate, endDate]);

  useEffect(() => {
    setAttemptsPage(1);
  }, [startDate, endDate]);

  useEffect(() => {
    setCronPage(1);
  }, [cronData]);

  useEffect(() => {
    let alive = true;

    async function load({ force = false } = {}) {
      if (!force && hasFreshDebitOrderMonitorCache(startDate, endDate)) {
        if (!alive) return;
        setSummaryData(debitOrderMonitorCache.summaryData || null);
        setAttemptsData(debitOrderMonitorCache.attemptsData || null);
        setCronData(debitOrderMonitorCache.cronData || null);
        setError(safeStr(debitOrderMonitorCache.error));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const { summaryJson, attemptsJson, cronJson } =
          await fetchDebitOrderMonitorData({ startDate, endDate });
        if (!alive) return;

        setSummaryData(summaryJson);
        setAttemptsData(attemptsJson);
        setCronData(cronJson);

        debitOrderMonitorCache = {
          ...debitOrderMonitorCache,
          summaryData: summaryJson,
          attemptsData: attemptsJson,
          cronData: cronJson,
          error: "",
          startDate,
          endDate,
          lastLoadedAt: Date.now(),
        };
      } catch (e) {
        if (!alive) return;
        const nextError = String(e?.message || e);
        setError(nextError);

        debitOrderMonitorCache = {
          ...debitOrderMonitorCache,
          error: nextError,
          startDate,
          endDate,
          lastLoadedAt: 0,
        };
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load({ force: false });

    return () => {
      alive = false;
    };
  }, [startDate, endDate]);

  async function syncNow() {
    try {
      setLoading(true);
      setError("");
      const { summaryJson, attemptsJson, cronJson } =
        await fetchDebitOrderMonitorData({ startDate, endDate });

      setSummaryData(summaryJson);
      setAttemptsData(attemptsJson);
      setCronData(cronJson);

      debitOrderMonitorCache = {
        ...debitOrderMonitorCache,
        summaryData: summaryJson,
        attemptsData: attemptsJson,
        cronData: cronJson,
        error: "",
        startDate,
        endDate,
        lastLoadedAt: Date.now(),
      };
    } catch (e) {
      const nextError = String(e?.message || e);
      setError(nextError);

      debitOrderMonitorCache = {
        ...debitOrderMonitorCache,
        error: nextError,
        startDate,
        endDate,
        lastLoadedAt: 0,
      };
    } finally {
      setLoading(false);
    }
  }

  async function applyRange() {
    if (safeStr(startDate) && safeStr(endDate) && startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }
    await syncNow();
  }

  const summaryPayload = summaryData?.data || {};
  const cards = summaryPayload?.cards || {};
  const filters = summaryPayload?.filters || {};

  const attemptsRowsRaw = Array.isArray(attemptsData?.data?.attempts?.rows)
    ? attemptsData.data.attempts.rows
    : Array.isArray(attemptsData?.rows)
    ? attemptsData.rows
    : [];

  const attemptsRows = useMemo(() => {
    return attemptsRowsRaw.map((row, index) => ({
      id: row.rowId || `attempt-${index + 1}`,
      clientId: safeStr(row.clientId),
      clientName: safeStr(
        row.clientName ||
          row.client_name ||
          row.name ||
          row.client?.name ||
          row.crmName
      ),
      chargeDate: safeStr(row.chargeDate),
      chargeDay: safeNum(row.chargeDay),
      status: safeStr(row.status),
      outcome: normalizeOutcome(row.outcome || row.status),
      reference: safeStr(row.reference),
      failureReason: safeStr(row.failureReason),
      attemptedAt: safeStr(row.attemptedAt),
      amountZar: safeNum(row.amountZar),
    }));
  }, [attemptsRowsRaw]);

  const successCount = useMemo(
    () => attemptsRows.filter((row) => row.outcome === "Successful").length,
    [attemptsRows]
  );

  const failedCount = useMemo(
    () => attemptsRows.filter((row) => row.outcome === "Failed").length,
    [attemptsRows]
  );

  const retryCount = useMemo(
    () => attemptsRows.filter((row) => row.outcome === "Retry Scheduled").length,
    [attemptsRows]
  );

  const suspendedCount = useMemo(
    () => attemptsRows.filter((row) => row.outcome === "Suspended").length,
    [attemptsRows]
  );

  const pendingCount = useMemo(
    () => attemptsRows.filter((row) => row.outcome === "Pending").length,
    [attemptsRows]
  );

  const totalAttempts = safeNum(cards.processedAttempts || attemptsRows.length);

  const dueInRange = totalAttempts;
  const scheduled25th = useMemo(
    () => attemptsRows.filter((row) => safeNum(row.chargeDay) === 25).length,
    [attemptsRows]
  );
  const retryScheduled = retryCount;
  const failed = failedCount;

  const cronPayload = cronData || {};
  const cronLatestRuns = Array.isArray(cronPayload?.latestRuns)
    ? cronPayload.latestRuns
    : [];
  const attemptsTodayFromCron = cronPayload?.attemptsToday || {};

  const cronRuns = useMemo(() => {
    return cronLatestRuns.map((run, index) => {
      const summary = run?.summary || {};
      const successCountFromRun =
        safeNum(summary?.success) ||
        (index === 0
          ? safeNum(attemptsTodayFromCron?.SUCCESS || attemptsTodayFromCron?.success)
          : 0);

      const failCountFromRun =
        safeNum(summary?.failed) ||
        (index === 0
          ? safeNum(attemptsTodayFromCron?.FAILED || attemptsTodayFromCron?.failed)
          : 0);

      return {
        started_at: safeStr(run?.startedAt),
        ended_at: safeStr(run?.endedAt),
        result: safeStr(run?.runStatus),
        success_count: successCountFromRun,
        fail_count: failCountFromRun,
        last_error: safeStr(run?.lastError),
      };
    });
  }, [cronLatestRuns, attemptsTodayFromCron]);

  const recentAttempts = useMemo(() => {
    return attemptsRows
      .slice()
      .sort((a, b) =>
        String(b.attemptedAt || "").localeCompare(String(a.attemptedAt || ""))
      )
      .map((row) => ({
        created_at: row.attemptedAt,
        client_id: row.clientId,
        amount: row.amountZar,
        status: row.outcome || row.status,
        attempt_key: row.reference,
        error: row.failureReason,
      }));
  }, [attemptsRows]);

  const attemptsPageCount = Math.max(
    1,
    Math.ceil(recentAttempts.length / ATTEMPTS_PER_PAGE)
  );
  const currentAttemptsPage = Math.min(attemptsPage, attemptsPageCount);

  const pagedRecentAttempts = useMemo(() => {
    const start = (currentAttemptsPage - 1) * ATTEMPTS_PER_PAGE;
    return recentAttempts.slice(start, start + ATTEMPTS_PER_PAGE);
  }, [recentAttempts, currentAttemptsPage]);

  const cronPageCount = Math.max(1, Math.ceil(cronRuns.length / CRON_PER_PAGE));
  const currentCronPage = Math.min(cronPage, cronPageCount);

  const pagedCronRuns = useMemo(() => {
    const start = (currentCronPage - 1) * CRON_PER_PAGE;
    return cronRuns.slice(start, start + CRON_PER_PAGE);
  }, [cronRuns, currentCronPage]);

  const kpis = {
    dueInRange,
    scheduled25th,
    retryScheduled,
    failed,
  };

  const healthDonut = useMemo(() => {
    const total =
      successCount + failedCount + retryCount + pendingCount + suspendedCount;
    if (total <= 0) {
      return [
        { name: "Successful", value: 0, color: "#10b981" },
        { name: "Failed", value: 0, color: "#ef4444" },
        { name: "Scheduled retry queued", value: 0, color: "#8b5cf6" },
        { name: "Pending", value: 0, color: "#60a5fa" },
      ];
    }

    return [
      { name: "Successful", value: successCount, color: "#10b981" },
      { name: "Failed", value: failedCount, color: "#ef4444" },
      { name: "Scheduled retry queued", value: retryCount, color: "#8b5cf6" },
      { name: "Pending", value: pendingCount + suspendedCount, color: "#60a5fa" },
    ];
  }, [failedCount, pendingCount, retryCount, successCount, suspendedCount]);

  const scheduleDonut = useMemo(() => {
    const due = kpis.dueInRange;
    const s25 = kpis.scheduled25th;
    const r1 = kpis.retryScheduled;
    const f = kpis.failed;

    const total = due + s25 + r1 + f;
    if (total <= 0) {
      return [
        { name: "Due in range", value: 0, color: "#60a5fa" },
        { name: "25th scheduled", value: 0, color: "#a78bfa" },
        { name: "Retry scheduled", value: 0, color: "#f59e0b" },
        { name: "Failed", value: 0, color: "#ef4444" },
      ];
    }

    return [
      { name: "Due in range", value: due, color: "#60a5fa" },
      { name: "25th scheduled", value: s25, color: "#a78bfa" },
      { name: "Retry scheduled", value: r1, color: "#f59e0b" },
      { name: "Failed", value: f, color: "#ef4444" },
    ];
  }, [kpis.dueInRange, kpis.failed, kpis.retryScheduled, kpis.scheduled25th]);

  const attemptStatusMini = useMemo(() => {
    const by = {
      success: successCount,
      failed: failedCount,
      retry: retryCount,
      pending: pendingCount + suspendedCount,
    };
    const total = Math.max(1, by.success + by.failed + by.retry + by.pending);

    return [
      {
        label: "Successful",
        value: by.success,
        pct: Math.round((by.success / total) * 100),
        color: "#10b981",
      },
      {
        label: "Failed",
        value: by.failed,
        pct: Math.round((by.failed / total) * 100),
        color: "#ef4444",
      },
      {
        label: "Scheduled retry queued",
        value: by.retry,
        pct: Math.round((by.retry / total) * 100),
        color: "#8b5cf6",
      },
      {
        label: "Pending",
        value: by.pending,
        pct: Math.round((by.pending / total) * 100),
        color: "#60a5fa",
      },
    ];
  }, [failedCount, pendingCount, retryCount, successCount, suspendedCount]);

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

  const isLive =
    !error && (!!summaryData?.ok || !!attemptsData?.ok || !!cronData?.ok);

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

        .tdm-datePickerWrap { position: relative; }

        .tdm-dateInput {
          height: 40px;
          min-width: 160px;
          border-radius: 12px;
          border: 1px solid rgba(168,85,247,0.65);
          background:
            linear-gradient(135deg, rgba(168,85,247,0.18), rgba(124,58,237,0.18)),
            rgba(0,0,0,0.45);
          color: rgba(255,255,255,0.96);
          padding: 0 12px;
          font-size: 13px;
          font-weight: 800;
          outline: none;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 10px 24px rgba(124,58,237,0.12);
          cursor: pointer;
          user-select: none;
        }

        .tdm-dateInput:hover {
          border-color: rgba(168,85,247,0.90);
          box-shadow: 0 12px 28px rgba(124,58,237,0.22);
          transform: translateY(-1px);
        }

        .tdm-dateInputOpen {
          border-color: rgba(168,85,247,0.95);
          box-shadow:
            0 0 0 4px rgba(124,58,237,0.20),
            0 16px 34px rgba(124,58,237,0.26);
        }

        .tdm-dateCaret { opacity: 0.96; font-size: 12px; }

        .tdm-datePopup {
          position: absolute;
          top: 46px;
          right: 0;
          width: 292px;
          border-radius: 16px;
          border: 1px solid rgba(168,85,247,0.38);
          background: linear-gradient(180deg, rgba(18,12,36,0.96) 0%, rgba(11,10,22,0.96) 100%);
          box-shadow: 0 24px 56px rgba(0,0,0,0.46);
          backdrop-filter: blur(16px);
          padding: 12px;
          z-index: 80;
          animation: tdmDatePopIn 140ms ease-out;
        }

        @keyframes tdmDatePopIn {
          from { opacity: 0; transform: translateY(6px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .tdm-datePopupHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }

        .tdm-dateMonthLabel {
          font-size: 13px;
          font-weight: 900;
          color: rgba(255,255,255,0.94);
          letter-spacing: 0.15px;
        }

        .tdm-dateNavBtn {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: 1px solid rgba(168,85,247,0.28);
          background: rgba(124,58,237,0.16);
          color: rgba(255,255,255,0.96);
          font-size: 18px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .tdm-dateNavBtn:hover {
          background: rgba(168,85,247,0.26);
          border-color: rgba(168,85,247,0.50);
        }

        .tdm-dateWeekdays,
        .tdm-dateGrid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
        }

        .tdm-dateWeekdays { margin-bottom: 6px; }

        .tdm-dateWeekday {
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          color: rgba(255,255,255,0.50);
        }

        .tdm-dateCell {
          min-height: 34px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
        }

        .tdm-dateCellEmpty {
          pointer-events: none;
          opacity: 0;
        }

        .tdm-dateCellDay {
          color: rgba(255,255,255,0.90);
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .tdm-dateCellDay:hover {
          background: rgba(168,85,247,0.18);
          border-color: rgba(168,85,247,0.26);
        }

        .tdm-dateCellToday {
          border-color: rgba(168,85,247,0.42);
          box-shadow: inset 0 0 0 1px rgba(168,85,247,0.12);
        }

        .tdm-dateCellSelected {
          background: linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95));
          border-color: rgba(168,85,247,0.80);
          color: #fff;
          box-shadow: 0 10px 22px rgba(124,58,237,0.28);
        }

        .tdm-pageRow {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .tdm-pageBtn {
          height: 34px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(124,58,237,0.55);
          background: linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95));
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.2px;
          min-width: 74px;
          box-shadow: 0 12px 28px rgba(124,58,237,0.26);
          transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
        }

        .tdm-pageBtn:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 32px rgba(124,58,237,0.32);
        }

        .tdm-pageBtn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .tdm-pageText {
          font-size: 12px;
          color: rgba(255,255,255,0.58);
          font-weight: 700;
        }
      `}</style>

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-start",
          marginBottom: "1.5rem",
          padding: "0 0.5rem",
          gap: "1rem",
          flexWrap: "wrap",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              fontSize: isMobile ? "1.25rem" : "1.5rem",
              fontWeight: "bold",
              color: "white",
              marginBottom: "0.25rem",
              letterSpacing: "-0.025em",
            }}
          >
            Debit Order Monitor
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
            Period-aware operational view for debit activity, retry pressure, failures, and cron health
            {loading ? " • syncing..." : ""}
            {error ? " • error" : ""}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: isMobile ? "stretch" : "end",
            gap: "0.75rem",
            flexWrap: "wrap",
            justifyContent: isMobile ? "stretch" : "flex-end",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "rgba(255,255,255,0.62)",
              }}
            >
              Start date
            </span>
            <PremiumDatePicker
              value={startDate}
              onChange={setStartDate}
              ariaLabel="Start date"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "rgba(255,255,255,0.62)",
              }}
            >
              End date
            </span>
            <PremiumDatePicker
              value={endDate}
              onChange={setEndDate}
              ariaLabel="End date"
            />
          </div>

          <PremiumButton
            title="Apply date range to debit order monitor"
            onClick={applyRange}
            disabled={loading}
          >
            Apply range
          </PremiumButton>

          <PremiumButton
            title="Refresh debit order monitor"
            onClick={syncNow}
            disabled={loading}
          >
            {loading ? "Syncing..." : "Sync now"}
          </PremiumButton>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.375rem 0.75rem",
              borderRadius: "9999px",
              backgroundColor: isLive
                ? "rgba(34, 197, 94, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
              border: isLive
                ? "1px solid rgba(34, 197, 94, 0.2)"
                : "1px solid rgba(239, 68, 68, 0.2)",
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
              whiteSpace: isMobile ? "normal" : "nowrap",
            }}
            title="Selected monitor range"
          >
            {fmtDate(filters?.startDate || startDate)} to{" "}
            {fmtDate(filters?.endDate || endDate)}
          </div>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: kpiGridColumns,
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <MetricCard
          title="Attempts in range"
          value={String(kpis.dueInRange)}
          subtext="Processed attempts in selected range"
          trend={kpis.dueInRange > 0 ? "Active period" : "No activity"}
          trendUp={kpis.dueInRange > 0}
          icon={<IconClock />}
          color="blue"
        />

        <MetricCard
          title="Successful"
          value={String(successCount)}
          subtext="Successful collections"
          trend={successCount > 0 ? "Healthy" : ""}
          trendUp={true}
          icon={<IconList />}
          color="green"
        />

        <MetricCard
          title="Retry scheduled"
          value={String(kpis.retryScheduled)}
          subtext="Retry pressure in range"
          trend={kpis.retryScheduled > 0 ? "Watchlist" : "Clear"}
          trendUp={kpis.retryScheduled === 0}
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: middleGridColumns,
          gap: "1rem",
          marginBottom: "1.5rem",
          alignItems: "start",
        }}
      >
        <Card style={{ padding: "1.25rem" }}>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: "bold",
              color: "white",
              marginBottom: "0.25rem",
            }}
          >
            Range health
          </h3>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1rem" }}>
            Successful vs failed vs scheduled retry vs pending
          </p>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <DonutChart data={healthDonut} />
          </div>

          <div
            style={{
              marginTop: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {healthDonut.map((item) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div
                    style={{
                      width: "0.5rem",
                      height: "0.5rem",
                      borderRadius: "50%",
                      backgroundColor: item.color,
                    }}
                  ></div>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    {item.name}
                  </span>
                </div>
                <span
                  style={{ fontSize: "0.75rem", fontWeight: 600, color: "white" }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: "bold",
              color: "white",
              marginBottom: "0.25rem",
            }}
          >
            Schedule distribution
          </h3>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1rem" }}>
            Attempts, 25th schedule, retry, failed
          </p>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <DonutChart data={scheduleDonut} />
          </div>

          <div
            style={{
              marginTop: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {scheduleDonut.map((item) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div
                    style={{
                      width: "0.5rem",
                      height: "0.5rem",
                      borderRadius: "50%",
                      backgroundColor: item.color,
                    }}
                  ></div>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    {item.name}
                  </span>
                </div>
                <span
                  style={{ fontSize: "0.75rem", fontWeight: 600, color: "white" }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: "bold",
              color: "white",
              marginBottom: "0.25rem",
            }}
          >
            Mini status list
          </h3>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1rem" }}>
            Snapshot for selected range
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        width: "0.5rem",
                        height: "0.5rem",
                        borderRadius: "50%",
                        backgroundColor: s.color,
                      }}
                    ></div>
                    <span
                      style={{
                        fontSize: "0.875rem",
                        color: "white",
                        fontWeight: 600,
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    {s.value}
                  </span>
                </div>

                <div
                  style={{
                    height: "0.25rem",
                    backgroundColor: "rgba(55, 65, 81, 0.5)",
                    borderRadius: "9999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(0, s.pct))}%`,
                      borderRadius: "9999px",
                      background:
                        s.label === "Scheduled retry queued"
                          ? "linear-gradient(90deg, #8b5cf6, #a78bfa)"
                          : s.color,
                      transition: "all 0.5s ease",
                    }}
                  ></div>
                </div>

                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                  }}
                >
                  {s.pct}% of selected range activity
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: bottomGridColumns,
          gap: "1rem",
          alignItems: "start",
        }}
      >
        <Card style={{ padding: "1.25rem", height: "fit-content" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: "bold",
                  color: "white",
                  marginBottom: "0.25rem",
                }}
              >
                Last Cron run
              </h3>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                Latest cron status
                {error ? ` • API error: ${error}` : ""}
              </p>
            </div>

            <PremiumButton
              title="Export Cron runs to CSV"
              onClick={() => exportRowsToCsv("cron_runs.csv", cronRuns, cronColumns)}
            >
              Export to Excel
            </PremiumButton>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    borderBottom: "1px solid rgba(139, 92, 246, 0.1)",
                  }}
                >
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Started</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Ended</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Status</th>
                  <th
                    style={{
                      paddingBottom: "0.75rem",
                      fontWeight: 500,
                      textAlign: "right",
                    }}
                  >
                    OK
                  </th>
                  <th
                    style={{
                      paddingBottom: "0.75rem",
                      fontWeight: 500,
                      textAlign: "right",
                    }}
                  >
                    Fail
                  </th>
                </tr>
              </thead>

              <tbody style={{ fontSize: "0.875rem" }}>
                {pagedCronRuns.map((r, idx) => {
                  const result = safeStr(r?.result || "").toUpperCase();
                  let badge = "queued";
                  if (result === "RUNNING") badge = "running";
                  else if (result === "FAILED") badge = "failed";
                  else if (result === "PARTIAL") badge = "partial";
                  else if (result === "SUCCESS") badge = "ok";

                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid rgba(139, 92, 246, 0.05)",
                      }}
                    >
                      <td
                        style={{
                          padding: "0.75rem 0",
                          color: "white",
                          fontWeight: 500,
                          fontSize: "0.75rem",
                        }}
                      >
                        {fmtWhen(r?.started_at)}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem 0",
                          color: "#9ca3af",
                          fontSize: "0.75rem",
                        }}
                      >
                        {fmtWhen(r?.ended_at)}
                      </td>
                      <td style={{ padding: "0.75rem 0" }}>
                        <StatusBadge status={badge}>
                          {result || "QUEUED"}
                        </StatusBadge>
                      </td>
                      <td
                        style={{
                          padding: "0.75rem 0",
                          textAlign: "right",
                          color: "white",
                          fontWeight: 600,
                        }}
                      >
                        {Number(r?.success_count || 0)}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem 0",
                          textAlign: "right",
                          color: "white",
                          fontWeight: 600,
                        }}
                      >
                        {Number(r?.fail_count || 0)}
                      </td>
                    </tr>
                  );
                })}

                {pagedCronRuns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "1rem 0",
                        color: "#6b7280",
                        fontSize: "0.75rem",
                      }}
                    >
                      No cron data yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="tdm-pageRow">
            <button
              type="button"
              className="tdm-pageBtn"
              onClick={() => setCronPage((p) => Math.max(1, p - 1))}
              disabled={currentCronPage <= 1}
            >
              Back
            </button>

            <div className="tdm-pageText">
              Page {currentCronPage} of {cronPageCount} · {cronRuns.length} records
            </div>

            <button
              type="button"
              className="tdm-pageBtn"
              onClick={() => setCronPage((p) => Math.min(cronPageCount, p + 1))}
              disabled={currentCronPage >= cronPageCount}
            >
              Next
            </button>
          </div>
        </Card>

        <Card style={{ padding: "1.25rem", height: "fit-content" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: "bold",
                  color: "white",
                  marginBottom: "0.25rem",
                }}
              >
                Recent charge attempts
              </h3>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                Mapped from live reports attempts
              </p>
            </div>

            <PremiumButton
              title="Export Attempts to CSV"
              onClick={() =>
                exportRowsToCsv(
                  "charge_attempts_recent.csv",
                  recentAttempts,
                  attemptsColumns
                )
              }
            >
              Export to Excel
            </PremiumButton>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    borderBottom: "1px solid rgba(139, 92, 246, 0.1)",
                  }}
                >
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Created</th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Client id</th>
                  <th
                    style={{
                      paddingBottom: "0.75rem",
                      fontWeight: 500,
                      textAlign: "right",
                    }}
                  >
                    Amount
                  </th>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 500 }}>Status</th>
                </tr>
              </thead>

              <tbody style={{ fontSize: "0.875rem" }}>
                {pagedRecentAttempts.map((a, idx) => {
                  const st = safeStr(a?.status || "").toLowerCase();
                  let badge = "pending";
                  if (st === "successful") badge = "ok";
                  else if (st === "failed") badge = "failed";
                  else if (st === "retry scheduled") badge = "retry";
                  else if (st === "suspended") badge = "suspended";

                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid rgba(139, 92, 246, 0.05)",
                      }}
                    >
                      <td
                        style={{
                          padding: "0.75rem 0",
                          color: "#9ca3af",
                          fontSize: "0.75rem",
                        }}
                      >
                        {fmtDateTime(a?.created_at)}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem 0",
                          color: "white",
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          fontFamily: "monospace",
                        }}
                      >
                        {safeStr(a?.client_id || "") || "N/A"}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem 0",
                          textAlign: "right",
                          color: "white",
                          fontWeight: 600,
                        }}
                      >
                        {safeNum(a?.amount || 0)}
                      </td>
                      <td style={{ padding: "0.75rem 0" }}>
                        <StatusBadge status={badge}>
                          {st ? st.toUpperCase() : "PENDING"}
                        </StatusBadge>
                      </td>
                    </tr>
                  );
                })}

                {pagedRecentAttempts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: "1rem 0",
                        color: "#6b7280",
                        fontSize: "0.75rem",
                      }}
                    >
                      No charge attempt data in the selected range.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="tdm-pageRow">
            <button
              type="button"
              className="tdm-pageBtn"
              onClick={() => setAttemptsPage((p) => Math.max(1, p - 1))}
              disabled={currentAttemptsPage <= 1}
            >
              Back
            </button>

            <div className="tdm-pageText">
              Page {currentAttemptsPage} of {attemptsPageCount} · {recentAttempts.length} records
            </div>

            <button
              type="button"
              className="tdm-pageBtn"
              onClick={() =>
                setAttemptsPage((p) => Math.min(attemptsPageCount, p + 1))
              }
              disabled={currentAttemptsPage >= attemptsPageCount}
            >
              Next
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
