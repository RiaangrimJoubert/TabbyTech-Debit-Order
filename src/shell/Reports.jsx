import React, { useEffect, useMemo, useRef, useState } from "react";

const REPORTS_CACHE_TTL_MS = 5 * 60 * 1000;

let reportsScreenCache = {
  startDate: "",
  endDate: "",
  perPage: 10,
  query: "",
  outcomeFilter: "All",
  summaryData: null,
  attemptsData: null,
  loading: false,
  error: "",
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

function hasFreshReportsCache() {
  return (
    reportsScreenCache.summaryData &&
    reportsScreenCache.attemptsData &&
    Date.now() - Number(reportsScreenCache.lastLoadedAt || 0) < REPORTS_CACHE_TTL_MS
  );
}

function safeNum(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v) {
  return String(v == null ? "" : v).trim();
}

function moneyZar(v) {
  return safeNum(v).toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  });
}

function moneyZar2(v) {
  return safeNum(v).toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function fmtDateShort(v) {
  if (!v) return "";
  const d = new Date(String(v).length <= 10 ? `${v}T00:00:00` : v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-ZA", {
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

function estimatePaystackFeeLocal(amount) {
  const n = safeNum(amount);
  if (n <= 0) return 0;
  const percentFee = n * 0.029;
  const flatFee = n < 10 ? 0 : 1;
  return percentFee + flatFee;
}

function getApiBase() {
  const v = safeStr(import.meta.env.VITE_API_BASE_URL);
  return v || "";
}

async function fetchJson(path) {
  const base = getApiBase();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `Request failed ${res.status}`);
  }

  return json;
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
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

function polarToCartesian(cx, cy, radius, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
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
  const line = makeLinePath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x.toFixed(2)} ${baseY.toFixed(2)} L ${first.x.toFixed(
    2
  )} ${baseY.toFixed(2)} Z`;
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
    <div ref={wrapRef} className="ttr-datePickerWrap">
      <button
        type="button"
        className={open ? "ttr-dateInput ttr-dateInputOpen" : "ttr-dateInput"}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((x) => !x)}
      >
        <span>{value || "Select date"}</span>
        <span className="ttr-dateCaret">▾</span>
      </button>

      {open && (
        <div className="ttr-datePopup" role="dialog" aria-label={ariaLabel}>
          <div className="ttr-datePopupHead">
            <button
              type="button"
              className="ttr-dateNavBtn"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              aria-label="Previous month"
            >
              ‹
            </button>

            <div className="ttr-dateMonthLabel">{formatPickerMonth(viewDate)}</div>

            <button
              type="button"
              className="ttr-dateNavBtn"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="ttr-dateWeekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="ttr-dateWeekday">
                {d}
              </div>
            ))}
          </div>

          <div className="ttr-dateGrid">
            {cells.map((cell) => {
              if (cell.type === "empty") {
                return <div key={cell.key} className="ttr-dateCell ttr-dateCellEmpty" />;
              }

              const cls = [
                "ttr-dateCell",
                "ttr-dateCellDay",
                cell.isSelected ? "ttr-dateCellSelected" : "",
                cell.isToday ? "ttr-dateCellToday" : "",
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

function RecordsDropdown({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useOnClickOutside(wrapRef, () => setOpen(false));

  const options = [
    { value: 10, label: "10 records" },
    { value: 20, label: "20 records" },
    { value: 50, label: "50 records" },
    { value: 100, label: "100 records" },
  ];

  const active = options.find((o) => o.value === value) || options[0];

  function select(v) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="ttr-ddWrap">
      <span className="ttr-ddLabel">Records</span>

      <div className="ttr-ddRel">
        <button
          type="button"
          className={open ? "ttr-ddBtn ttr-ddBtnOpen" : "ttr-ddBtn"}
          onClick={() => {
            if (disabled) return;
            setOpen((x) => !x);
          }}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span>{active.label}</span>
          <span className="ttr-ddCaret">▾</span>
        </button>

        {open && (
          <div className="ttr-ddMenu" role="listbox" aria-label="Records per page">
            {options.map((o, idx) => {
              const isActive = o.value === value;
              return (
                <div
                  key={o.value}
                  role="option"
                  aria-selected={isActive}
                  className={isActive ? "ttr-ddItem ttr-ddItemActive" : "ttr-ddItem"}
                  style={{
                    borderBottom:
                      idx === options.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)",
                  }}
                  onClick={() => select(o.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") select(o.value);
                  }}
                  tabIndex={0}
                >
                  <span>{o.label}</span>
                  {isActive ? <span className="ttr-ddTick">✓</span> : <span style={{ width: 18 }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function outcomeBadgeClass(outcome) {
  if (outcome === "Successful") return "ttr-badge ttr-b-success";
  if (outcome === "Retry Scheduled") return "ttr-badge ttr-b-retry";
  if (outcome === "Failed") return "ttr-badge ttr-b-failed";
  if (outcome === "Suspended") return "ttr-badge ttr-b-suspended";
  return "ttr-badge ttr-b-pending";
}

function exportReportsCsv(rows) {
  const header = [
    "Client ID",
    "Charge Date",
    "Charge Day",
    "Status",
    "Outcome",
    "Reference",
    "Failure Reason",
    "Attempted At",
    "Amount",
  ];

  const body = rows.map((row) => [
    row.clientId || "",
    row.chargeDate || "",
    row.chargeDay || "",
    row.status || "",
    row.outcome || "",
    row.reference || "",
    row.failureReason || "",
    row.attemptedAt || "",
    safeNum(row.amountZar),
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
  a.download = `tabbytech-reports-${todayYmdLocal()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function IconSearch({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="2"
      />
      <path
        d="M16.2 16.2 21 21"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DonutChart({
  size = 190,
  strokeWidth = 18,
  centerValue,
  centerLabel,
  segments,
}) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  let angleCursor = 0;

  return (
    <div className="ttr-donutSvgWrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ttr-donutSvg">
        <defs>
          <linearGradient id="ttrDonutTrack" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
          </linearGradient>
        </defs>

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
            const value = safeNum(segment.value);
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
                opacity="0.98"
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

      <div className="ttr-donutCenter">
        <div className="ttr-donutCenterValue">{centerValue}</div>
        <div className="ttr-donutCenterLabel">{centerLabel}</div>
      </div>
    </div>
  );
}

function LineTrendChart({ rows, totalCollected }) {
  const data = Array.isArray(rows) ? rows.slice(-12) : [];
  const hasData = data.length > 0;

  const chartWidth = 100;
  const chartHeight = 250;
  const leftPad = 8;
  const rightPad = 8;
  const topPad = 16;
  const bottomPad = 32;
  const innerW = chartWidth - leftPad - rightPad;
  const innerH = chartHeight - topPad - bottomPad;

  const series = hasData
    ? data.map((item) => safeNum(item.amountZar ?? item.collectedZar ?? item.value ?? item.total ?? 0))
    : [];

  const maxY = Math.max(1, ...series);
  const points = hasData
    ? data.map((item, idx) => {
        const x =
          leftPad + (data.length === 1 ? innerW / 2 : (idx / (data.length - 1)) * innerW);
        const value = safeNum(item.amountZar ?? item.collectedZar ?? item.value ?? item.total ?? 0);
        const y = topPad + innerH - (value / maxY) * innerH;
        return { x, y, value, label: fmtDateShort(item.date || item.period || item.label) };
      })
    : [];

  const linePath = makeLinePath(points);
  const areaPath = makeAreaPath(points, topPad + innerH);
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((step) => topPad + innerH * step);

  return (
    <div className="ttr-lineChartShell">
      <div className="ttr-chartTopMeta">
        <div>
          <div className="ttr-chartBigValue">{moneyZar(totalCollected)}</div>
          <div className="ttr-chartMiniText">Collected across visible range</div>
        </div>
        <div className="ttr-chartMiniPill">
          <span className="ttr-miniDot ttr-dot-green" />
          Collection trend
        </div>
      </div>

      {hasData ? (
        <>
          <div className="ttr-lineChartArea">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="ttrLineFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34,197,94,0.34)" />
                  <stop offset="100%" stopColor="rgba(34,197,94,0.02)" />
                </linearGradient>
                <linearGradient id="ttrLineStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(168,85,247,1)" />
                  <stop offset="100%" stopColor="rgba(34,197,94,1)" />
                </linearGradient>
              </defs>

              {gridLines.map((y, idx) => (
                <line
                  key={`grid-${idx}`}
                  x1={leftPad}
                  x2={chartWidth - rightPad}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="2 4"
                />
              ))}

              <path d={areaPath} fill="url(#ttrLineFill)" />
              <path
                d={linePath}
                fill="none"
                stroke="url(#ttrLineStroke)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {points.map((p, idx) => (
                <g key={`point-${idx}`}>
                  <circle cx={p.x} cy={p.y} r="3.2" fill="rgba(255,255,255,0.96)" />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="6"
                    fill="rgba(168,85,247,0.18)"
                    stroke="rgba(168,85,247,0.28)"
                  />
                </g>
              ))}
            </svg>
          </div>

          <div className="ttr-lineXAxis">
            {points.map((p, idx) => (
              <div key={`label-${idx}`} className="ttr-lineXAxisLabel">
                {p.label || `P${idx + 1}`}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="ttr-empty">No collection trend data returned for the selected date range.</div>
      )}
    </div>
  );
}

function ActivityBarChart({ rows }) {
  const data = Array.isArray(rows) ? rows.slice(-12) : [];
  const values = data.map((item) => safeNum(item.attempts));
  const maxVal = Math.max(1, ...values);

  return (
    <div className="ttr-barsShell">
      <div className="ttr-chartTopMeta">
        <div>
          <div className="ttr-chartBigValue">{values.reduce((sum, v) => sum + v, 0)}</div>
          <div className="ttr-chartMiniText">Total attempts in visible intervals</div>
        </div>
        <div className="ttr-chartMiniPill">
          <span className="ttr-miniDot ttr-dot-purple" />
          Activity trend
        </div>
      </div>

      {data.length ? (
        <div className="ttr-barsWrap">
          {data.map((item, idx) => {
            const value = safeNum(item.attempts);
            const heightPct = Math.max(10, (value / maxVal) * 100);
            const isAccent = idx >= data.length - 2;
            return (
              <div key={`activity-${idx}`} className="ttr-barCol">
                <div className="ttr-barValue">{value}</div>
                <div
                  className={isAccent ? "ttr-bar ttr-barAccent" : "ttr-bar"}
                  style={{ height: `${heightPct}%` }}
                />
                <div className="ttr-barLabel">{fmtDateShort(item.date || item.period || item.label)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ttr-empty">No activity trend data returned for the selected date range.</div>
      )}
    </div>
  );
}

export default function Reports() {
  const [startDate, setStartDate] = useState(() => reportsScreenCache.startDate || startOfMonthYmdLocal());
  const [endDate, setEndDate] = useState(() => reportsScreenCache.endDate || todayYmdLocal());
  const [perPage, setPerPage] = useState(() => Number(reportsScreenCache.perPage || 10));
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(() => String(reportsScreenCache.query || ""));
  const [outcomeFilter, setOutcomeFilter] = useState(() => String(reportsScreenCache.outcomeFilter || "All"));
  const [loading, setLoading] = useState(() => !hasFreshReportsCache());
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(() => String(reportsScreenCache.error || ""));
  const [summaryData, setSummaryData] = useState(() => reportsScreenCache.summaryData || null);
  const [attemptsData, setAttemptsData] = useState(() => reportsScreenCache.attemptsData || null);

  async function fetchReports({ force = false } = {}) {
    if (!force && hasFreshReportsCache()) {
      setSummaryData(reportsScreenCache.summaryData);
      setAttemptsData(reportsScreenCache.attemptsData);
      setError(reportsScreenCache.error || "");
      setLoading(false);
      return;
    }

    try {
      setError("");
      setLoading(true);
      setSyncing(true);

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

      const [summaryJson, attemptsJson] = await Promise.all([
        fetchJson(`/api/reports/summary?${summaryQs.toString()}`),
        fetchJson(`/api/reports/attempts?${attemptsQs.toString()}`),
      ]);

      setSummaryData(summaryJson);
      setAttemptsData(attemptsJson);

      reportsScreenCache = {
        ...reportsScreenCache,
        startDate,
        endDate,
        perPage,
        query,
        outcomeFilter,
        summaryData: summaryJson,
        attemptsData: attemptsJson,
        error: "",
        lastLoadedAt: Date.now(),
      };
    } catch (e) {
      const msg = String(e?.message || e);
      setError(msg);
      reportsScreenCache = {
        ...reportsScreenCache,
        error: msg,
      };
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  useEffect(() => {
    reportsScreenCache = {
      ...reportsScreenCache,
      startDate,
      endDate,
      perPage,
      query,
      outcomeFilter,
      summaryData,
      attemptsData,
      error,
    };
  }, [startDate, endDate, perPage, query, outcomeFilter, summaryData, attemptsData, error]);

  useEffect(() => {
    fetchReports({ force: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, outcomeFilter, perPage, startDate, endDate]);

  const summaryPayload = summaryData?.data || {};
  const cards = summaryPayload?.cards || {};
  const charts = summaryPayload?.charts || {};
  const attemptsRowsRaw = Array.isArray(attemptsData?.data?.attempts?.rows)
    ? attemptsData.data.attempts.rows
    : Array.isArray(attemptsData?.rows)
    ? attemptsData.rows
    : [];

  const attemptsRows = useMemo(() => {
    return attemptsRowsRaw.map((row, index) => ({
      id: row.rowId || `attempt-${index + 1}`,
      clientId: safeStr(row.clientId),
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

  const filteredRowsAll = useMemo(() => {
    const q = query.trim().toLowerCase();

    return attemptsRows.filter((row) => {
      const matchesOutcome =
        outcomeFilter === "All" ? true : String(row.outcome) === String(outcomeFilter);

      const matchesQuery =
        !q ||
        String(row.clientId || "").toLowerCase().includes(q) ||
        String(row.id || "").toLowerCase().includes(q) ||
        String(row.reference || "").toLowerCase().includes(q) ||
        String(row.failureReason || "").toLowerCase().includes(q) ||
        String(row.status || "").toLowerCase().includes(q);

      return matchesOutcome && matchesQuery;
    });
  }, [attemptsRows, query, outcomeFilter]);

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(filteredRowsAll.length / perPage));
  }, [filteredRowsAll.length, perPage]);

  const currentPage = Math.min(page, pageCount);

  const pagedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * perPage;
    return filteredRowsAll.slice(startIndex, startIndex + perPage);
  }, [filteredRowsAll, perPage, currentPage]);

  const successfulRows = useMemo(() => {
    return filteredRowsAll.filter((row) => row.outcome === "Successful");
  }, [filteredRowsAll]);

  const failedRows = useMemo(() => {
    return filteredRowsAll.filter((row) => row.outcome === "Failed");
  }, [filteredRowsAll]);

  const retryRows = useMemo(() => {
    return filteredRowsAll.filter((row) => row.outcome === "Retry Scheduled");
  }, [filteredRowsAll]);

  const suspendedRows = useMemo(() => {
    return filteredRowsAll.filter((row) => row.outcome === "Suspended");
  }, [filteredRowsAll]);

  const pendingRows = useMemo(() => {
    return filteredRowsAll.filter((row) => row.outcome === "Pending");
  }, [filteredRowsAll]);

  const totalAttempts = safeNum(cards.processedAttempts || filteredRowsAll.length);
  const successRate = safeNum(cards.successRate);
  const failureRate = safeNum(cards.failureRate);
  const retryRate = safeNum(cards.retryRate);
  const uniqueClients = safeNum(
    cards.uniqueClients || new Set(filteredRowsAll.map((r) => r.clientId).filter(Boolean)).size
  );

  const totalDebitOrderValue =
    safeNum(cards.totalDebitOrderValue) ||
    filteredRowsAll.reduce((sum, row) => sum + safeNum(row.amountZar), 0);

  const totalCollected =
    safeNum(cards.totalCollected) ||
    successfulRows.reduce((sum, row) => sum + safeNum(row.amountZar), 0);

  const totalFailedValue =
    safeNum(cards.totalFailedValue) ||
    failedRows.reduce((sum, row) => sum + safeNum(row.amountZar), 0);

  const totalRetryScheduledValue =
    safeNum(cards.totalRetryScheduledValue) ||
    retryRows.reduce((sum, row) => sum + safeNum(row.amountZar), 0);

  const estimatedPaystackFees =
    safeNum(cards.estimatedPaystackFees) ||
    successfulRows.reduce((sum, row) => sum + estimatePaystackFeeLocal(row.amountZar), 0);

  const estimatedMoneyToBank =
    safeNum(cards.estimatedMoneyToBank) ||
    Math.max(0, totalCollected - estimatedPaystackFees);

  const collectionRate =
    totalDebitOrderValue > 0 ? (totalCollected / totalDebitOrderValue) * 100 : successRate;

  const distributionTotal = filteredRowsAll.length || 1;
  const successfulPct = (successfulRows.length / distributionTotal) * 100;
  const retryPct = (retryRows.length / distributionTotal) * 100;
  const failedPct = (failedRows.length / distributionTotal) * 100;
  const suspendedPct = (suspendedRows.length / distributionTotal) * 100;
  const pendingPct = (pendingRows.length / distributionTotal) * 100;

  const activityTrend = Array.isArray(charts.activityTrend) ? charts.activityTrend : [];
  const outcomeDistribution = Array.isArray(charts.outcomeDistribution) ? charts.outcomeDistribution : [];
  const trendRows = Array.isArray(charts.collectionTrend) ? charts.collectionTrend : [];
  const filters = summaryPayload?.filters || {};

  const outcomeMap = useMemo(() => {
    const byKey = {
      Successful: successfulRows.length,
      Failed: failedRows.length,
      "Retry Scheduled": retryRows.length,
      Suspended: suspendedRows.length,
      Pending: pendingRows.length,
    };

    if (outcomeDistribution.length) {
      outcomeDistribution.forEach((item) => {
        const label = normalizeOutcome(item.label || item.key || item.status);
        byKey[label] = safeNum(item.value);
      });
    }

    return byKey;
  }, [outcomeDistribution, successfulRows.length, failedRows.length, retryRows.length, suspendedRows.length, pendingRows.length]);

  const outcomeTotal = Math.max(
    1,
    safeNum(outcomeMap.Successful) +
      safeNum(outcomeMap.Failed) +
      safeNum(outcomeMap["Retry Scheduled"]) +
      safeNum(outcomeMap.Suspended) +
      safeNum(outcomeMap.Pending)
  );

  const outcomeSegments = [
    {
      label: "Successful",
      value: safeNum(outcomeMap.Successful),
      pct: (safeNum(outcomeMap.Successful) / outcomeTotal) * 100,
      color: "#22c55e",
    },
    {
      label: "Retry Scheduled",
      value: safeNum(outcomeMap["Retry Scheduled"]),
      pct: (safeNum(outcomeMap["Retry Scheduled"]) / outcomeTotal) * 100,
      color: "#f59e0b",
    },
    {
      label: "Failed",
      value: safeNum(outcomeMap.Failed),
      pct: (safeNum(outcomeMap.Failed) / outcomeTotal) * 100,
      color: "#ef4444",
    },
    {
      label: "Suspended",
      value: safeNum(outcomeMap.Suspended),
      pct: (safeNum(outcomeMap.Suspended) / outcomeTotal) * 100,
      color: "#a855f7",
    },
    {
      label: "Pending",
      value: safeNum(outcomeMap.Pending),
      pct: (safeNum(outcomeMap.Pending) / outcomeTotal) * 100,
      color: "#60a5fa",
    },
  ];

  const valueRemaining = Math.max(0, totalDebitOrderValue - totalCollected);
  const valueSegments = [
    {
      label: "Collected",
      value: totalCollected,
      pct: totalDebitOrderValue > 0 ? (totalCollected / totalDebitOrderValue) * 100 : 0,
      color: "#22c55e",
    },
    {
      label: "Fees",
      value: Math.min(estimatedPaystackFees, Math.max(totalDebitOrderValue, estimatedPaystackFees)),
      pct: totalDebitOrderValue > 0 ? (estimatedPaystackFees / totalDebitOrderValue) * 100 : 0,
      color: "#60a5fa",
    },
    {
      label: "Remaining",
      value: valueRemaining,
      pct: totalDebitOrderValue > 0 ? (valueRemaining / totalDebitOrderValue) * 100 : 0,
      color: "#7c3aed",
    },
  ];

  const topCards = [
    {
      label: "Total Debit Order Value",
      value: moneyZar(totalDebitOrderValue),
      meta: `${totalAttempts} processed attempts`,
      icon: "R",
      variant: "primary",
    },
    {
      label: "Total Collected",
      value: moneyZar(totalCollected),
      meta: `${successfulRows.length} successful`,
      icon: "✓",
      variant: "success",
    },
    {
      label: "Money To Bank",
      value: moneyZar2(estimatedMoneyToBank),
      meta: "Net after estimated fees",
      icon: "B",
      variant: "net",
    },
    {
      label: "Paystack Fees",
      value: moneyZar2(estimatedPaystackFees),
      meta: "Estimated fee exposure",
      icon: "%",
      variant: "fees",
    },
  ];

  const css = `
  .ttr-root {
    width: 100%;
    height: 100%;
    color: rgba(255,255,255,0.92);
    --ttr-purple: rgba(124,58,237,0.95);
    --ttr-purple2: rgba(168,85,247,0.95);
    --ttr-green: rgba(34,197,94,0.95);
    --ttr-red: rgba(239,68,68,0.95);
    --ttr-amber: rgba(245,158,11,0.95);
    --ttr-blue: rgba(96,165,250,0.95);
    --ttr-bg-deep: rgba(6,8,20,0.92);
  }

  .ttr-wrap {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .ttr-head h1 {
    margin: 0;
    font-size: 26px;
    letter-spacing: 0.2px;
    color: rgba(255,255,255,0.92);
  }

  .ttr-head p {
    margin: 6px 0 0 0;
    font-size: 13px;
    color: rgba(255,255,255,0.62);
    line-height: 1.4;
  }

  .ttr-glass {
    border-radius: 22px;
    border: 1px solid rgba(255,255,255,0.10);
    background:
      radial-gradient(circle at top right, rgba(124,58,237,0.16), transparent 28%),
      linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
    box-shadow: 0 18px 50px rgba(0,0,0,0.35);
    backdrop-filter: blur(14px);
    overflow: hidden;
    min-height: 0;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .ttr-panelHeader {
    padding: 16px 16px 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.12);
    flex-wrap: wrap;
  }

  .ttr-title {
    font-size: 14px;
    font-weight: 900;
    color: rgba(255,255,255,0.90);
    margin: 0;
  }

  .ttr-meta {
    margin: 2px 0 0 0;
    font-size: 12px;
    color: rgba(255,255,255,0.58);
  }

  .ttr-headerActions {
    display: flex;
    align-items: end;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .ttr-fieldWrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ttr-label {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.2px;
    color: rgba(255,255,255,0.62);
  }

  .ttr-datePickerWrap { position: relative; }

  .ttr-dateInput {
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

  .ttr-dateInput:hover {
    border-color: rgba(168,85,247,0.90);
    box-shadow: 0 12px 28px rgba(124,58,237,0.22);
    transform: translateY(-1px);
  }

  .ttr-dateInputOpen {
    border-color: rgba(168,85,247,0.95);
    box-shadow:
      0 0 0 4px rgba(124,58,237,0.20),
      0 16px 34px rgba(124,58,237,0.26);
  }

  .ttr-dateCaret { opacity: 0.96; font-size: 12px; }

  .ttr-datePopup {
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
    animation: ttrDatePopIn 140ms ease-out;
  }

  @keyframes ttrDatePopIn {
    from { opacity: 0; transform: translateY(6px) scale(0.985); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .ttr-datePopupHead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }

  .ttr-dateMonthLabel {
    font-size: 13px;
    font-weight: 900;
    color: rgba(255,255,255,0.94);
    letter-spacing: 0.15px;
  }

  .ttr-dateNavBtn {
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

  .ttr-dateNavBtn:hover {
    background: rgba(168,85,247,0.26);
    border-color: rgba(168,85,247,0.50);
  }

  .ttr-dateWeekdays,
  .ttr-dateGrid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 6px;
  }

  .ttr-dateWeekdays { margin-bottom: 6px; }

  .ttr-dateWeekday {
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    color: rgba(255,255,255,0.50);
  }

  .ttr-dateCell {
    min-height: 34px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
  }

  .ttr-dateCellEmpty {
    pointer-events: none;
    opacity: 0;
  }

  .ttr-dateCellDay {
    color: rgba(255,255,255,0.90);
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .ttr-dateCellDay:hover {
    background: rgba(168,85,247,0.18);
    border-color: rgba(168,85,247,0.26);
  }

  .ttr-dateCellToday {
    border-color: rgba(168,85,247,0.42);
    box-shadow: inset 0 0 0 1px rgba(168,85,247,0.12);
  }

  .ttr-dateCellSelected {
    background: linear-gradient(135deg, var(--ttr-purple2), var(--ttr-purple));
    border-color: rgba(168,85,247,0.80);
    color: #fff;
    box-shadow: 0 10px 22px rgba(124,58,237,0.28);
  }

  .ttr-btn {
    height: 40px;
    padding: 0 16px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.88);
    display: inline-flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;
    transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.2px;
    white-space: nowrap;
  }

  .ttr-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(0,0,0,0.28);
  }

  .ttr-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .ttr-btnPrimary {
    background: linear-gradient(135deg, var(--ttr-purple2), var(--ttr-purple));
    border-color: rgba(124,58,237,0.55);
    box-shadow: 0 14px 34px rgba(124,58,237,0.28);
    color: #fff;
  }

  .ttr-pageBtn {
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

  .ttr-pageBtn:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 32px rgba(124,58,237,0.32);
  }

  .ttr-pageBtn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .ttr-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
  }

  .ttr-cardGrid4 {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .ttr-cardGrid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .ttr-cardGridCharts {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 16px;
  }

  .ttr-metric {
    min-height: 128px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.10);
    padding: 16px;
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(circle at 85% 120%, rgba(124,58,237,0.22), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.94) 0%, rgba(12,18,48,0.84) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.04),
      0 18px 40px rgba(0,0,0,0.24);
  }

  .ttr-metric.success {
    background:
      radial-gradient(circle at 85% 120%, rgba(16,185,129,0.24), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.94) 0%, rgba(12,18,48,0.84) 100%);
  }

  .ttr-metric.fees {
    background:
      radial-gradient(circle at 85% 120%, rgba(59,130,246,0.24), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.94) 0%, rgba(12,18,48,0.84) 100%);
  }

  .ttr-metric.net {
    background:
      radial-gradient(circle at 85% 120%, rgba(34,197,94,0.18), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.94) 0%, rgba(12,18,48,0.84) 100%);
  }

  .ttr-metricLabel {
    font-size: 12px;
    color: rgba(255,255,255,0.62);
    margin: 0;
    letter-spacing: 0.2px;
  }

  .ttr-metricValue {
    font-size: 24px;
    line-height: 1.1;
    font-weight: 900;
    color: rgba(255,255,255,0.98);
    margin: 20px 0 8px 0;
  }

  .ttr-metricMeta {
    font-size: 12px;
    color: rgba(255,255,255,0.60);
    margin: 0;
  }

  .ttr-iconChip {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 30px;
    height: 30px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    font-size: 13px;
    font-weight: 900;
    border: 1px solid rgba(255,255,255,0.10);
    color: rgba(255,255,255,0.92);
  }

  .ttr-ico-purple { background: rgba(124,58,237,0.35); }
  .ttr-ico-green { background: rgba(16,185,129,0.28); }
  .ttr-ico-blue { background: rgba(59,130,246,0.24); }

  .ttr-panel {
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.10);
    background:
      linear-gradient(180deg, rgba(8,12,27,0.72) 0%, rgba(8,12,27,0.52) 100%);
    overflow: hidden;
    box-shadow: 0 16px 34px rgba(0,0,0,0.18);
  }

  .ttr-panelTop {
    padding: 14px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.12);
  }

  .ttr-panelHeading {
    margin: 0;
    font-size: 14px;
    font-weight: 900;
    color: rgba(255,255,255,0.90);
  }

  .ttr-panelSub {
    margin: 2px 0 0 0;
    font-size: 12px;
    color: rgba(255,255,255,0.56);
  }

  .ttr-panelBody {
    padding: 16px;
  }

  .ttr-progressWrap { margin-top: 12px; }

  .ttr-progressHead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: rgba(255,255,255,0.72);
    font-size: 12px;
    margin-bottom: 8px;
  }

  .ttr-progressTrack {
    height: 11px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.06);
  }

  .ttr-progressFill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95));
  }

  .ttr-miniGrid4 {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-top: 14px;
  }

  .ttr-miniStat {
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    padding: 12px;
  }

  .ttr-miniLabel {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: rgba(255,255,255,0.62);
  }

  .ttr-miniDot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    display: inline-block;
  }

  .ttr-dot-green { background: #22c55e; }
  .ttr-dot-amber { background: #f59e0b; }
  .ttr-dot-red { background: #ef4444; }
  .ttr-dot-purple { background: #a855f7; }
  .ttr-dot-blue { background: #60a5fa; }

  .ttr-miniValue {
    margin-top: 8px;
    font-size: 14px;
    font-weight: 900;
    color: rgba(255,255,255,0.96);
  }

  .ttr-donutGrid {
    display: grid;
    grid-template-columns: 220px 1fr;
    align-items: center;
    gap: 16px;
  }

  .ttr-donutSvgWrap {
    position: relative;
    width: 190px;
    height: 190px;
    margin: 0 auto;
  }

  .ttr-donutSvg {
    display: block;
    filter: drop-shadow(0 14px 28px rgba(0,0,0,0.28));
  }

  .ttr-donutCenter {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    pointer-events: none;
  }

  .ttr-donutCenterValue {
    font-size: 24px;
    font-weight: 900;
    line-height: 1;
    color: rgba(255,255,255,0.96);
  }

  .ttr-donutCenterLabel {
    margin-top: 6px;
    font-size: 11px;
    color: rgba(255,255,255,0.56);
  }

  .ttr-shareStack {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .ttr-shareCard {
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .ttr-shareLeft {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .ttr-shareSwatch {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    flex: 0 0 auto;
  }

  .ttr-shareMeta {
    min-width: 0;
  }

  .ttr-shareLabel {
    font-size: 12px;
    color: rgba(255,255,255,0.82);
    font-weight: 800;
  }

  .ttr-shareSub {
    margin-top: 2px;
    font-size: 11px;
    color: rgba(255,255,255,0.52);
  }

  .ttr-sharePct {
    font-size: 15px;
    font-weight: 900;
    color: rgba(255,255,255,0.95);
    white-space: nowrap;
  }

  .ttr-chartTopMeta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .ttr-chartBigValue {
    font-size: 22px;
    font-weight: 900;
    color: rgba(255,255,255,0.96);
  }

  .ttr-chartMiniText {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(255,255,255,0.56);
  }

  .ttr-chartMiniPill {
    height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 800;
    color: rgba(255,255,255,0.82);
  }

  .ttr-lineChartShell,
  .ttr-barsShell {
    min-height: 100%;
  }

  .ttr-lineChartArea {
    height: 250px;
    width: 100%;
  }

  .ttr-lineChartArea svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .ttr-lineXAxis {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 4px;
    margin-top: 10px;
  }

  .ttr-lineXAxisLabel {
    font-size: 10px;
    text-align: center;
    color: rgba(255,255,255,0.48);
    line-height: 1.2;
  }

  .ttr-barsWrap {
    min-height: 250px;
    height: 250px;
    display: flex;
    align-items: end;
    gap: 8px;
    padding-top: 8px;
  }

  .ttr-barCol {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .ttr-barValue {
    font-size: 11px;
    color: rgba(255,255,255,0.66);
    font-weight: 800;
  }

  .ttr-bar {
    width: 100%;
    max-width: 34px;
    min-height: 12px;
    border-radius: 14px 14px 8px 8px;
    background: linear-gradient(180deg, rgba(168,85,247,0.95), rgba(124,58,237,0.72));
    border: 1px solid rgba(168,85,247,0.35);
    box-shadow: 0 12px 28px rgba(124,58,237,0.20);
  }

  .ttr-barAccent {
    background: linear-gradient(180deg, rgba(34,197,94,0.95), rgba(16,185,129,0.72));
    border: 1px solid rgba(34,197,94,0.35);
    box-shadow: 0 12px 28px rgba(16,185,129,0.18);
  }

  .ttr-barLabel {
    font-size: 10px;
    color: rgba(255,255,255,0.48);
    text-align: center;
    line-height: 1.2;
  }

  .ttr-searchRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  .ttr-inputWrap {
    position: relative;
    flex: 1 1 360px;
    max-width: 520px;
  }

  .ttr-inputIcon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.75;
  }

  .ttr-input {
    width: 100%;
    height: 38px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.18);
    color: rgba(255,255,255,0.88);
    outline: none;
    padding: 0 12px 0 38px;
    font-size: 13px;
  }

  .ttr-input:focus {
    border-color: rgba(124,58,237,0.45);
    box-shadow: 0 0 0 6px rgba(124,58,237,0.18);
  }

  .ttr-chipRow {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  .ttr-chip {
    height: 34px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.76);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.2px;
    user-select: none;
  }

  .ttr-chipActive {
    border-color: rgba(124,58,237,0.55);
    background: rgba(124,58,237,0.16);
    color: rgba(255,255,255,0.92);
  }

  .ttr-tableWrap { overflow: auto; }

  .ttr-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
  }

  .ttr-th {
    text-align: left;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.2px;
    color: rgba(255,255,255,0.62);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(10,10,14,0.78);
  }

  .ttr-td {
    padding: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.80);
    white-space: nowrap;
  }

  .ttr-empty {
    padding: 18px 14px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.62);
    font-size: 13px;
  }

  .ttr-badge {
    height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.2px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.88);
  }

  .ttr-b-success { border-color: rgba(34,197,94,0.30); background: rgba(34,197,94,0.14); }
  .ttr-b-retry { border-color: rgba(245,158,11,0.32); background: rgba(245,158,11,0.16); }
  .ttr-b-failed { border-color: rgba(239,68,68,0.32); background: rgba(239,68,68,0.16); }
  .ttr-b-suspended { border-color: rgba(168,85,247,0.32); background: rgba(168,85,247,0.16); }
  .ttr-b-pending { border-color: rgba(59,130,246,0.28); background: rgba(59,130,246,0.14); }

  .ttr-footerBar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    color: rgba(255,255,255,0.56);
    font-size: 12px;
    margin-top: 2px;
  }

  .ttr-ddWrap { display: inline-flex; align-items: center; gap: 10px; }
  .ttr-ddLabel { font-size: 12px; color: rgba(255,255,255,0.55); font-weight: 800; }
  .ttr-ddRel { position: relative; display: inline-block; }

  .ttr-ddBtn {
    height: 34px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid rgba(168,85,247,0.55);
    background: rgba(0,0,0,0.55);
    color: rgba(255,255,255,0.92);
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.2px;
    min-width: 124px;
  }

  .ttr-ddBtnOpen { background: rgba(168,85,247,0.16); }
  .ttr-ddCaret { opacity: 0.95; }

  .ttr-ddMenu {
    position: absolute;
    top: 40px;
    right: 0;
    min-width: 190px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(10,10,14,0.92);
    box-shadow: 0 18px 50px rgba(0,0,0,0.45);
    backdrop-filter: blur(14px);
    overflow: hidden;
    z-index: 50;
  }

  .ttr-ddItem {
    padding: 10px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.2px;
    color: rgba(255,255,255,0.88);
    background: transparent;
  }

  .ttr-ddItemActive { background: rgba(168,85,247,0.22); }

  .ttr-ddTick {
    width: 18px;
    height: 18px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(168,85,247,0.25);
    border: 1px solid rgba(168,85,247,0.35);
    font-weight: 900;
  }

  @media (max-width: 1700px) {
    .ttr-cardGridCharts {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 1400px) {
    .ttr-cardGrid4 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .ttr-cardGrid2 {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 1200px) {
    .ttr-miniGrid4 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .ttr-donutGrid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 900px) {
    .ttr-cardGrid4 {
      grid-template-columns: 1fr;
    }
    .ttr-datePopup {
      right: auto;
      left: 0;
    }
    .ttr-lineXAxis {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .ttr-miniGrid4 {
      grid-template-columns: 1fr;
    }
    .ttr-dateInput {
      min-width: 140px;
    }
    .ttr-datePopup {
      width: 280px;
    }
    .ttr-donutSvgWrap {
      width: 170px;
      height: 170px;
    }
  }
  `;

  return (
    <div className="ttr-root">
      <style>{css}</style>

      <div className="ttr-wrap">
        <div className="ttr-head">
          <h1>Reports</h1>
          <p>
            Premium reporting view for debit order performance, settlement estimates, outcome mix,
            and attempt-level finance operations review.
          </p>
        </div>

        <div className="ttr-glass">
          <div className="ttr-panelHeader">
            <div>
              <p className="ttr-title">Reports overview</p>
              <p className="ttr-meta">
                Live reporting view ·{" "}
                {loading
                  ? "Loading data"
                  : error
                  ? "API error"
                  : "Connected to live reports endpoints"}
              </p>
            </div>

            <div className="ttr-headerActions">
              <div className="ttr-fieldWrap">
                <span className="ttr-label">Start date</span>
                <PremiumDatePicker value={startDate} onChange={setStartDate} ariaLabel="Start date" />
              </div>

              <div className="ttr-fieldWrap">
                <span className="ttr-label">End date</span>
                <PremiumDatePicker value={endDate} onChange={setEndDate} ariaLabel="End date" />
              </div>

              <button
                type="button"
                className="ttr-btn ttr-btnPrimary"
                onClick={() => fetchReports({ force: true })}
              >
                Apply range
              </button>

              <button
                type="button"
                className="ttr-btn ttr-btnPrimary"
                onClick={() => exportReportsCsv(filteredRowsAll)}
                disabled={!filteredRowsAll.length}
              >
                Export report
              </button>

              <div style={{ width: 14 }} />

              <div className="ttr-fieldWrap">
                <span className="ttr-label">Live report sync</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.52)" }}>
                  Connected to live endpoint
                </span>
              </div>

              <button
                type="button"
                className="ttr-btn ttr-btnPrimary"
                onClick={() => fetchReports({ force: true })}
                disabled={syncing}
              >
                {syncing ? "Syncing..." : "Sync now"}
              </button>
            </div>
          </div>

          <div className="ttr-content">
            <div className="ttr-cardGrid4">
              {topCards.map((card) => (
                <div
                  key={card.label}
                  className={
                    card.variant === "success"
                      ? "ttr-metric success"
                      : card.variant === "fees"
                      ? "ttr-metric fees"
                      : card.variant === "net"
                      ? "ttr-metric net"
                      : "ttr-metric"
                  }
                >
                  <div
                    className={
                      card.variant === "success"
                        ? "ttr-iconChip ttr-ico-green"
                        : card.variant === "fees"
                        ? "ttr-iconChip ttr-ico-blue"
                        : card.variant === "net"
                        ? "ttr-iconChip ttr-ico-green"
                        : "ttr-iconChip ttr-ico-purple"
                    }
                  >
                    {card.icon}
                  </div>
                  <p className="ttr-metricLabel">{card.label}</p>
                  <div className="ttr-metricValue">{card.value}</div>
                  <p className="ttr-metricMeta">{card.meta}</p>
                </div>
              ))}
            </div>

            <div className="ttr-cardGrid2">
              <div className="ttr-panel">
                <div className="ttr-panelTop">
                  <p className="ttr-panelHeading">Collection outcome</p>
                  <p className="ttr-panelSub">
                    Live split of successful, retry, failed, suspended, and pending outcomes
                  </p>
                </div>

                <div className="ttr-panelBody">
                  <div className="ttr-donutGrid">
                    <DonutChart
                      centerValue={filteredRowsAll.length}
                      centerLabel="Visible attempts"
                      segments={outcomeSegments}
                    />

                    <div className="ttr-shareStack">
                      {outcomeSegments.map((segment) => (
                        <div key={segment.label} className="ttr-shareCard">
                          <div className="ttr-shareLeft">
                            <span
                              className="ttr-shareSwatch"
                              style={{ background: segment.color }}
                            />
                            <div className="ttr-shareMeta">
                              <div className="ttr-shareLabel">{segment.label}</div>
                              <div className="ttr-shareSub">{safeNum(segment.value)} items</div>
                            </div>
                          </div>
                          <div className="ttr-sharePct">{safeNum(segment.pct).toFixed(0)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ttr-panel">
                <div className="ttr-panelTop">
                  <p className="ttr-panelHeading">Value realisation</p>
                  <p className="ttr-panelSub">
                    Premium view of collected value, fee exposure, and remaining uncollected value
                  </p>
                </div>

                <div className="ttr-panelBody">
                  <div className="ttr-donutGrid">
                    <DonutChart
                      centerValue={moneyZar(totalDebitOrderValue)}
                      centerLabel="Expected value"
                      segments={valueSegments}
                    />

                    <div className="ttr-shareStack">
                      <div className="ttr-shareCard">
                        <div className="ttr-shareLeft">
                          <span className="ttr-shareSwatch" style={{ background: "#22c55e" }} />
                          <div className="ttr-shareMeta">
                            <div className="ttr-shareLabel">Collected</div>
                            <div className="ttr-shareSub">{moneyZar2(totalCollected)}</div>
                          </div>
                        </div>
                        <div className="ttr-sharePct">{collectionRate.toFixed(0)}%</div>
                      </div>

                      <div className="ttr-shareCard">
                        <div className="ttr-shareLeft">
                          <span className="ttr-shareSwatch" style={{ background: "#60a5fa" }} />
                          <div className="ttr-shareMeta">
                            <div className="ttr-shareLabel">Estimated fees</div>
                            <div className="ttr-shareSub">{moneyZar2(estimatedPaystackFees)}</div>
                          </div>
                        </div>
                        <div className="ttr-sharePct">
                          {totalDebitOrderValue > 0
                            ? `${((estimatedPaystackFees / totalDebitOrderValue) * 100).toFixed(0)}%`
                            : "0%"}
                        </div>
                      </div>

                      <div className="ttr-shareCard">
                        <div className="ttr-shareLeft">
                          <span className="ttr-shareSwatch" style={{ background: "#7c3aed" }} />
                          <div className="ttr-shareMeta">
                            <div className="ttr-shareLabel">Remaining value</div>
                            <div className="ttr-shareSub">{moneyZar2(valueRemaining)}</div>
                          </div>
                        </div>
                        <div className="ttr-sharePct">
                          {totalDebitOrderValue > 0
                            ? `${((valueRemaining / totalDebitOrderValue) * 100).toFixed(0)}%`
                            : "0%"}
                        </div>
                      </div>

                      <div className="ttr-shareCard">
                        <div className="ttr-shareLeft">
                          <span className="ttr-shareSwatch" style={{ background: "#34d399" }} />
                          <div className="ttr-shareMeta">
                            <div className="ttr-shareLabel">Money to bank</div>
                            <div className="ttr-shareSub">{moneyZar2(estimatedMoneyToBank)}</div>
                          </div>
                        </div>
                        <div className="ttr-sharePct">Net</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ttr-cardGridCharts">
              <div className="ttr-panel">
                <div className="ttr-panelTop">
                  <p className="ttr-panelHeading">Collection trend</p>
                  <p className="ttr-panelSub">
                    Line chart powered by live collection trend data from the reports endpoint
                  </p>
                </div>

                <div className="ttr-panelBody">
                  <LineTrendChart rows={trendRows} totalCollected={totalCollected} />
                </div>
              </div>

              <div className="ttr-panel">
                <div className="ttr-panelTop">
                  <p className="ttr-panelHeading">Activity trend</p>
                  <p className="ttr-panelSub">
                    Bar chart of attempts processed over the most recent reporting intervals
                  </p>
                </div>

                <div className="ttr-panelBody">
                  <ActivityBarChart rows={activityTrend} />
                </div>
              </div>
            </div>

            <div className="ttr-cardGrid2">
              <div className="ttr-panel">
                <div className="ttr-panelTop">
                  <p className="ttr-panelHeading">Collection performance</p>
                  <p className="ttr-panelSub">
                    Compare successful collections against expected debit order value
                  </p>
                </div>

                <div className="ttr-panelBody">
                  <div className="ttr-progressWrap">
                    <div className="ttr-progressHead">
                      <span>Collected against expected value</span>
                      <strong>{safeNum(collectionRate).toFixed(0)}%</strong>
                    </div>
                    <div className="ttr-progressTrack">
                      <div
                        className="ttr-progressFill"
                        style={{ width: `${Math.max(0, Math.min(100, collectionRate))}%` }}
                      />
                    </div>
                  </div>

                  <div className="ttr-miniGrid4">
                    <div className="ttr-miniStat">
                      <div className="ttr-miniLabel">
                        <span className="ttr-miniDot ttr-dot-green" />
                        Successful
                      </div>
                      <div className="ttr-miniValue">{successfulRows.length}</div>
                    </div>

                    <div className="ttr-miniStat">
                      <div className="ttr-miniLabel">
                        <span className="ttr-miniDot ttr-dot-amber" />
                        Retry Scheduled
                      </div>
                      <div className="ttr-miniValue">{retryRows.length}</div>
                    </div>

                    <div className="ttr-miniStat">
                      <div className="ttr-miniLabel">
                        <span className="ttr-miniDot ttr-dot-red" />
                        Failed
                      </div>
                      <div className="ttr-miniValue">{failedRows.length}</div>
                    </div>

                    <div className="ttr-miniStat">
                      <div className="ttr-miniLabel">
                        <span className="ttr-miniDot ttr-dot-purple" />
                        Suspended
                      </div>
                      <div className="ttr-miniValue">{suspendedRows.length}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ttr-panel">
                <div className="ttr-panelTop">
                  <p className="ttr-panelHeading">Rates snapshot</p>
                  <p className="ttr-panelSub">
                    Fast view of success, failure, retry pressure, and active client coverage
                  </p>
                </div>

                <div className="ttr-panelBody">
                  <div className="ttr-miniGrid4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div className="ttr-miniStat">
                      <div className="ttr-miniLabel">
                        <span className="ttr-miniDot ttr-dot-green" />
                        Success rate
                      </div>
                      <div className="ttr-miniValue">{successRate.toFixed(0)}%</div>
                    </div>

                    <div className="ttr-miniStat">
                      <div className="ttr-miniLabel">
                        <span className="ttr-miniDot ttr-dot-red" />
                        Failure rate
                      </div>
                      <div className="ttr-miniValue">{failureRate.toFixed(0)}%</div>
                    </div>

                    <div className="ttr-miniStat">
                      <div className="ttr-miniLabel">
                        <span className="ttr-miniDot ttr-dot-amber" />
                        Retry rate
                      </div>
                      <div className="ttr-miniValue">{retryRate.toFixed(0)}%</div>
                    </div>

                    <div className="ttr-miniStat">
                      <div className="ttr-miniLabel">
                        <span className="ttr-miniDot ttr-dot-blue" />
                        Unique clients
                      </div>
                      <div className="ttr-miniValue">{uniqueClients}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ttr-panel">
              <div className="ttr-panelTop">
                <p className="ttr-panelHeading">Report attempt table</p>
                <p className="ttr-panelSub">
                  Search and filter attempt-level reporting records for finance and ops review
                </p>
              </div>

              <div className="ttr-panelBody">
                <div className="ttr-searchRow">
                  <div className="ttr-inputWrap">
                    <span className="ttr-inputIcon">
                      <IconSearch />
                    </span>
                    <input
                      className="ttr-input"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by client id, reference, failure reason, or status"
                      aria-label="Search report rows"
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div className="ttr-chipRow">
                      {[
                        { key: "All", count: filteredRowsAll.length },
                        { key: "Successful", count: successfulRows.length },
                        { key: "Retry Scheduled", count: retryRows.length },
                        { key: "Failed", count: failedRows.length },
                        { key: "Suspended", count: suspendedRows.length },
                        { key: "Pending", count: pendingRows.length },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className={outcomeFilter === item.key ? "ttr-chip ttr-chipActive" : "ttr-chip"}
                          role="button"
                          tabIndex={0}
                          onClick={() => setOutcomeFilter(item.key)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") setOutcomeFilter(item.key);
                          }}
                        >
                          <span>{item.key}</span>
                          <span style={{ opacity: 0.85 }}>{item.count}</span>
                        </div>
                      ))}
                    </div>

                    <RecordsDropdown
                      value={perPage}
                      disabled={false}
                      onChange={(n) => setPerPage(Number(n))}
                    />

                    <button
                      type="button"
                      className="ttr-pageBtn"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      className="ttr-pageBtn"
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      disabled={currentPage >= pageCount}
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="ttr-tableWrap">
                  <table className="ttr-table">
                    <thead>
                      <tr>
                        <th className="ttr-th">Client ID</th>
                        <th className="ttr-th">Charge date</th>
                        <th className="ttr-th">Day</th>
                        <th className="ttr-th">Status</th>
                        <th className="ttr-th">Outcome</th>
                        <th className="ttr-th">Reference</th>
                        <th className="ttr-th">Failure reason</th>
                        <th className="ttr-th">Attempted</th>
                        <th className="ttr-th">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRows.map((row) => (
                        <tr key={`${row.id}-${row.reference}-${row.attemptedAt}`}>
                          <td className="ttr-td">{row.clientId || "N/A"}</td>
                          <td className="ttr-td">{fmtDate(row.chargeDate)}</td>
                          <td className="ttr-td">{row.chargeDay || "N/A"}</td>
                          <td className="ttr-td">{row.status || "N/A"}</td>
                          <td className="ttr-td">
                            <span className={outcomeBadgeClass(row.outcome)}>{row.outcome}</span>
                          </td>
                          <td className="ttr-td">{row.reference || "N/A"}</td>
                          <td className="ttr-td">{row.failureReason || "N/A"}</td>
                          <td className="ttr-td">{fmtDateTime(row.attemptedAt)}</td>
                          <td className="ttr-td">{moneyZar2(row.amountZar)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!pagedRows.length && (
                  <div className="ttr-empty">
                    {loading
                      ? "Loading live reports data."
                      : "No report rows match your search, filter, or selected date range."}
                  </div>
                )}
              </div>
            </div>

            <div className="ttr-footerBar">
              <div>
                Report range {filters?.startDate || startDate} to {filters?.endDate || endDate}
              </div>
              <div>
                Estimated settlement {moneyZar2(estimatedMoneyToBank)} after fees{" "}
                {moneyZar2(estimatedPaystackFees)}
              </div>
            </div>

            {error ? (
              <div className="ttr-empty" style={{ color: "rgba(239,68,68,0.92)" }}>
                API error: {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
