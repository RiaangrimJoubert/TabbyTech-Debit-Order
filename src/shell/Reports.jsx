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
  const summaryRows = Array.isArray(summaryData?.rows) ? summaryData.rows : [];
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
  const uniqueClients = safeNum(cards.uniqueClients || new Set(filteredRowsAll.map((r) => r.clientId).filter(Boolean)).size);

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

  const collectionRate = totalDebitOrderValue > 0 ? (totalCollected / totalDebitOrderValue) * 100 : successRate;

  const distributionTotal = filteredRowsAll.length || 1;
  const successfulPct = (successfulRows.length / distributionTotal) * 100;
  const retryPct = (retryRows.length / distributionTotal) * 100;
  const failedPct = (failedRows.length / distributionTotal) * 100;
  const suspendedPct = (suspendedRows.length / distributionTotal) * 100;
  const pendingPct = (pendingRows.length / distributionTotal) * 100;

  const activityTrend = Array.isArray(charts.activityTrend) ? charts.activityTrend : [];
  const activityBars = activityTrend.slice(-12).map((d) => safeNum(d.attempts));
  const maxBar = Math.max(1, ...activityBars);
  const normalizedBars = activityBars.map((v) => Math.max(8, Math.round((v / maxBar) * 100)));

  const outcomeDistribution = Array.isArray(charts.outcomeDistribution) ? charts.outcomeDistribution : [];
  const trendRows = Array.isArray(charts.collectionTrend) ? charts.collectionTrend : [];
  const filters = summaryPayload?.filters || {};

  const css = `
  .ttr-root {
    width: 100%;
    height: 100%;
    color: rgba(255,255,255,0.92);
    --ttr-purple: rgba(124,58,237,0.95);
    --ttr-purple2: rgba(168,85,247,0.95);
  }

  .ttr-wrap { height: 100%; display: flex; flex-direction: column; gap: 16px; }
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
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.10);
    background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
    box-shadow: 0 18px 50px rgba(0,0,0,0.35);
    backdrop-filter: blur(14px);
    overflow: hidden;
    min-height: 0;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .ttr-panelHeader {
    padding: 14px 14px 12px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.10);
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
    background:
      linear-gradient(180deg, rgba(18,12,36,0.96) 0%, rgba(11,10,22,0.96) 100%);
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
    border-radius: 12px;
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
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
  }

  .ttr-cardGrid8 {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 10px;
  }

  .ttr-cardGrid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .ttr-cardGrid3 {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr 0.9fr;
    gap: 14px;
  }

  .ttr-metric {
    min-height: 104px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.10);
    padding: 14px;
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(circle at 85% 120%, rgba(124,58,237,0.20), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.92) 0%, rgba(12,18,48,0.82) 100%);
  }

  .ttr-metric.success {
    background:
      radial-gradient(circle at 85% 120%, rgba(16,185,129,0.22), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.92) 0%, rgba(12,18,48,0.82) 100%);
  }

  .ttr-metric.retry {
    background:
      radial-gradient(circle at 85% 120%, rgba(245,158,11,0.18), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.92) 0%, rgba(12,18,48,0.82) 100%);
  }

  .ttr-metric.failed {
    background:
      radial-gradient(circle at 85% 120%, rgba(239,68,68,0.18), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.92) 0%, rgba(12,18,48,0.82) 100%);
  }

  .ttr-metric.suspended {
    background:
      radial-gradient(circle at 85% 120%, rgba(168,85,247,0.16), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.92) 0%, rgba(12,18,48,0.82) 100%);
  }

  .ttr-metric.fees {
    background:
      radial-gradient(circle at 85% 120%, rgba(59,130,246,0.20), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.92) 0%, rgba(12,18,48,0.82) 100%);
  }

  .ttr-metric.net {
    background:
      radial-gradient(circle at 85% 120%, rgba(34,197,94,0.18), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.92) 0%, rgba(12,18,48,0.82) 100%);
  }

  .ttr-metricLabel {
    font-size: 12px;
    color: rgba(255,255,255,0.62);
    margin: 0;
  }

  .ttr-metricValue {
    font-size: 22px;
    line-height: 1.1;
    font-weight: 900;
    color: rgba(255,255,255,0.96);
    margin: 18px 0 8px 0;
  }

  .ttr-metricMeta {
    font-size: 12px;
    color: rgba(255,255,255,0.60);
    margin: 0;
  }

  .ttr-iconChip {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 28px;
    height: 28px;
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
  .ttr-ico-amber { background: rgba(245,158,11,0.24); }
  .ttr-ico-red { background: rgba(239,68,68,0.24); }
  .ttr-ico-blue { background: rgba(59,130,246,0.24); }

  .ttr-panel {
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(8,12,27,0.55);
    overflow: hidden;
  }

  .ttr-panelTop {
    padding: 12px 14px;
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
    padding: 14px;
  }

  .ttr-progressWrap { margin-top: 10px; }
  .ttr-progressHead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: rgba(255,255,255,0.72);
    font-size: 12px;
    margin-bottom: 8px;
  }

  .ttr-progressTrack {
    height: 10px;
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
    margin-top: 12px;
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

  .ttr-donutWrap {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px 0 14px 0;
  }

  .ttr-donut {
    width: 158px;
    height: 158px;
    border-radius: 999px;
    position: relative;
    background:
      conic-gradient(
        #60a5fa 0deg ${Math.max(0, pendingPct * 3.6)}deg,
        #a855f7 ${Math.max(0, pendingPct * 3.6)}deg ${Math.max(0, (pendingPct + suspendedPct) * 3.6)}deg,
        #ef4444 ${Math.max(0, (pendingPct + suspendedPct) * 3.6)}deg ${Math.max(0, (pendingPct + suspendedPct + failedPct) * 3.6)}deg,
        #f59e0b ${Math.max(0, (pendingPct + suspendedPct + failedPct) * 3.6)}deg ${Math.max(0, (pendingPct + suspendedPct + failedPct + retryPct) * 3.6)}deg,
        #22c55e ${Math.max(0, (pendingPct + suspendedPct + failedPct + retryPct) * 3.6)}deg 360deg
      );
    box-shadow: 0 18px 50px rgba(0,0,0,0.30);
  }

  .ttr-donutInner {
    position: absolute;
    inset: 20px;
    border-radius: 999px;
    background: rgba(8,12,27,0.95);
    border: 1px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
  }

  .ttr-donutValue {
    font-size: 22px;
    font-weight: 900;
    color: rgba(255,255,255,0.96);
    line-height: 1;
  }

  .ttr-donutLabel {
    margin-top: 6px;
    font-size: 11px;
    color: rgba(255,255,255,0.55);
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
  }

  .ttr-sharePct {
    font-size: 16px;
    font-weight: 900;
    color: rgba(255,255,255,0.95);
  }

  .ttr-shareLabel {
    margin-top: 2px;
    font-size: 12px;
    color: rgba(255,255,255,0.56);
  }

  .ttr-trendWrap {
    display: flex;
    align-items: end;
    gap: 8px;
    min-height: 230px;
    padding: 12px 0 4px 0;
  }

  .ttr-trendBarWrap {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .ttr-trendBar {
    width: 100%;
    max-width: 34px;
    border-radius: 12px 12px 8px 8px;
    background: linear-gradient(180deg, rgba(168,85,247,0.95), rgba(124,58,237,0.70));
    border: 1px solid rgba(168,85,247,0.35);
    box-shadow: 0 12px 28px rgba(124,58,237,0.20);
    min-height: 8px;
  }

  .ttr-trendBarAccent {
    background: linear-gradient(180deg, rgba(34,197,94,0.95), rgba(16,185,129,0.70));
    border: 1px solid rgba(34,197,94,0.35);
    box-shadow: 0 12px 28px rgba(16,185,129,0.18);
  }

  .ttr-trendValue {
    font-size: 11px;
    color: rgba(255,255,255,0.66);
    font-weight: 800;
  }

  .ttr-trendDate {
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
    .ttr-cardGrid8 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .ttr-cardGrid3 {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 1200px) {
    .ttr-cardGrid2 {
      grid-template-columns: 1fr;
    }
    .ttr-miniGrid4 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .ttr-cardGrid8 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .ttr-datePopup {
      right: auto;
      left: 0;
    }
  }

  @media (max-width: 640px) {
    .ttr-cardGrid8,
    .ttr-miniGrid4 {
      grid-template-columns: 1fr;
    }
    .ttr-dateInput {
      min-width: 140px;
    }
    .ttr-datePopup {
      width: 280px;
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
            Comprehensive financial and operational reporting view for debit order collections,
            failures, retries, settlement estimates, and collection performance intelligence.
          </p>
        </div>

        <div className="ttr-glass">
          <div className="ttr-panelHeader">
            <div>
              <p className="ttr-title">Reports overview</p>
              <p className="ttr-meta">
                Live reporting view · {loading ? "Loading data" : error ? "API error" : "Connected to live reports endpoints"}
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
            <div className="ttr-cardGrid8">
              <div className="ttr-metric">
                <div className="ttr-iconChip ttr-ico-purple">R</div>
                <p className="ttr-metricLabel">Total Debit Order Value</p>
                <div className="ttr-metricValue">{moneyZar(totalDebitOrderValue)}</div>
                <p className="ttr-metricMeta">{totalAttempts} processed attempts</p>
              </div>

              <div className="ttr-metric success">
                <div className="ttr-iconChip ttr-ico-green">✓</div>
                <p className="ttr-metricLabel">Total Collected</p>
                <div className="ttr-metricValue">{moneyZar(totalCollected)}</div>
                <p className="ttr-metricMeta">{successfulRows.length} successful</p>
              </div>

              <div className="ttr-metric failed">
                <div className="ttr-iconChip ttr-ico-red">↺</div>
                <p className="ttr-metricLabel">Failed Value</p>
                <div className="ttr-metricValue">{moneyZar(totalFailedValue)}</div>
                <p className="ttr-metricMeta">{failedRows.length} failed attempts</p>
              </div>

              <div className="ttr-metric retry">
                <div className="ttr-iconChip ttr-ico-amber">↻</div>
                <p className="ttr-metricLabel">Retry Scheduled Value</p>
                <div className="ttr-metricValue">{moneyZar(totalRetryScheduledValue)}</div>
                <p className="ttr-metricMeta">{retryRows.length} retry items</p>
              </div>

              <div className="ttr-metric suspended">
                <div className="ttr-iconChip ttr-ico-red">!</div>
                <p className="ttr-metricLabel">Suspended Attempts</p>
                <div className="ttr-metricValue">{suspendedRows.length}</div>
                <p className="ttr-metricMeta">{suspendedPct.toFixed(0)}% of visible attempts</p>
              </div>

              <div className="ttr-metric fees">
                <div className="ttr-iconChip ttr-ico-blue">%</div>
                <p className="ttr-metricLabel">Estimated Paystack Fees</p>
                <div className="ttr-metricValue">{moneyZar2(estimatedPaystackFees)}</div>
                <p className="ttr-metricMeta">Estimated from successful value</p>
              </div>

              <div className="ttr-metric net">
                <div className="ttr-iconChip ttr-ico-green">B</div>
                <p className="ttr-metricLabel">Estimated Money To Bank</p>
                <div className="ttr-metricValue">{moneyZar2(estimatedMoneyToBank)}</div>
                <p className="ttr-metricMeta">Net after estimated fees</p>
              </div>

              <div className="ttr-metric fees">
                <div className="ttr-iconChip ttr-ico-blue">%</div>
                <p className="ttr-metricLabel">Success Rate</p>
                <div className="ttr-metricValue">{safeNum(collectionRate).toFixed(0)}%</div>
                <p className="ttr-metricMeta">{uniqueClients} unique clients in view</p>
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
                  <p className="ttr-panelHeading">Outcome distribution</p>
                  <p className="ttr-panelSub">
                    Split of successful, retry, failed, suspended, and pending outcomes
                  </p>
                </div>

                <div className="ttr-panelBody">
                  <div className="ttr-donutWrap">
                    <div className="ttr-donut">
                      <div className="ttr-donutInner">
                        <div className="ttr-donutValue">{filteredRowsAll.length}</div>
                        <div className="ttr-donutLabel">Visible attempts</div>
                      </div>
                    </div>
                  </div>

                  <div className="ttr-shareStack">
                    <div className="ttr-shareCard">
                      <div className="ttr-sharePct">{successfulPct.toFixed(0)}%</div>
                      <div className="ttr-shareLabel">Successful share</div>
                    </div>
                    <div className="ttr-shareCard">
                      <div className="ttr-sharePct">{retryPct.toFixed(0)}%</div>
                      <div className="ttr-shareLabel">Retry share</div>
                    </div>
                    <div className="ttr-shareCard">
                      <div className="ttr-sharePct">{failedPct.toFixed(0)}%</div>
                      <div className="ttr-shareLabel">Failed share</div>
                    </div>
                    <div className="ttr-shareCard">
                      <div className="ttr-sharePct">{suspendedPct.toFixed(0)}%</div>
                      <div className="ttr-shareLabel">Suspended share</div>
                    </div>
                    <div className="ttr-shareCard">
                      <div className="ttr-sharePct">{pendingPct.toFixed(0)}%</div>
                      <div className="ttr-shareLabel">Pending share</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ttr-cardGrid3">
              <div className="ttr-panel">
                <div className="ttr-panelTop">
                  <p className="ttr-panelHeading">Activity trend</p>
                  <p className="ttr-panelSub">
                    Attempts processed over the most recent reporting intervals
                  </p>
                </div>

                <div className="ttr-panelBody">
                  <div className="ttr-trendWrap">
                    {(normalizedBars.length ? normalizedBars : [18, 24, 32, 48, 60, 55, 72, 66, 58, 76, 84, 92]).map(
                      (height, idx) => {
                        const source = activityTrend.slice(-12)[idx];
                        const isAccent = idx >= Math.max(0, normalizedBars.length - 2);
                        return (
                          <div key={`bar-${idx}`} className="ttr-trendBarWrap">
                            <div className="ttr-trendValue">
                              {source ? safeNum(source.attempts) : 0}
                            </div>
                            <div
                              className={isAccent ? "ttr-trendBar ttr-trendBarAccent" : "ttr-trendBar"}
                              style={{ height: `${height}%` }}
                            />
                            <div className="ttr-trendDate">
                              {source?.date ? fmtDate(source.date) : `P${idx + 1}`}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>

              <div className="ttr-panel">
                <div className="ttr-panelTop">
                  <p className="ttr-panelHeading">Rates snapshot</p>
                  <p className="ttr-panelSub">
                    Fast view of success, failure, and retry pressure
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

              <div className="ttr-panel">
                <div className="ttr-panelTop">
                  <p className="ttr-panelHeading">Distribution mix</p>
                  <p className="ttr-panelSub">
                    Outcome categories returned by the live reports endpoint
                  </p>
                </div>

                <div className="ttr-panelBody">
                  <div className="ttr-shareStack">
                    {(outcomeDistribution.length
                      ? outcomeDistribution
                      : [
                          { key: "SUCCESS", label: "Successful", value: successfulRows.length },
                          { key: "FAILED", label: "Failed", value: failedRows.length },
                          { key: "RETRY", label: "Retry", value: retryRows.length },
                          { key: "SUSPENDED", label: "Suspended", value: suspendedRows.length },
                          { key: "INITIATED", label: "Initiated", value: pendingRows.length },
                        ]
                    ).map((item) => {
                      const pct = filteredRowsAll.length
                        ? (safeNum(item.value) / filteredRowsAll.length) * 100
                        : 0;
                      return (
                        <div key={item.key} className="ttr-shareCard">
                          <div className="ttr-sharePct">{pct.toFixed(0)}%</div>
                          <div className="ttr-shareLabel">
                            {item.label} · {safeNum(item.value)}
                          </div>
                        </div>
                      );
                    })}
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
                Estimated settlement {moneyZar2(estimatedMoneyToBank)} after fees {moneyZar2(estimatedPaystackFees)}
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
