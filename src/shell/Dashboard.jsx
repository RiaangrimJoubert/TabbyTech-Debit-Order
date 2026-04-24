// src/shell/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const LS = {
  search: "tabbytech.dashboard.search",
  startDate: "tabbytech.dashboard.startDate",
  endDate: "tabbytech.dashboard.endDate",
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

function fmtDateLong(value) {
  if (!value) return "";
  const d = new Date(String(value).length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

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

function toYmd(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatPickerMonth(date) {
  return date.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
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

function makeSummaryCacheKey(startDate, endDate) {
  return `${safeStr(startDate)}__${safeStr(endDate)}`;
}

function getSummaryCache(startDate, endDate) {
  const cache = getCachedObject(LS.summaryCache);
  if (!cache) return null;
  if (cache.key !== makeSummaryCacheKey(startDate, endDate)) return null;
  if (!cache.ts || Date.now() - cache.ts > SUMMARY_CACHE_MS) return null;
  return cache.data || null;
}

function setSummaryCache(startDate, endDate, data) {
  setCachedObject(LS.summaryCache, {
    key: makeSummaryCacheKey(startDate, endDate),
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

const IconCaretDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconTick = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
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
      <div className={cx("ttd-metricValue", (!value || value === "Awaiting data" || value === "—") && "ttd-metricValueMuted")}>{value}</div>
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

function PremiumBatchDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useOnClickOutside(wrapRef, () => setOpen(false));

  const activeOption =
    options.find((o) => o.value === value) ||
    options[0] ||
    { value: "", label: "No batches" };

  function handleSelect(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="ttd-ddWrap">
      <button
        type="button"
        className={cx("ttd-ddBtn", open && "ttd-ddBtnOpen")}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="ttd-ddBtnText">{activeOption.label}</span>
        <span className="ttd-ddCaret">
          <IconCaretDown />
        </span>
      </button>

      {open ? (
        <div className="ttd-ddMenu" role="listbox" aria-label="Recent runs">
          {options.length ? (
            options.map((option, index) => {
              const isActive = option.value === activeOption.value;
              return (
                <div
                  key={option.value || `opt-${index}`}
                  role="option"
                  aria-selected={isActive}
                  tabIndex={0}
                  className={cx("ttd-ddItem", isActive && "ttd-ddItemActive")}
                  style={{
                    borderBottom:
                      index === options.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)",
                  }}
                  onClick={() => handleSelect(option.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(option.value);
                    }
                  }}
                >
                  <span className="ttd-ddItemText">{option.label}</span>
                  {isActive ? (
                    <span className="ttd-ddTick">
                      <IconTick />
                    </span>
                  ) : (
                    <span className="ttd-ddTickSpacer" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="ttd-ddItem" style={{ borderBottom: "none", cursor: "default" }}>
              <span className="ttd-ddItemText">No batches</span>
              <span className="ttd-ddTickSpacer" />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
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
    <div ref={wrapRef} className="ttd-datePickerWrap">
      <button
        type="button"
        className={cx("ttd-dateInput", open && "ttd-dateInputOpen")}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((x) => !x)}
      >
        <span>{value || "Select date"}</span>
        <span className="ttd-dateCaret">▾</span>
      </button>

      {open && (
        <div className="ttd-datePopup" role="dialog" aria-label={ariaLabel}>
          <div className="ttd-datePopupHead">
            <button
              type="button"
              className="ttd-dateNavBtn"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              aria-label="Previous month"
            >
              ‹
            </button>

            <div className="ttd-dateMonthLabel">
              {formatPickerMonth(viewDate)}
            </div>

            <button
              type="button"
              className="ttd-dateNavBtn"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="ttd-dateWeekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="ttd-dateWeekday">
                {d}
              </div>
            ))}
          </div>

          <div className="ttd-dateGrid">
            {cells.map((cell) => {
              if (cell.type === "empty") {
                return (
                  <div
                    key={cell.key}
                    className="ttd-dateCell ttd-dateCellEmpty"
                  />
                );
              }

              const cls = [
                "ttd-dateCell",
                "ttd-dateCellDay",
                cell.isSelected ? "ttd-dateCellSelected" : "",
                cell.isToday ? "ttd-dateCellToday" : "",
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

function PremiumActionButton({ children, onClick, disabled = false, variant = "primary" }) {
  return (
    <button
      type="button"
      className={cx("ttd-actionBtn", variant === "secondary" && "ttd-actionBtnSecondary")}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function DonutChart({ size = 190, strokeWidth = 18, centerValue, centerLabel, segments }) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  let angleCursor = 0;
  const hasData = Array.isArray(segments) && segments.some((segment) => safeNum(segment?.value) > 0);
  const displayedCenterValue = hasNonZeroValue(centerValue) ? centerValue : "—";
  const displayedCenterLabel = hasData ? centerLabel : "No live data";

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
        <div className="ttd-donutCenterValue">{displayedCenterValue}</div>
        <div className="ttd-donutCenterLabel">{displayedCenterLabel}</div>
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
  const hasChartData = allValues.some((value) => value > 0);

  function buildSeries(key) {
    return rows.map((item, idx) => ({
      x: leftPad + (rows.length === 1 ? innerW / 2 : (idx / Math.max(1, rows.length - 1)) * innerW),
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
            {rows.length && hasChartData ? safeNum(rows[rows.length - 1].successful) : "—"}
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
        {!hasChartData ? <div className="ttd-emptyStateNote">No live performance data in the selected range</div> : null}
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

      <div className="ttd-xAxis" style={{ gridTemplateColumns: `repeat(${Math.max(rows.length || 1, 1)}, minmax(0, 1fr))` }}>
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

async function fetchNotificationStats(startDate, endDate) {
  const qs = new URLSearchParams({
    startDate: safeStr(startDate),
    endDate: safeStr(endDate),
  });
  try {
    return await fetchJson(`/api/dashboard/notification-stats?${qs.toString()}`);
  } catch (e) {
    return null;
  }
}

// FIX START: switched dashboard summary to explicit date range
async function fetchDashboardSummary(startDate, endDate) {
  const qs = new URLSearchParams({
    startDate: safeStr(startDate),
    endDate: safeStr(endDate),
  });
  return fetchJson(`/api/reports/summary?${qs.toString()}`);
}

// NEW: Fetch attempts data like Debit Order Monitor
async function fetchDashboardAttempts(startDate, endDate) {
  const qs = new URLSearchParams({
    startDate: safeStr(startDate),
    endDate: safeStr(endDate),
    page: "1",
    perPage: "300",
  });
  try {
    return await fetchJson(`/api/reports/attempts?${qs.toString()}`);
  } catch (e) {
    return null;
  }
}

// FIX START: real frontend fallback when summary route returns empty range data
function enumerateYmdRange(startDate, endDate) {
  const start = parseYmdLocal(startDate);
  const end = parseYmdLocal(endDate);
  if (!start || !end || start > end) return [];

  const days = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endAt = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (cursor <= endAt) {
    days.push(toYmd(cursor));
    cursor.setDate(cursor.getDate() + 1);
    if (days.length > 120) break;
  }

  return days;
}

function hasUsableSummaryData(resp) {
  const data = resp?.data || {};
  const cards = data?.cards || {};
  const charts = data?.charts || {};
  const batches = Array.isArray(data?.batches) ? data.batches : [];

  const cardHasValue = Object.values(cards).some((v) => Number.isFinite(Number(v)) && Number(v) > 0);
  const chartHasRows = Object.values(charts).some((v) => Array.isArray(v) && v.length > 0);

  return cardHasValue || chartHasRows || batches.length > 0;
}

async function fetchChargeMetricsByDate(date) {
  const qs = new URLSearchParams({ date: safeStr(date) });
  return fetchJson(`/api/dashboard/charge-metrics?${qs.toString()}`);
}

async function fetchDashboardSummaryWithFallback(startDate, endDate, cronMetricsSnapshot = null) {
  try {
    const direct = await fetchDashboardSummary(startDate, endDate);
    if (hasUsableSummaryData(direct)) return direct;
  } catch (e) {
    // continue to fallback below
  }

  const days = enumerateYmdRange(startDate, endDate);
  const responses = await Promise.all(
    days.map(async (date) => {
      try {
        const resp = await fetchChargeMetricsByDate(date);
        return resp?.data ? { ...resp.data, date } : null;
      } catch {
        return null;
      }
    })
  );

  const valid = responses.filter(Boolean);
  const totalScheduledValue = valid.reduce((sum, row) => sum + safeNum(row.scheduledToday), 0);
  const totalCollectedValue = valid.reduce((sum, row) => sum + safeNum(row.paidToday), 0);
  const totalRetryValue = valid.reduce((sum, row) => sum + safeNum(row.retryScheduledToday), 0);
  const latestFailedThisMonth = valid.length ? safeNum(valid[valid.length - 1].failedThisMonth) : 0;
  const totalAttempted = totalScheduledValue;
  const successRate = totalAttempted > 0 ? (totalCollectedValue / totalAttempted) * 100 : 0;
  const retryRate = totalAttempted > 0 ? (totalRetryValue / totalAttempted) * 100 : 0;
  const failureRate = totalAttempted > 0 && latestFailedThisMonth > 0 ? Math.min(100, (latestFailedThisMonth / totalAttempted) * 100) : 0;

  const trend = valid.map((row) => ({
    date: row.date,
    time: fmtDateShort(row.date),
    successful: safeNum(row.paidToday),
    retry: safeNum(row.retryScheduledToday),
  }));

  const retryDistribution = [
    { label: '25th Cycle', value: 0, color: '#22c55e' },
    { label: '1st Retry', value: totalRetryValue, color: '#fbbf24' },
    { label: 'Other Retry', value: 0, color: '#ef4444' },
  ];

  const latestRuns = Array.isArray(cronMetricsSnapshot?.latestRuns) ? cronMetricsSnapshot.latestRuns : [];
  const batches = latestRuns.map((run, index) => ({
    batchId: safeStr(run.runId || run.run_id || `run-${index + 1}`),
    batch: safeStr(run.runDate || run.startedAt || run.started_at || `Run ${index + 1}`),
    status: safeStr(run.runStatus || run.run_status || run.result || 'Pending'),
    date: safeStr(run.runDate || run.startedAt || run.started_at),
    items: null,
    value: null,
  }));

  return {
    ok: true,
    data: {
      cards: {
        totalDebitOrderValue: totalScheduledValue,
        totalCollected: totalCollectedValue,
        retryScheduled: totalRetryValue,
        retryScheduledToday: totalRetryValue,
        attemptedToday: totalAttempted,
        successfulToday: totalCollectedValue,
        failedToday: latestFailedThisMonth,
        successRate,
        retryRate,
        failureRate,
      },
      charts: {
        debitPerformance: trend,
        retryDistribution,
      },
      batches,
      cron: {
        latestRuns,
        lastRun: latestRuns[0] || null,
      },
      asOfDate: endDate,
    },
  };
}
// FIX END

function resolveRealMetric(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function hasNonZeroValue(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function formatCurrencyOrText(value, formatter = formatZAR, emptyText = "Awaiting data", forceShow = false) {
  if (forceShow) return formatter(value);
  return hasNonZeroValue(value) ? formatter(value) : emptyText;
}

function formatCountOrText(value, emptyText = "—", forceShow = false) {
  if (forceShow) return String(safeNum(value));
  return hasNonZeroValue(value) ? String(safeNum(value)) : emptyText;
}

function formatPercentOrText(value, emptyText = "—") {
  return hasNonZeroValue(value) ? `${safeNum(value).toFixed(0)}%` : emptyText;
}

function formatRunStatusOrText(value, emptyText = "Awaiting data") {
  const s = safeStr(value);
  return s || emptyText;
}


function readNumByKeys(source, keys, fallback = 0) {
  const obj = source && typeof source === "object" ? source : {};
  for (const key of keys) {
    const value = obj?.[key];
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function readStrByKeys(source, keys, fallback = "") {
  const obj = source && typeof source === "object" ? source : {};
  for (const key of keys) {
    const value = safeStr(obj?.[key]);
    if (value) return value;
  }
  return fallback;
}

function readArrayByKeys(source, keys) {
  const obj = source && typeof source === "object" ? source : {};
  for (const key of keys) {
    const value = obj?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeAttemptsMetrics(cronMetrics, summaryCards) {
  const source = cronMetrics?.attemptsToday && typeof cronMetrics.attemptsToday === "object"
    ? cronMetrics.attemptsToday
    : summaryCards;

  const attempted =
    readNumByKeys(source, [
      "attempted",
      "attemptedToday",
      "attempts",
      "attemptsToday",
      "total",
      "totalAttempts",
      "INITIATED",
      "initiated",
      "processed",
    ]) ||
    (
      readNumByKeys(source, ["success", "successfulToday", "SUCCESS", "successful"]) +
      readNumByKeys(source, ["failed", "failedToday", "FAILED"]) +
      readNumByKeys(source, ["retry", "retryScheduledToday", "retryScheduled", "RETRY"]) +
      readNumByKeys(source, ["suspended", "suspendedToday", "SUSPENDED"])
    );

  return {
    attempted,
    success: readNumByKeys(source, ["success", "successfulToday", "successful", "SUCCESS"]),
    failed: readNumByKeys(source, ["failed", "failedToday", "FAILED"]),
    retry: readNumByKeys(source, ["retry", "retryScheduledToday", "retryScheduled", "RETRY"]),
    suspended: readNumByKeys(source, ["suspended", "suspendedToday", "SUSPENDED"]),
  };
}

function normalizeLastRun(cronMetrics, summaryData) {
  const cronLastRun =
    cronMetrics?.lastRun ||
    (Array.isArray(cronMetrics?.latestRuns) ? cronMetrics.latestRuns[0] : null);

  const summaryCron = summaryData?.cron || {};
  const summaryLastRun =
    summaryCron?.lastRun ||
    summaryData?.lastRun ||
    summaryCron?.latestRun ||
    (Array.isArray(summaryCron?.latestRuns) ? summaryCron.latestRuns[0] : null);

  const raw = cronLastRun || summaryLastRun || null;
  if (!raw) return null;

  const runStatus = readStrByKeys(raw, ["runStatus", "run_status", "status", "result", "outcome"]);
  return {
    ...raw,
    runStatus,
    startedAt: readStrByKeys(raw, ["startedAt", "started_at", "startTime", "started"]),
    endedAt: readStrByKeys(raw, ["endedAt", "ended_at", "endTime", "ended"]),
    lastError: readStrByKeys(raw, ["lastError", "last_error", "error"]),
  };
}

function normalizeTrendPoint(point, index) {
  const row = point || {};
  return {
    time:
      safeStr(row.time) ||
      safeStr(row.label) ||
      fmtDateShort(row.date || row.day || row.period || row.month) ||
      `P${index + 1}`,
    successful: readNumByKeys(row, ["successful", "success", "paid", "collected"]),
    failed: readNumByKeys(row, ["failed", "failure", "fail"]),
    retry: readNumByKeys(row, ["retry", "retried", "retryScheduled"]),
  };
}

function normalizeRetrySegmentRow(item, index) {
  const row = item || {};
  return {
    label:
      safeStr(row.label) ||
      safeStr(row.name) ||
      safeStr(row.bucket) ||
      safeStr(row.period) ||
      `Segment ${index + 1}`,
    value: readNumByKeys(row, ["value", "count", "total", "items"]),
    color: safeStr(row.color) || "#8b5cf6",
  };
}

function buildRetrySegmentsFromCards(summaryCards) {
  const retry = readNumByKeys(summaryCards, ["retryScheduledToday", "retryScheduled", "retry"]);
  const failed = readNumByKeys(summaryCards, ["failedToday", "failed"]);
  const success = readNumByKeys(summaryCards, ["successfulToday", "success"]);
  const rows = [
    { label: "Retry scheduled", value: retry, color: "#8b5cf6" },
    { label: "Failed", value: failed, color: "#ef4444" },
    { label: "Successful", value: success, color: "#22c55e" },
  ].filter((row) => row.value > 0);

  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;

  return rows.map((row) => ({
    ...row,
    pct: (row.value / total) * 100,
  }));
}


export default function Dashboard() {
  // FIX START: replace range state with premium date state
  const [startDate, setStartDate] = useLocalStorageState(LS.startDate, todayYmdLocal());
  const [endDate, setEndDate] = useLocalStorageState(LS.endDate, todayYmdLocal());
  const [appliedStartDate, setAppliedStartDate] = useState(() => safeStr(startDate) || todayYmdLocal());
  const [appliedEndDate, setAppliedEndDate] = useState(() => safeStr(endDate) || todayYmdLocal());
  // FIX END

  const [subView] = useLocalStorageState(LS.subView, "monthly");
  const [metric] = useLocalStorageState(LS.metric, "revenue");
  const [selectedBatch, setSelectedBatch] = useLocalStorageState(LS.batch, "");

  const [cronMetrics, setCronMetrics] = useState(() => getCronCache());
  const [cronLoading, setCronLoading] = useState(() => !getCronCache());
  const [cronError, setCronError] = useState("");

  // FIX START: summary cache is now keyed by applied date range
  const [dashboardSummary, setDashboardSummary] = useState(
    () => getSummaryCache(appliedStartDate, appliedEndDate)
  );
  const [summaryLoading, setSummaryLoading] = useState(
    () => !getSummaryCache(appliedStartDate, appliedEndDate)
  );
  // FIX END
  const [summaryError, setSummaryError] = useState("");
  const [attemptsData, setAttemptsData] = useState(null);
  const [notificationStats, setNotificationStats] = useState(null);

  useEffect(() => {
    try {
      localStorage.removeItem(LS.search);
    } catch {}
  }, []);

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

  // FIX START: summary loading is driven by appliedStartDate + appliedEndDate
  useEffect(() => {
    let alive = true;
    const cached = getSummaryCache(appliedStartDate, appliedEndDate);

    if (cached) {
      setDashboardSummary(cached);
      setSummaryLoading(false);
    }

    async function loadSummary() {
      try {
        if (!cached) setSummaryLoading(true);
        setSummaryError("");
        const [summaryData, attemptsResult, notifStats] = await Promise.all([
          fetchDashboardSummaryWithFallback(appliedStartDate, appliedEndDate, cronMetrics),
          fetchDashboardAttempts(appliedStartDate, appliedEndDate),
          fetchNotificationStats(appliedStartDate, appliedEndDate),
        ]);
        setSummaryCache(appliedStartDate, appliedEndDate, summaryData);
        if (alive) {
          setDashboardSummary(summaryData);
          setAttemptsData(attemptsResult);
          setNotificationStats(notifStats);
        }
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
  }, [appliedStartDate, appliedEndDate, cronMetrics]);
  // FIX END

  const summaryData = dashboardSummary?.data || {};
  const summaryCards = summaryData?.cards || {};
  const summaryCharts = summaryData?.charts || {};
  const rawSummaryBatches = Array.isArray(summaryData?.batches)
    ? summaryData.batches
    : Array.isArray(cronMetrics?.latestRuns)
    ? cronMetrics.latestRuns
    : [];

  const summaryBatches = useMemo(() => {
    return rawSummaryBatches.map((row, index) => normalizeDashboardBatchRow(row, index));
  }, [rawSummaryBatches]);

  // NEW: Calculate metrics from attempts data when cards are empty
  const attemptsMetrics = useMemo(() => {
    const rows = attemptsData?.data?.rows || attemptsData?.data?.attempts?.rows || [];
    if (!Array.isArray(rows) || rows.length === 0) return null;

    let totalValue = 0;
    let successfulValue = 0;
    let successfulCount = 0;
    let failedCount = 0;
    let retryCount = 0;
    let suspendedCount = 0;
    let estimatedFees = 0;

    for (const row of rows) {
      const amt = Number(row.amountZar || row.amount || 0) || 0;
      const status = String(row.status || row.outcome || '').toUpperCase();

      totalValue += amt;

      if (status === 'SUCCESS' || status === 'PAID') {
        successfulValue += amt;
        successfulCount++;
        // Estimate Paystack fee: 2.9% + R1 for amounts >= R10
        estimatedFees += (amt * 0.029) + (amt >= 10 ? 1 : 0);
      } else if (status === 'FAILED') {
        failedCount++;
      } else if (status.includes('RETRY')) {
        retryCount++;
      } else if (status === 'SUSPENDED') {
        suspendedCount++;
      }
    }

    const totalAttempts = rows.length;

    return {
      totalDebitOrderValue: totalValue,
      totalCollected: successfulValue,
      estimatedMoneyToBank: Math.max(0, successfulValue - estimatedFees),
      estimatedPaystackFees: estimatedFees,
      retryScheduled: retryCount,
      suspended: suspendedCount,
      successRate: totalAttempts > 0 ? (successfulCount / totalAttempts) * 100 : 0,
      failureRate: totalAttempts > 0 ? (failedCount / totalAttempts) * 100 : 0,
      retryRate: totalAttempts > 0 ? (retryCount / totalAttempts) * 100 : 0,
      successfulCount,
      failedCount,
      retryCount,
      suspendedCount,
      totalAttempts,
    };
  }, [attemptsData]);

  // FIX START: normalize cron metrics and last run across current endpoint shapes
  const attemptsToday = useMemo(() => {
    if (attemptsMetrics && attemptsMetrics.totalAttempts > 0) {
      return {
        attempted: attemptsMetrics.totalAttempts,
        success: attemptsMetrics.successfulCount,
        failed: attemptsMetrics.failedCount,
        retry: attemptsMetrics.retryCount,
        suspended: attemptsMetrics.suspendedCount,
      };
    }
    return normalizeAttemptsMetrics(cronMetrics, summaryCards);
  }, [cronMetrics, summaryCards, attemptsMetrics]);

  const lastRun = useMemo(
    () => normalizeLastRun(cronMetrics, summaryData),
    [cronMetrics, summaryData]
  );

  const lastResult = String(
    lastRun?.runStatus ||
      lastRun?.result ||
      lastRun?.status ||
      ""
  ).toUpperCase();
  // FIX END

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

  // FIX START: support alternate summary card key names already used by reports/dashboard payloads
  const realMonthlyMRR =
    resolveRealMetric(summaryCards.monthlyMRR) ||
    resolveRealMetric(summaryCards.mrr) ||
    resolveRealMetric(summaryCards.monthlyRecurringRevenue) ||
    resolveRealMetric(summaryData.monthlyMRR) ||
    resolveRealMetric(summaryData.mrr) ||
    resolveRealMetric(summaryData.monthlyRecurringRevenue);

  const realAnnualARR =
    resolveRealMetric(summaryCards.annualARR) ||
    resolveRealMetric(summaryCards.arr) ||
    resolveRealMetric(summaryCards.annualRecurringRevenue) ||
    resolveRealMetric(summaryData.annualARR) ||
    resolveRealMetric(summaryData.arr) ||
    resolveRealMetric(summaryData.annualRecurringRevenue);

  const monthlyActive =
    resolveRealMetric(summaryCards.monthlyActive) ||
    resolveRealMetric(summaryData.monthlyActive) ||
    resolveRealMetric(summaryCards.activeMonthlySubscriptions) ||
    resolveRealMetric(summaryCards.monthlySubscribers) ||
    0;

  const annualActive =
    resolveRealMetric(summaryCards.annualActive) ||
    resolveRealMetric(summaryData.annualActive) ||
    resolveRealMetric(summaryCards.activeAnnualSubscriptions) ||
    resolveRealMetric(summaryCards.annualSubscribers) ||
    0;
  // FIX END

  const data = useMemo(() => {
    // Helper to get value from cards or attempts
    const getValue = (cardKeys, attemptsKey) => {
      const cardValue = readNumByKeys(summaryCards, cardKeys);
      if (cardValue > 0) return cardValue;
      return attemptsMetrics?.[attemptsKey] || 0;
    };

    return {
      top: {
        totalDebitOrderValue: getValue([
          "totalDebitOrderValue",
          "totalScheduledValue",
          "pipelineValue",
          "scheduledValue",
          "grossScheduled",
          "grossValue",
          "totalValue",
        ]),
        totalCollected: readNumByKeys(summaryCards, [
          "totalCollected",
          "collectedValue",
          "successfulValue",
          "paidValue",
          "grossCollected",
        ]),
        estimatedMoneyToBank: readNumByKeys(summaryCards, [
          "estimatedMoneyToBank",
          "netCollected",
          "actualMoneyToBank",
          "settlementValue",
          "netValue",
        ]),
        estimatedPaystackFees: readNumByKeys(summaryCards, [
          "estimatedPaystackFees",
          "paystackFees",
          "fees",
          "totalFees",
          "feeValue",
        ]),
        retryScheduled: readNumByKeys(summaryCards, [
          "retryScheduledToday",
          "retryScheduled",
          "retry",
        ]),
        suspended: readNumByKeys(summaryCards, [
          "suspendedToday",
          "suspended",
        ]),
        successRate: readNumByKeys(summaryCards, ["successRate", "successfulRate"]),
        failureRate: readNumByKeys(summaryCards, ["failureRate", "failedRate"]),
        retryRate: readNumByKeys(summaryCards, ["retryRate"]),
      },
      monthlyActive,
      annualActive,
      monthlyMRR: realMonthlyMRR,
      annualARR: realAnnualARR,
      recentBatches: summaryBatches,
    };
  }, [summaryBatches, summaryCards, monthlyActive, annualActive, realMonthlyMRR, realAnnualARR, attemptsMetrics]);

  const debitPerformanceData = useMemo(() => {
    const raw = readArrayByKeys(summaryCharts, [
      "debitPerformance",
      "recentCyclePerformance",
      "performanceTrend",
      "cyclePerformance",
      "collectionTrend",
      "runTrend",
    ]);
    return raw.map(normalizeTrendPoint);
  }, [summaryCharts]);

  const retryDistributionData = useMemo(() => {
    const raw = readArrayByKeys(summaryCharts, [
      "retryDistribution",
      "retryPressure",
      "retryBreakdown",
      "retryByCycle",
    ]);
    return raw.map(normalizeRetrySegmentRow);
  }, [summaryCharts]);

  const filteredBatches = useMemo(() => {
    return data.recentBatches;
  }, [data.recentBatches]);

  useEffect(() => {
    if (!filteredBatches.length) return;
    const found = filteredBatches.some((b) => b.batch === selectedBatch || b.batchId === selectedBatch);
    if (!found) setSelectedBatch(filteredBatches[0].batchId || filteredBatches[0].batch);
  }, [filteredBatches, selectedBatch, setSelectedBatch]);

  const retrySegments = useMemo(() => {
    if (!retryDistributionData.length) {
      return buildRetrySegmentsFromCards(summaryCards);
    }

    const total = retryDistributionData.reduce((sum, item) => sum + safeNum(item.value), 0) || 1;
    return retryDistributionData.map((item) => ({
      label: safeStr(item.label || item.name),
      value: safeNum(item.value),
      pct: (safeNum(item.value) / total) * 100,
      color: safeStr(item.color) || "#8b5cf6",
    }));
  }, [retryDistributionData, summaryCards]);

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

    exportRowsToCsv(`tabbytech-batches-${appliedStartDate}-${appliedEndDate}-${Date.now()}.csv`, rows);
  }

  const batchDropdownOptions = filteredBatches.length
    ? filteredBatches.map((b) => ({
        value: b.batchId || b.batch,
        label: b.batch,
      }))
    : [{ value: "", label: "No batches" }];

  // FIX START: premium apply/sync handlers
  function applyRange() {
    if (safeStr(startDate) && safeStr(endDate) && startDate > endDate) {
      setSummaryError("Start date cannot be after end date.");
      return;
    }
    setAppliedStartDate(safeStr(startDate) || startOfMonthYmdLocal());
    setAppliedEndDate(safeStr(endDate) || todayYmdLocal());
  }

  async function syncNow() {
    try {
      if (safeStr(startDate) && safeStr(endDate) && startDate > endDate) {
        setSummaryError("Start date cannot be after end date.");
        return;
      }

      const nextStart = safeStr(startDate) || startOfMonthYmdLocal();
      const nextEnd = safeStr(endDate) || todayYmdLocal();

      setAppliedStartDate(nextStart);
      setAppliedEndDate(nextEnd);

      setSummaryLoading(true);
      setSummaryError("");

      const data = await fetchDashboardSummaryWithFallback(nextStart, nextEnd, cronMetrics);
      setSummaryCache(nextStart, nextEnd, data);
      setDashboardSummary(data);
    } catch (e) {
      setSummaryError(String(e?.message || e));
    } finally {
      setSummaryLoading(false);
    }
  }
  // FIX END

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
      position: relative;
      z-index: 120;
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
      position: relative;
      z-index: 121;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .ttd-headerTools {
      position: relative;
      z-index: 122;
      display: inline-flex;
      align-items: flex-end;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(12, 16, 33, 0.64);
      backdrop-filter: blur(12px);
      box-shadow: 0 12px 28px rgba(0,0,0,0.18);
      flex-wrap: wrap;
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
      height: 40px;
    }

    .ttd-liveDot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #22c55e;
      animation: ttdPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .ttd-dateGroup {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ttd-dateGroupLabel {
      font-size: 11px;
      font-weight: 800;
      color: rgba(255,255,255,0.62);
      margin-left: 2px;
    }

    .ttd-datePickerWrap { position: relative; z-index: 130; }

    .ttd-dateInput {
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

    .ttd-dateInput:hover {
      border-color: rgba(168,85,247,0.90);
      box-shadow: 0 12px 28px rgba(124,58,237,0.22);
      transform: translateY(-1px);
    }

    .ttd-dateInputOpen {
      border-color: rgba(168,85,247,0.95);
      box-shadow:
        0 0 0 4px rgba(124,58,237,0.20),
        0 16px 34px rgba(124,58,237,0.26);
    }

    .ttd-dateCaret { opacity: 0.96; font-size: 12px; }

    .ttd-datePopup {
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
      z-index: 9999;
      animation: ttdDatePopIn 140ms ease-out;
    }

    @keyframes ttdDatePopIn {
      from { opacity: 0; transform: translateY(6px) scale(0.985); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .ttd-datePopupHead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }

    .ttd-dateMonthLabel {
      font-size: 13px;
      font-weight: 900;
      color: rgba(255,255,255,0.94);
      letter-spacing: 0.15px;
    }

    .ttd-dateNavBtn {
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

    .ttd-dateNavBtn:hover {
      background: rgba(168,85,247,0.26);
      border-color: rgba(168,85,247,0.50);
    }

    .ttd-dateWeekdays,
    .ttd-dateGrid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 6px;
    }

    .ttd-dateWeekdays { margin-bottom: 6px; }

    .ttd-dateWeekday {
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
      color: rgba(255,255,255,0.50);
    }

    .ttd-dateCell {
      min-height: 34px;
      border-radius: 10px;
      border: 1px solid transparent;
      background: transparent;
    }

    .ttd-dateCellEmpty {
      pointer-events: none;
      opacity: 0;
    }

    .ttd-dateCellDay {
      color: rgba(255,255,255,0.90);
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
    }

    .ttd-dateCellDay:hover {
      background: rgba(168,85,247,0.18);
      border-color: rgba(168,85,247,0.26);
    }

    .ttd-dateCellToday {
      border-color: rgba(168,85,247,0.42);
      box-shadow: inset 0 0 0 1px rgba(168,85,247,0.12);
    }

    .ttd-dateCellSelected {
      background: linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95));
      border-color: rgba(168,85,247,0.80);
      color: #fff;
      box-shadow: 0 10px 22px rgba(124,58,237,0.28);
    }

    .ttd-actionBtn {
      min-width: 132px;
      height: 40px;
      padding: 0 16px;
      border-radius: 14px;
      border: 1px solid rgba(168,85,247,0.54);
      background: linear-gradient(135deg, rgba(168,85,247,0.98), rgba(124,58,237,0.98));
      color: #ffffff;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.16px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        0 16px 34px rgba(124,58,237,0.28),
        inset 0 1px 0 rgba(255,255,255,0.14);
      transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease, opacity 180ms ease;
    }

    .ttd-actionBtn:hover {
      transform: translateY(-1px);
      filter: brightness(1.03);
      box-shadow:
        0 20px 40px rgba(124,58,237,0.32),
        inset 0 1px 0 rgba(255,255,255,0.18);
    }

    .ttd-actionBtn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
      filter: none;
      box-shadow:
        0 8px 18px rgba(124,58,237,0.18),
        inset 0 1px 0 rgba(255,255,255,0.10);
    }

    .ttd-actionBtnSecondary {
      background:
        linear-gradient(180deg, rgba(22,18,45,0.96) 0%, rgba(12,10,28,0.96) 100%);
      border: 1px solid rgba(168,85,247,0.38);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.04),
        0 0 0 1px rgba(168,85,247,0.05);
    }

    .ttd-dateRangePill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(18, 18, 31, 0.6);
      border: 1px solid rgba(139, 92, 246, 0.2);
      color: #9ca3af;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      height: 40px;
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
      position: relative;
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

    .ttd-ddWrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      min-width: 180px;
      max-width: 220px;
    }

    .ttd-ddBtn {
      width: 100%;
      height: 40px;
      padding: 0 14px;
      border-radius: 14px;
      border: 1px solid rgba(168,85,247,0.38);
      background:
        linear-gradient(180deg, rgba(22,18,45,0.96) 0%, rgba(12,10,28,0.96) 100%);
      color: rgba(255,255,255,0.92);
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.15px;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.04),
        0 0 0 1px rgba(168,85,247,0.05);
      transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease, transform 180ms ease;
    }

    .ttd-ddBtn:hover {
      transform: translateY(-1px);
      border-color: rgba(168,85,247,0.52);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.05),
        0 14px 28px rgba(124,58,237,0.18);
    }

    .ttd-ddBtnOpen {
      border-color: rgba(168,85,247,0.60);
      background:
        linear-gradient(180deg, rgba(30,22,58,0.98) 0%, rgba(16,12,34,0.98) 100%);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.05),
        0 16px 34px rgba(124,58,237,0.24);
    }

    .ttd-ddBtnText {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
      flex: 1 1 auto;
    }

    .ttd-ddCaret {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.80);
      flex: 0 0 auto;
    }

    .ttd-ddMenu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 100%;
      border-radius: 16px;
      border: 1px solid rgba(168,85,247,0.28);
      background:
        linear-gradient(180deg, rgba(12,10,28,0.98) 0%, rgba(8,8,20,0.98) 100%);
      box-shadow:
        0 22px 50px rgba(0,0,0,0.42),
        0 0 0 1px rgba(168,85,247,0.06);
      backdrop-filter: blur(14px);
      overflow: hidden;
      z-index: 70;
    }

    .ttd-ddItem {
      padding: 11px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.15px;
      color: rgba(255,255,255,0.88);
      background: transparent;
      transition: background 160ms ease;
    }

    .ttd-ddItem:hover {
      background: rgba(168,85,247,0.14);
    }

    .ttd-ddItemActive {
      background: linear-gradient(90deg, rgba(168,85,247,0.22), rgba(124,58,237,0.12));
      color: #ffffff;
    }

    .ttd-ddItemText {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ttd-ddTick {
      width: 18px;
      height: 18px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(168,85,247,0.25);
      border: 1px solid rgba(168,85,247,0.38);
      color: rgba(255,255,255,0.92);
      flex: 0 0 auto;
    }

    .ttd-ddTickSpacer {
      width: 18px;
      height: 18px;
      flex: 0 0 auto;
    }

    .ttd-exportBtn {
      min-width: 160px;
      height: 40px;
      padding: 0 18px;
      border-radius: 14px;
      border: 1px solid rgba(168,85,247,0.54);
      background: linear-gradient(135deg, rgba(168,85,247,0.98), rgba(124,58,237,0.98));
      color: #ffffff;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.16px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        0 16px 34px rgba(124,58,237,0.28),
        inset 0 1px 0 rgba(255,255,255,0.14);
      transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease, opacity 180ms ease;
    }

    .ttd-exportBtn:hover {
      transform: translateY(-1px);
      filter: brightness(1.03);
      box-shadow:
        0 20px 40px rgba(124,58,237,0.32),
        inset 0 1px 0 rgba(255,255,255,0.18);
    }

    .ttd-exportBtn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
      filter: none;
      box-shadow:
        0 8px 18px rgba(124,58,237,0.18),
        inset 0 1px 0 rgba(255,255,255,0.10);
    }

    
    .ttd-emptyStateNote {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(12, 16, 33, 0.86);
      border: 1px solid rgba(168,85,247,0.22);
      color: rgba(255,255,255,0.72);
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
      pointer-events: none;
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
      .ttd-ddWrap {
        min-width: 100%;
        max-width: 100%;
      }
      .ttd-dateInput,
      .ttd-actionBtn {
        min-width: 100%;
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
            {/* FIX START: premium date controls */}
            <div className="ttd-dateGroup">
              <span className="ttd-dateGroupLabel">Start date</span>
              <PremiumDatePicker
                value={startDate}
                onChange={setStartDate}
                ariaLabel="Dashboard start date"
              />
            </div>

            <div className="ttd-dateGroup">
              <span className="ttd-dateGroupLabel">End date</span>
              <PremiumDatePicker
                value={endDate}
                onChange={setEndDate}
                ariaLabel="Dashboard end date"
              />
            </div>

            <PremiumActionButton onClick={applyRange} disabled={overallLoading}>
              Apply range
            </PremiumActionButton>

            <PremiumActionButton onClick={syncNow} disabled={overallLoading} variant="secondary">
              {overallLoading ? "Syncing..." : "Sync now"}
            </PremiumActionButton>

            <div className="ttd-dateRangePill" title="Applied dashboard range">
              {fmtDateLong(appliedStartDate)} to {fmtDateLong(appliedEndDate)}
            </div>
            {/* FIX END */}

            <div className="ttd-livePill">
              <span className="ttd-liveDot" />
              Cycle view
            </div>
          </div>
        </div>
      </header>

      <div className="ttd-grid4">
        <MetricCard
          title="Cycle Pipeline Value"
          value={formatCurrencyOrText(data.top.totalDebitOrderValue, formatZAR, "Awaiting data", !!attemptsMetrics)}
          subtext={collectionScheduleText}
          trend={
            overallError
              ? "API Error"
              : overallLoading
              ? "Syncing"
              : `${fmtDateShort(appliedStartDate)} to ${fmtDateShort(appliedEndDate)}`
          }
          trendUp={!overallError}
          icon={IconFileInvoice}
          color="purple"
        />

        <MetricCard
          title="Latest Successful Collections"
          value={formatCurrencyOrText(data.top.totalCollected, formatZAR, "Awaiting data", !!attemptsMetrics)}
          subtext={`${formatCountOrText(attemptsToday.success, "No live data", !!attemptsMetrics)} successful items in current reporting period`}
          trend={safeNum(attemptsToday.success) > 0 ? "Successful collections in selected range" : "No successful collections in selected range"}
          trendUp={true}
          icon={IconCheckCircle}
          color="green"
        />

        <MetricCard
          title="Net Collected (Actual)"
          value={formatCurrencyOrText(data.top.estimatedMoneyToBank, formatZAR2, "Awaiting data", !!attemptsMetrics)}
          subtext="Actual collected value less actual fees"
          trend={safeNum(data.top.estimatedMoneyToBank) > 0 ? "Real settlement value available" : "No collected value in selected range"}
          trendUp={true}
          icon={IconWallet}
          color="blue"
        />

        <MetricCard
          title="Exceptions and Fees"
          value={formatCurrencyOrText(data.top.estimatedPaystackFees, formatZAR2, "Awaiting data", !!attemptsMetrics)}
          subtext={`Failed ${formatCountOrText(attemptsToday.failed, "—", !!attemptsMetrics)} • Retry ${formatCountOrText(data.top.retryScheduled, "—", !!attemptsMetrics)}`}
          trend={safeNum(attemptsToday.failed) > 0 || safeNum(data.top.retryScheduled) > 0 ? "Exception queue needs attention" : "Exception queue currently light"}
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
                <p className="ttd-panelSub">Tracks successful, failed, and retry movement across the selected date range</p>
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
                centerValue={formatCountOrText(data.top.retryScheduled)}
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
                        <div className="ttd-legendSub">{formatCountOrText(item.value, "No live data")} scheduled</div>
                      </div>
                    </div>
                    <div className="ttd-legendPct">{formatPercentOrText(item.pct)}</div>
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
                <p className="ttd-panelSub">Snapshot of successful, failed, retry, and suspended activity inside the selected dashboard range</p>
              </div>
            </div>

            <div className="ttd-donutLayout">
              <DonutChart
                centerValue={formatCountOrText(attemptsToday.attempted)}
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
                        <div className="ttd-legendSub">{formatCountOrText(segment.value, "No live data")} items</div>
                      </div>
                    </div>
                    <div className="ttd-legendPct">{formatPercentOrText(segment.pct)}</div>
                  </div>
                ))}
              </div>
            </div>

            {notificationStats?.data ? (
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid rgba(148,163,184,0.18)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      Zepto mail activity
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      {notificationStats.data.total} notifications in selected range
                      {notificationStats.data.zepto?.total
                        ? ` • ${notificationStats.data.zepto.total} via Zepto`
                        : ""}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      background: notificationStats.data.healthy
                        ? "rgba(34,197,94,0.12)"
                        : "rgba(239,68,68,0.14)",
                      color: notificationStats.data.healthy ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {notificationStats.data.healthy ? "Healthy" : "Pressure"}
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {[
                    {
                      label: "Sent",
                      value:
                        (notificationStats.data.counts?.SENT || 0) +
                        (notificationStats.data.counts?.DELIVERED || 0),
                      color: "#22c55e",
                    },
                    {
                      label: "Failed",
                      value: notificationStats.data.counts?.FAILED || 0,
                      color: "#ef4444",
                    },
                    {
                      label: "Queued",
                      value: notificationStats.data.counts?.QUEUED || 0,
                      color: "#f59e0b",
                    },
                    {
                      label: "Bounced",
                      value: notificationStats.data.counts?.BOUNCED || 0,
                      color: "#8b5cf6",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        background: "rgba(15,23,42,0.4)",
                        border: "1px solid rgba(148,163,184,0.14)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          opacity: 0.7,
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: s.color,
                          marginTop: 2,
                        }}
                      >
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    opacity: 0.78,
                  }}
                >
                  Success rate:{" "}
                  <strong>{notificationStats.data.successRate}%</strong>
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="ttd-card">
          <div className="ttd-panel">
            <div className="ttd-panelHeader">
              <div>
                <h3 className="ttd-panelTitle">Cycle health and pressure</h3>
                <p className="ttd-panelSub">Fast finance view for selected range health, exception pressure, and collection quality</p>
              </div>
            </div>

            <div className="ttd-opGrid">
              <div className="ttd-opStat">
                <div className="ttd-opLabel">
                  <span className="ttd-miniDot" style={{ background: "#22c55e" }} />
                  Success rate
                </div>
                <div className="ttd-opValue">{formatPercentOrText(data.top.successRate, "Awaiting data")}</div>
                <div className="ttd-opSub">Based on the selected dashboard summary window</div>
              </div>

              <div className="ttd-opStat">
                <div className="ttd-opLabel">
                  <span className="ttd-miniDot" style={{ background: "#ef4444" }} />
                  Failure rate
                </div>
                <div className="ttd-opValue">{formatPercentOrText(data.top.failureRate, "Awaiting data")}</div>
                <div className="ttd-opSub">Tracks failed collection pressure</div>
              </div>

              <div className="ttd-opStat">
                <div className="ttd-opLabel">
                  <span className="ttd-miniDot" style={{ background: "#8b5cf6" }} />
                  Retry rate
                </div>
                <div className="ttd-opValue">{formatPercentOrText(data.top.retryRate, "Awaiting data")}</div>
                <div className="ttd-opSub">Indicates follow-up load between collection windows</div>
              </div>

              <div className="ttd-opStat">
                <div className="ttd-opLabel">
                  <span className="ttd-miniDot" style={{ background: "#60a5fa" }} />
                  Last run result
                </div>
                <div className="ttd-opValue">
                  {formatRunStatusOrText(lastRun?.runStatus || lastRun?.result)}
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

              <div className={cx("ttd-financeValue", !data.monthlyMRR && !attemptsMetrics && "ttd-financeValueMuted")}>
                {formatCurrencyOrText(data.monthlyMRR, formatZAR, "Awaiting source", !!attemptsMetrics)}
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

              <div className={cx("ttd-financeValue", !data.annualARR && !attemptsMetrics && "ttd-financeValueMuted")}>
                {formatCurrencyOrText(data.annualARR, formatZAR, "Awaiting source", !!attemptsMetrics)}
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

              <PremiumBatchDropdown
                value={selectedBatch}
                options={batchDropdownOptions}
                onChange={setSelectedBatch}
              />
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
                  {!filteredBatches.length ? (
                    <tr>
                      <td className="ttd-td" colSpan={4} style={{ textAlign: "center", color: "rgba(255,255,255,0.62)" }}>
                        No recent runs available for the selected range
                      </td>
                    </tr>
                  ) : null}
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
                      <td className="ttd-td" style={{ textAlign: "right" }}>{hasNonZeroValue(b.items) ? safeNum(b.items) : "—"}</td>
                      <td className="ttd-td" style={{ textAlign: "right" }}>{hasNonZeroValue(b.value) ? formatZAR(b.value) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
              <button
                className="ttd-exportBtn"
                onClick={handleExportVisibleBatches}
                disabled={!filteredBatches.length}
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
