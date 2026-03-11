import React, { useEffect, useMemo, useRef, useState } from "react";

const BATCHES_CACHE_TTL_MS = 5 * 60 * 1000;

let batchesScreenCache = {
  startDate: "",
  endDate: "",
  perPage: 10,
  query: "",
  outcomeFilter: "All",
  data: null,
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

function hasFreshBatchesCache() {
  return (
    batchesScreenCache.data &&
    Date.now() - Number(batchesScreenCache.lastLoadedAt || 0) < BATCHES_CACHE_TTL_MS
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
  if (s === "RETRY SCHEDULED") return "Retry Scheduled";
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

function buildDebitOrderLookup(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const map = new Map();

  for (const row of rows) {
    const id = safeStr(row?.id || row?.clientId);
    if (!id) continue;

    map.set(id, {
      id,
      name:
        safeStr(row?.name) ||
        safeStr(row?.clientName) ||
        safeStr(row?.client) ||
        "Unknown client",
      amount: safeNum(row?.amount),
      booksInvoiceId: safeStr(row?.booksInvoiceId),
      status: safeStr(row?.status),
      retryCount: safeNum(row?.retryCount),
      failureReason: safeStr(row?.failureReason),
      nextChargeDate: safeStr(row?.nextChargeDate),
      updatedAt: safeStr(row?.updatedAt),
    });
  }

  return map;
}

function mapBatchRow(raw, index, debitOrderLookup) {
  const row = raw || {};

  const rowClientId =
    safeStr(row.clientId) ||
    safeStr(row.client_id) ||
    safeStr(row.crm_debit_order_id) ||
    safeStr(row.crm_record_id);

  const linkedDebitOrder = rowClientId ? debitOrderLookup.get(rowClientId) : null;

  const amount =
    safeNum(row.amount) ||
    safeNum(row.amount_zar) ||
    safeNum(row.Amount) ||
    safeNum(row.total_amount) ||
    safeNum(row.estimated_amount) ||
    safeNum(linkedDebitOrder?.amount) ||
    0;

  const outcome = normalizeOutcome(
    row.outcome ||
      row.status ||
      row.attempt_status ||
      row.charge_status ||
      row.result_status
  );

  const retryValue =
    row.retry_label ||
    row.retry ||
    row.retry_status ||
    (String(row.charge_day || row.chargeDay || "") === "1" ? "1st retry" : "Primary");

  return {
    id:
      row.id ||
      row.ROWID ||
      row.rowId ||
      row.crm_debit_order_id ||
      row.client_id ||
      row.clientId ||
      `row-${index + 1}`,
    client:
      row.client_name ||
      row.name ||
      row.client ||
      row.crm_name ||
      row.customer_name ||
      linkedDebitOrder?.name ||
      "Unknown client",
    clientId: rowClientId,
    amount,
    outcome,
    retry: retryValue,
    reference:
      row.reference ||
      row.paystack_reference ||
      row.last_transaction_reference ||
      "",
    invoice:
      row.invoice ||
      row.books_invoice_id ||
      row.invoice_id ||
      linkedDebitOrder?.booksInvoiceId ||
      "",
    notification:
      row.notification ||
      row.notification_status ||
      row.email_status ||
      "N/A",
    updated:
      row.updated_at ||
      row.last_attempt_at ||
      row.attemptedAt ||
      row.charge_date ||
      row.chargeDate ||
      row.created_at ||
      linkedDebitOrder?.updatedAt ||
      "",
    raw: row,
  };
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
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo ||
    dt.getDate() !== d
  ) {
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
    <div ref={wrapRef} className="ttb-datePickerWrap">
      <button
        type="button"
        className={open ? "ttb-dateInput ttb-dateInputOpen" : "ttb-dateInput"}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((x) => !x)}
      >
        <span>{value || "Select date"}</span>
        <span className="ttb-dateCaret">▾</span>
      </button>

      {open && (
        <div className="ttb-datePopup" role="dialog" aria-label={ariaLabel}>
          <div className="ttb-datePopupHead">
            <button
              type="button"
              className="ttb-dateNavBtn"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              aria-label="Previous month"
            >
              ‹
            </button>

            <div className="ttb-dateMonthLabel">{formatPickerMonth(viewDate)}</div>

            <button
              type="button"
              className="ttb-dateNavBtn"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="ttb-dateWeekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="ttb-dateWeekday">
                {d}
              </div>
            ))}
          </div>

          <div className="ttb-dateGrid">
            {cells.map((cell) => {
              if (cell.type === "empty") {
                return <div key={cell.key} className="ttb-dateCell ttb-dateCellEmpty" />;
              }

              const cls = [
                "ttb-dateCell",
                "ttb-dateCellDay",
                cell.isSelected ? "ttb-dateCellSelected" : "",
                cell.isToday ? "ttb-dateCellToday" : "",
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
    <div ref={wrapRef} className="ttb-ddWrap">
      <span className="ttb-ddLabel">Records</span>

      <div className="ttb-ddRel">
        <button
          type="button"
          className={open ? "ttb-ddBtn ttb-ddBtnOpen" : "ttb-ddBtn"}
          onClick={() => {
            if (disabled) return;
            setOpen((x) => !x);
          }}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span>{active.label}</span>
          <span className="ttb-ddCaret">▾</span>
        </button>

        {open && (
          <div className="ttb-ddMenu" role="listbox" aria-label="Records per page">
            {options.map((o, idx) => {
              const isActive = o.value === value;
              return (
                <div
                  key={o.value}
                  role="option"
                  aria-selected={isActive}
                  className={isActive ? "ttb-ddItem ttb-ddItemActive" : "ttb-ddItem"}
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
                  {isActive ? <span className="ttb-ddTick">✓</span> : <span style={{ width: 18 }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Batches() {
  const [startDate, setStartDate] = useState(() => batchesScreenCache.startDate || startOfMonthYmdLocal());
  const [endDate, setEndDate] = useState(() => batchesScreenCache.endDate || todayYmdLocal());
  const [perPage, setPerPage] = useState(() => Number(batchesScreenCache.perPage || 10));
  const [query, setQuery] = useState(() => String(batchesScreenCache.query || ""));
  const [outcomeFilter, setOutcomeFilter] = useState(() => String(batchesScreenCache.outcomeFilter || "All"));
  const [loading, setLoading] = useState(() => !hasFreshBatchesCache());
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(() => String(batchesScreenCache.error || ""));
  const [data, setData] = useState(() => batchesScreenCache.data || null);

  async function fetchBatches({ force = false } = {}) {
    if (!force && hasFreshBatchesCache()) {
      setData(batchesScreenCache.data);
      setError(batchesScreenCache.error || "");
      setLoading(false);
      return;
    }

    try {
      setError("");
      setLoading(true);
      setSyncing(true);

      const qs = new URLSearchParams({
        startDate,
        endDate,
      });

      const [batchJson, debitOrdersJson] = await Promise.all([
        fetchJson(`/api/dashboard/batches?${qs.toString()}`),
        fetchJson(`/api/debit-orders`),
      ]);

      const debitOrderLookup = buildDebitOrderLookup(debitOrdersJson);

      const merged = {
        ...batchJson,
        __debitOrderLookup: debitOrderLookup,
      };

      setData(merged);

      batchesScreenCache = {
        ...batchesScreenCache,
        startDate,
        endDate,
        perPage,
        query,
        outcomeFilter,
        data: merged,
        error: "",
        lastLoadedAt: Date.now(),
      };
    } catch (e) {
      const msg = String(e?.message || e);
      setError(msg);
      batchesScreenCache = {
        ...batchesScreenCache,
        error: msg,
      };
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  useEffect(() => {
    batchesScreenCache = {
      ...batchesScreenCache,
      startDate,
      endDate,
      perPage,
      query,
      outcomeFilter,
      data,
      error,
    };
  }, [startDate, endDate, perPage, query, outcomeFilter, data, error]);

  useEffect(() => {
    fetchBatches({ force: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rawRows = useMemo(() => {
    if (Array.isArray(data?.rows)) return data.rows;
    if (Array.isArray(data?.attempts?.rows)) return data.attempts.rows;
    if (Array.isArray(data?.data?.attempts?.rows)) return data.data.attempts.rows;
    return [];
  }, [data]);

  const debitOrderLookup = useMemo(() => {
    return data?.__debitOrderLookup instanceof Map ? data.__debitOrderLookup : new Map();
  }, [data]);

  const rows = useMemo(() => {
    return rawRows.map((row, index) => mapBatchRow(row, index, debitOrderLookup));
  }, [rawRows, debitOrderLookup]);

  const filteredRowsAll = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesOutcome =
        outcomeFilter === "All" ? true : String(row.outcome) === String(outcomeFilter);

      const matchesQuery =
        !q ||
        String(row.client || "").toLowerCase().includes(q) ||
        String(row.clientId || "").toLowerCase().includes(q) ||
        String(row.id || "").toLowerCase().includes(q) ||
        String(row.reference || "").toLowerCase().includes(q) ||
        String(row.invoice || "").toLowerCase().includes(q);

      return matchesOutcome && matchesQuery;
    });
  }, [rows, query, outcomeFilter]);

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(filteredRowsAll.length / perPage));
  }, [filteredRowsAll.length, perPage]);

  const pagedRows = useMemo(() => {
    return filteredRowsAll.slice(0, perPage);
  }, [filteredRowsAll, perPage]);

  const attemptsSummary = data?.attempts?.summary || data?.data?.attempts?.summary || {};

  const totalBatchValue = useMemo(() => {
    if (filteredRowsAll.length > 0) {
      return filteredRowsAll.reduce((sum, row) => sum + safeNum(row.amount), 0);
    }
    return safeNum(
      attemptsSummary?.totalAmountEstimate ||
      data?.totalAmountEstimate ||
      data?.data?.totalAmountEstimate
    );
  }, [filteredRowsAll, attemptsSummary, data]);

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

  const collectedValue = useMemo(() => {
    if (successfulRows.length > 0) {
      return successfulRows.reduce((sum, row) => sum + safeNum(row.amount), 0);
    }
    return 0;
  }, [successfulRows]);

  const failedValue = useMemo(() => {
    return failedRows.reduce((sum, row) => sum + safeNum(row.amount), 0);
  }, [failedRows]);

  const retryScheduledValue = useMemo(() => {
    return retryRows.reduce((sum, row) => sum + safeNum(row.amount), 0);
  }, [retryRows]);

  const estimatedPaystackFees = useMemo(() => {
    if (!successfulRows.length) return 0;
    return successfulRows.reduce((sum, row) => sum + estimatePaystackFeeLocal(row.amount), 0);
  }, [successfulRows]);

  const estimatedNetSettlement = useMemo(() => {
    return Math.max(0, collectedValue - estimatedPaystackFees);
  }, [collectedValue, estimatedPaystackFees]);

  const collectionRate = useMemo(() => {
    if (totalBatchValue <= 0) return 0;
    return (collectedValue / totalBatchValue) * 100;
  }, [collectedValue, totalBatchValue]);

  const distributionTotal = filteredRowsAll.length;
  const successfulPct = distributionTotal ? (successfulRows.length / distributionTotal) * 100 : 0;
  const retryPct = distributionTotal ? (retryRows.length / distributionTotal) * 100 : 0;
  const failedPct = distributionTotal ? (failedRows.length / distributionTotal) * 100 : 0;
  const suspendedPct = distributionTotal ? (suspendedRows.length / distributionTotal) * 100 : 0;

  const latestRun = data?.latestRun || data?.data?.latestRun || null;
  const cards = data?.cards || data?.data?.cards || {};
  const lastCronResult = cards?.lastCronResult || "N/A";

  const css = `
  .ttb-root {
    width: 100%;
    height: 100%;
    color: rgba(255,255,255,0.92);
    --ttb-purple: rgba(124,58,237,0.95);
    --ttb-purple2: rgba(168,85,247,0.95);
  }

  .ttb-wrap { height: 100%; display: flex; flex-direction: column; gap: 16px; }
  .ttb-head h1 {
    margin: 0;
    font-size: 26px;
    letter-spacing: 0.2px;
    color: rgba(255,255,255,0.92);
  }
  .ttb-head p {
    margin: 6px 0 0 0;
    font-size: 13px;
    color: rgba(255,255,255,0.62);
    line-height: 1.4;
  }

  .ttb-glass {
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

  .ttb-panelHeader {
    padding: 14px 14px 12px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.10);
    flex-wrap: wrap;
  }

  .ttb-title {
    font-size: 14px;
    font-weight: 900;
    color: rgba(255,255,255,0.90);
    margin: 0;
  }

  .ttb-meta {
    margin: 2px 0 0 0;
    font-size: 12px;
    color: rgba(255,255,255,0.58);
  }

  .ttb-headerActions {
    display: flex;
    align-items: end;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .ttb-fieldWrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ttb-label {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.2px;
    color: rgba(255,255,255,0.62);
    text-transform: none;
  }

  .ttb-datePickerWrap {
    position: relative;
  }

  .ttb-dateInput {
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

  .ttb-dateInput:hover {
    border-color: rgba(168,85,247,0.90);
    box-shadow: 0 12px 28px rgba(124,58,237,0.22);
    transform: translateY(-1px);
  }

  .ttb-dateInputOpen {
    border-color: rgba(168,85,247,0.95);
    box-shadow:
      0 0 0 4px rgba(124,58,237,0.20),
      0 16px 34px rgba(124,58,237,0.26);
  }

  .ttb-dateCaret {
    opacity: 0.96;
    font-size: 12px;
  }

  .ttb-datePopup {
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
    animation: ttbDatePopIn 140ms ease-out;
  }

  @keyframes ttbDatePopIn {
    from {
      opacity: 0;
      transform: translateY(6px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .ttb-datePopupHead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }

  .ttb-dateMonthLabel {
    font-size: 13px;
    font-weight: 900;
    color: rgba(255,255,255,0.94);
    letter-spacing: 0.15px;
  }

  .ttb-dateNavBtn {
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

  .ttb-dateNavBtn:hover {
    background: rgba(168,85,247,0.26);
    border-color: rgba(168,85,247,0.50);
  }

  .ttb-dateWeekdays,
  .ttb-dateGrid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 6px;
  }

  .ttb-dateWeekdays {
    margin-bottom: 6px;
  }

  .ttb-dateWeekday {
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    color: rgba(255,255,255,0.50);
  }

  .ttb-dateCell {
    min-height: 34px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
  }

  .ttb-dateCellEmpty {
    pointer-events: none;
    opacity: 0;
  }

  .ttb-dateCellDay {
    color: rgba(255,255,255,0.90);
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .ttb-dateCellDay:hover {
    background: rgba(168,85,247,0.18);
    border-color: rgba(168,85,247,0.26);
  }

  .ttb-dateCellToday {
    border-color: rgba(168,85,247,0.42);
    box-shadow: inset 0 0 0 1px rgba(168,85,247,0.12);
  }

  .ttb-dateCellSelected {
    background: linear-gradient(135deg, var(--ttb-purple2), var(--ttb-purple));
    border-color: rgba(168,85,247,0.80);
    color: #fff;
    box-shadow: 0 10px 22px rgba(124,58,237,0.28);
  }

  .ttb-btn {
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

  .ttb-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(0,0,0,0.28);
  }

  .ttb-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .ttb-btnPrimary {
    background: linear-gradient(135deg, var(--ttb-purple2), var(--ttb-purple));
    border-color: rgba(124,58,237,0.55);
    box-shadow: 0 14px 34px rgba(124,58,237,0.28);
    color: #fff;
  }

  .ttb-content {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
  }

  .ttb-cardGrid6 {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
  }

  .ttb-cardGrid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .ttb-metric {
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

  .ttb-metric.success {
    background:
      radial-gradient(circle at 85% 120%, rgba(16,185,129,0.22), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.92) 0%, rgba(12,18,48,0.82) 100%);
  }

  .ttb-metric.retry {
    background:
      radial-gradient(circle at 85% 120%, rgba(245,158,11,0.18), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.92) 0%, rgba(12,18,48,0.82) 100%);
  }

  .ttb-metric.failed {
    background:
      radial-gradient(circle at 85% 120%, rgba(239,68,68,0.18), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.92) 0%, rgba(12,18,48,0.82) 100%);
  }

  .ttb-metric.suspended {
    background:
      radial-gradient(circle at 85% 120%, rgba(168,85,247,0.16), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.92) 0%, rgba(12,18,48,0.82) 100%);
  }

  .ttb-metric.fees {
    background:
      radial-gradient(circle at 85% 120%, rgba(59,130,246,0.20), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.92) 0%, rgba(12,18,48,0.82) 100%);
  }

  .ttb-metric.net {
    background:
      radial-gradient(circle at 85% 120%, rgba(34,197,94,0.18), transparent 42%),
      linear-gradient(180deg, rgba(6,11,35,0.92) 0%, rgba(12,18,48,0.82) 100%);
  }

  .ttb-metricLabel {
    font-size: 12px;
    color: rgba(255,255,255,0.62);
    margin: 0;
  }

  .ttb-metricValue {
    font-size: 22px;
    line-height: 1.1;
    font-weight: 900;
    color: rgba(255,255,255,0.96);
    margin: 18px 0 8px 0;
  }

  .ttb-metricMeta {
    font-size: 12px;
    color: rgba(255,255,255,0.60);
    margin: 0;
  }

  .ttb-iconChip {
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

  .ttb-ico-purple { background: rgba(124,58,237,0.35); }
  .ttb-ico-green { background: rgba(16,185,129,0.28); }
  .ttb-ico-amber { background: rgba(245,158,11,0.24); }
  .ttb-ico-red { background: rgba(239,68,68,0.24); }
  .ttb-ico-blue { background: rgba(59,130,246,0.24); }

  .ttb-panel {
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(8,12,27,0.55);
    overflow: hidden;
  }

  .ttb-panelTop {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.12);
  }

  .ttb-panelHeading {
    margin: 0;
    font-size: 14px;
    font-weight: 900;
    color: rgba(255,255,255,0.90);
  }

  .ttb-panelSub {
    margin: 2px 0 0 0;
    font-size: 12px;
    color: rgba(255,255,255,0.56);
  }

  .ttb-panelBody {
    padding: 14px;
  }

  .ttb-progressWrap {
    margin-top: 10px;
  }

  .ttb-progressHead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: rgba(255,255,255,0.72);
    font-size: 12px;
    margin-bottom: 8px;
  }

  .ttb-progressTrack {
    height: 10px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.06);
  }

  .ttb-progressFill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95));
  }

  .ttb-miniGrid4 {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-top: 12px;
  }

  .ttb-miniStat {
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    padding: 12px;
  }

  .ttb-miniLabel {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: rgba(255,255,255,0.62);
  }

  .ttb-miniDot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    display: inline-block;
  }

  .ttb-dot-green { background: #22c55e; }
  .ttb-dot-amber { background: #f59e0b; }
  .ttb-dot-red { background: #ef4444; }
  .ttb-dot-purple { background: #a855f7; }

  .ttb-miniValue {
    margin-top: 8px;
    font-size: 14px;
    font-weight: 900;
    color: rgba(255,255,255,0.96);
  }

  .ttb-donutWrap {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px 0 14px 0;
  }

  .ttb-donut {
    width: 158px;
    height: 158px;
    border-radius: 999px;
    position: relative;
    background:
      conic-gradient(
        #a855f7 0deg ${Math.max(0, suspendedPct * 3.6)}deg,
        #ef4444 ${Math.max(0, suspendedPct * 3.6)}deg ${Math.max(0, (suspendedPct + failedPct) * 3.6)}deg,
        #f59e0b ${Math.max(0, (suspendedPct + failedPct) * 3.6)}deg ${Math.max(0, (suspendedPct + failedPct + retryPct) * 3.6)}deg,
        #22c55e ${Math.max(0, (suspendedPct + failedPct + retryPct) * 3.6)}deg 360deg
      );
    box-shadow: 0 18px 50px rgba(0,0,0,0.30);
  }

  .ttb-donutInner {
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

  .ttb-donutValue {
    font-size: 22px;
    font-weight: 900;
    color: rgba(255,255,255,0.96);
    line-height: 1;
  }

  .ttb-donutLabel {
    margin-top: 6px;
    font-size: 11px;
    color: rgba(255,255,255,0.55);
  }

  .ttb-shareStack {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .ttb-shareCard {
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    padding: 12px;
  }

  .ttb-sharePct {
    font-size: 16px;
    font-weight: 900;
    color: rgba(255,255,255,0.95);
  }

  .ttb-shareLabel {
    margin-top: 2px;
    font-size: 12px;
    color: rgba(255,255,255,0.56);
  }

  .ttb-runKv {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 10px;
    font-size: 12px;
  }

  .ttb-runK { color: rgba(255,255,255,0.56); }
  .ttb-runV { color: rgba(255,255,255,0.86); font-weight: 700; }

  .ttb-opsGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 12px;
  }

  .ttb-opsCard {
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    padding: 12px;
  }

  .ttb-opsValue {
    font-size: 22px;
    font-weight: 900;
    color: rgba(255,255,255,0.96);
    line-height: 1;
  }

  .ttb-opsLabel {
    margin-top: 8px;
    font-size: 12px;
    color: rgba(255,255,255,0.58);
  }

  .ttb-searchRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  .ttb-inputWrap {
    position: relative;
    flex: 1 1 360px;
    max-width: 520px;
  }

  .ttb-inputIcon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.75;
  }

  .ttb-input {
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

  .ttb-input:focus {
    border-color: rgba(124,58,237,0.45);
    box-shadow: 0 0 0 6px rgba(124,58,237,0.18);
  }

  .ttb-chipRow {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  .ttb-chip {
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

  .ttb-chipActive {
    border-color: rgba(124,58,237,0.55);
    background: rgba(124,58,237,0.16);
    color: rgba(255,255,255,0.92);
  }

  .ttb-tableWrap {
    overflow: auto;
  }

  .ttb-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
  }

  .ttb-th {
    text-align: left;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.2px;
    color: rgba(255,255,255,0.62);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(10,10,14,0.78);
  }

  .ttb-td {
    padding: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.80);
    white-space: nowrap;
  }

  .ttb-empty {
    padding: 18px 14px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.62);
    font-size: 13px;
  }

  .ttb-badge {
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

  .ttb-b-success { border-color: rgba(34,197,94,0.30); background: rgba(34,197,94,0.14); }
  .ttb-b-retry { border-color: rgba(245,158,11,0.32); background: rgba(245,158,11,0.16); }
  .ttb-b-failed { border-color: rgba(239,68,68,0.32); background: rgba(239,68,68,0.16); }
  .ttb-b-suspended { border-color: rgba(168,85,247,0.32); background: rgba(168,85,247,0.16); }
  .ttb-b-pending { border-color: rgba(59,130,246,0.28); background: rgba(59,130,246,0.14); }

  .ttb-footerBar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    color: rgba(255,255,255,0.56);
    font-size: 12px;
    margin-top: 2px;
  }

  .ttb-ddWrap { display: inline-flex; align-items: center; gap: 10px; }
  .ttb-ddLabel { font-size: 12px; color: rgba(255,255,255,0.55); font-weight: 800; }
  .ttb-ddRel { position: relative; display: inline-block; }
  .ttb-ddBtn {
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
  .ttb-ddBtnOpen { background: rgba(168,85,247,0.16); }
  .ttb-ddCaret { opacity: 0.95; }
  .ttb-ddMenu {
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
  .ttb-ddItem {
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
  .ttb-ddItemActive { background: rgba(168,85,247,0.22); }
  .ttb-ddTick {
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

  @media (max-width: 1500px) {
    .ttb-cardGrid6 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 1200px) {
    .ttb-cardGrid2 {
      grid-template-columns: 1fr;
    }
    .ttb-miniGrid4 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .ttb-cardGrid6 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .ttb-opsGrid {
      grid-template-columns: 1fr;
    }
    .ttb-datePopup {
      right: auto;
      left: 0;
    }
  }

  @media (max-width: 640px) {
    .ttb-cardGrid6,
    .ttb-miniGrid4 {
      grid-template-columns: 1fr;
    }

    .ttb-dateInput {
      min-width: 140px;
    }

    .ttb-datePopup {
      width: 280px;
    }
  }
  `;

  function outcomeBadgeClass(outcome) {
    if (outcome === "Successful") return "ttb-badge ttb-b-success";
    if (outcome === "Retry Scheduled") return "ttb-badge ttb-b-retry";
    if (outcome === "Failed") return "ttb-badge ttb-b-failed";
    if (outcome === "Suspended") return "ttb-badge ttb-b-suspended";
    return "ttb-badge ttb-b-pending";
  }

  return (
    <div className="ttb-root">
      <style>{css}</style>

      <div className="ttb-wrap">
        <div className="ttb-head">
          <h1>Batches</h1>
          <p>
            Batch operations view for debit collections, retries, failures, suspension handling,
            and run-level decision making.
          </p>
        </div>

        <div className="ttb-glass">
          <div className="ttb-panelHeader">
            <div>
              <p className="ttb-title">Batch overview</p>
              <p className="ttb-meta">
                {latestRun?.runId || latestRun?.run_id ? `Run ${latestRun?.runId || latestRun?.run_id}` : "No batch loaded"} · Live Range View ·{" "}
                {loading ? "Loading data" : error ? "API error" : "Awaiting live data"}
              </p>
            </div>

            <div className="ttb-headerActions">
              <div className="ttb-fieldWrap">
                <span className="ttb-label">Start date</span>
                <PremiumDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  ariaLabel="Start date"
                />
              </div>

              <div className="ttb-fieldWrap">
                <span className="ttb-label">End date</span>
                <PremiumDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  ariaLabel="End date"
                />
              </div>

              <button
                type="button"
                className="ttb-btn ttb-btnPrimary"
                onClick={() => fetchBatches({ force: true })}
              >
                Apply range
              </button>

              <button
                type="button"
                className="ttb-btn ttb-btnPrimary"
                onClick={() => exportBatchCsv(filteredRowsAll)}
                disabled={!filteredRowsAll.length}
              >
                Export batch
              </button>

              <div style={{ width: 14 }} />

              <div className="ttb-fieldWrap">
                <span className="ttb-label">Live batch sync</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.52)" }}>
                  Connected to live endpoint
                </span>
              </div>

              <button
                type="button"
                className="ttb-btn ttb-btnPrimary"
                onClick={() => fetchBatches({ force: true })}
                disabled={syncing}
              >
                {syncing ? "Syncing..." : "Sync now"}
              </button>
            </div>
          </div>

          <div className="ttb-content">
            <div className="ttb-cardGrid6">
              <div className="ttb-metric">
                <div className="ttb-iconChip ttb-ico-purple">R</div>
                <p className="ttb-metricLabel">Total Batch Value</p>
                <div className="ttb-metricValue">{moneyZar(totalBatchValue)}</div>
                <p className="ttb-metricMeta">{filteredRowsAll.length} debit order item(s)</p>
              </div>

              <div className="ttb-metric success">
                <div className="ttb-iconChip ttb-ico-green">✓</div>
                <p className="ttb-metricLabel">Collected</p>
                <div className="ttb-metricValue">{moneyZar(collectedValue)}</div>
                <p className="ttb-metricMeta">{successfulRows.length} successful</p>
              </div>

              <div className="ttb-metric retry">
                <div className="ttb-iconChip ttb-ico-amber">↻</div>
                <p className="ttb-metricLabel">Retry Scheduled</p>
                <div className="ttb-metricValue">{moneyZar(retryScheduledValue)}</div>
                <p className="ttb-metricMeta">{retryRows.length} moving to 1st</p>
              </div>

              <div className="ttb-metric failed">
                <div className="ttb-iconChip ttb-ico-red">↺</div>
                <p className="ttb-metricLabel">Failed Value</p>
                <div className="ttb-metricValue">{moneyZar(failedValue)}</div>
                <p className="ttb-metricMeta">{failedRows.length} failed</p>
              </div>

              <div className="ttb-metric suspended">
                <div className="ttb-iconChip ttb-ico-red">!</div>
                <p className="ttb-metricLabel">Suspended</p>
                <div className="ttb-metricValue">{suspendedRows.length}</div>
                <p className="ttb-metricMeta">{suspendedRows.length} suspended</p>
              </div>

              <div className="ttb-metric fees">
                <div className="ttb-iconChip ttb-ico-blue">%</div>
                <p className="ttb-metricLabel">Collection Rate</p>
                <div className="ttb-metricValue">{collectionRate.toFixed(0)}%</div>
                <p className="ttb-metricMeta">{loading ? "Loading live data" : "Live filtered view"}</p>
              </div>
            </div>

            <div className="ttb-cardGrid2">
              <div className="ttb-panel">
                <div className="ttb-panelTop">
                  <p className="ttb-panelHeading">Batch performance</p>
                  <p className="ttb-panelSub">
                    Track how much of the run converted into successful collections
                  </p>
                </div>

                <div className="ttb-panelBody">
                  <div className="ttb-progressWrap">
                    <div className="ttb-progressHead">
                      <span>Collected against expected value</span>
                      <strong>{collectionRate.toFixed(0)}%</strong>
                    </div>
                    <div className="ttb-progressTrack">
                      <div
                        className="ttb-progressFill"
                        style={{ width: `${Math.max(0, Math.min(100, collectionRate))}%` }}
                      />
                    </div>
                  </div>

                  <div className="ttb-miniGrid4">
                    <div className="ttb-miniStat">
                      <div className="ttb-miniLabel">
                        <span className="ttb-miniDot ttb-dot-green" />
                        Successful
                      </div>
                      <div className="ttb-miniValue">{successfulRows.length}</div>
                    </div>

                    <div className="ttb-miniStat">
                      <div className="ttb-miniLabel">
                        <span className="ttb-miniDot ttb-dot-amber" />
                        Retry Scheduled
                      </div>
                      <div className="ttb-miniValue">{retryRows.length}</div>
                    </div>

                    <div className="ttb-miniStat">
                      <div className="ttb-miniLabel">
                        <span className="ttb-miniDot ttb-dot-red" />
                        Failed
                      </div>
                      <div className="ttb-miniValue">{failedRows.length}</div>
                    </div>

                    <div className="ttb-miniStat">
                      <div className="ttb-miniLabel">
                        <span className="ttb-miniDot ttb-dot-purple" />
                        Suspended
                      </div>
                      <div className="ttb-miniValue">{suspendedRows.length}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ttb-panel">
                <div className="ttb-panelTop">
                  <p className="ttb-panelHeading">Result distribution</p>
                  <p className="ttb-panelSub">
                    Split of successful, retry, failed, and suspended outcomes
                  </p>
                </div>

                <div className="ttb-panelBody">
                  <div className="ttb-donutWrap">
                    <div className="ttb-donut">
                      <div className="ttb-donutInner">
                        <div className="ttb-donutValue">{distributionTotal}</div>
                        <div className="ttb-donutLabel">Total items</div>
                      </div>
                    </div>
                  </div>

                  <div className="ttb-shareStack">
                    <div className="ttb-shareCard">
                      <div className="ttb-sharePct">{successfulPct.toFixed(0)}%</div>
                      <div className="ttb-shareLabel">Successful share</div>
                    </div>
                    <div className="ttb-shareCard">
                      <div className="ttb-sharePct">{retryPct.toFixed(0)}%</div>
                      <div className="ttb-shareLabel">Retry share</div>
                    </div>
                    <div className="ttb-shareCard">
                      <div className="ttb-sharePct">{failedPct.toFixed(0)}%</div>
                      <div className="ttb-shareLabel">Failed share</div>
                    </div>
                    <div className="ttb-shareCard">
                      <div className="ttb-sharePct">{suspendedPct.toFixed(0)}%</div>
                      <div className="ttb-shareLabel">Suspended share</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ttb-cardGrid2">
              <div className="ttb-metric fees">
                <div className="ttb-iconChip ttb-ico-blue">P</div>
                <p className="ttb-metricLabel">Estimated Paystack Fees</p>
                <div className="ttb-metricValue">{moneyZar2(estimatedPaystackFees)}</div>
                <p className="ttb-metricMeta">
                  Based on successful filtered collections only
                </p>
              </div>

              <div className="ttb-metric net">
                <div className="ttb-iconChip ttb-ico-green">B</div>
                <p className="ttb-metricLabel">Estimated Net Settlement</p>
                <div className="ttb-metricValue">{moneyZar2(estimatedNetSettlement)}</div>
                <p className="ttb-metricMeta">
                  Money to bank after estimated Paystack fees
                </p>
              </div>
            </div>

            <div className="ttb-cardGrid2">
              <div className="ttb-panel">
                <div className="ttb-panelTop">
                  <p className="ttb-panelHeading">Batch result table</p>
                  <p className="ttb-panelSub">
                    Search and filter each debit order outcome inside this batch
                  </p>
                </div>

                <div className="ttb-panelBody">
                  <div className="ttb-searchRow">
                    <div className="ttb-inputWrap">
                      <span className="ttb-inputIcon">
                        <IconSearch />
                      </span>
                      <input
                        className="ttb-input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by client, client id, debit order, reference, invoice"
                        aria-label="Search batch rows"
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div className="ttb-chipRow">
                        {[
                          { key: "All", count: filteredRowsAll.length },
                          { key: "Successful", count: successfulRows.length },
                          { key: "Retry Scheduled", count: retryRows.length },
                          { key: "Failed", count: failedRows.length },
                          { key: "Suspended", count: suspendedRows.length },
                        ].map((item) => (
                          <div
                            key={item.key}
                            className={outcomeFilter === item.key ? "ttb-chip ttb-chipActive" : "ttb-chip"}
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
                    </div>
                  </div>

                  <div className="ttb-tableWrap">
                    <table className="ttb-table">
                      <thead>
                        <tr>
                          <th className="ttb-th">Client</th>
                          <th className="ttb-th">Amount</th>
                          <th className="ttb-th">Outcome</th>
                          <th className="ttb-th">Retry</th>
                          <th className="ttb-th">Reference</th>
                          <th className="ttb-th">Invoice</th>
                          <th className="ttb-th">Notification</th>
                          <th className="ttb-th">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedRows.map((row) => (
                          <tr key={`${row.id}-${row.reference}-${row.updated}`}>
                            <td className="ttb-td">{row.client}</td>
                            <td className="ttb-td">{moneyZar2(row.amount)}</td>
                            <td className="ttb-td">
                              <span className={outcomeBadgeClass(row.outcome)}>{row.outcome}</span>
                            </td>
                            <td className="ttb-td">{row.retry || "Primary"}</td>
                            <td className="ttb-td">{row.reference || "N/A"}</td>
                            <td className="ttb-td">{row.invoice || "N/A"}</td>
                            <td className="ttb-td">{row.notification || "N/A"}</td>
                            <td className="ttb-td">{fmtDateTime(row.updated)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!pagedRows.length && (
                    <div className="ttb-empty">
                      {loading
                        ? "Loading live batch data."
                        : "No live batch rows match your search, filter, or selected date range."}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="ttb-panel">
                  <div className="ttb-panelTop">
                    <p className="ttb-panelHeading">Run monitor</p>
                    <p className="ttb-panelSub">
                      Use this section to audit the batch and make service decisions
                    </p>
                  </div>

                  <div className="ttb-panelBody">
                    <div className="ttb-runKv">
                      <div className="ttb-runK">Batch ID</div>
                      <div className="ttb-runV">{latestRun?.runId || latestRun?.run_id || "No batch loaded"}</div>

                      <div className="ttb-runK">Run type</div>
                      <div className="ttb-runV">Live Range View</div>

                      <div className="ttb-runK">Run status</div>
                      <div className="ttb-runV">{lastCronResult || "Awaiting live data"}</div>

                      <div className="ttb-runK">Charge date</div>
                      <div className="ttb-runV">
                        {cards?.dateRange?.startDate
                          ? `${fmtDate(cards.dateRange.startDate)} to ${fmtDate(cards.dateRange.endDate)}`
                          : `${fmtDate(startDate)} to ${fmtDate(endDate)}`}
                      </div>

                      <div className="ttb-runK">Created by</div>
                      <div className="ttb-runV">System</div>

                      <div className="ttb-runK">Channel</div>
                      <div className="ttb-runV">Live API</div>

                      <div className="ttb-runK">Linked client</div>
                      <div className="ttb-runV">None</div>
                    </div>
                  </div>
                </div>

                <div className="ttb-panel">
                  <div className="ttb-panelTop">
                    <p className="ttb-panelHeading">Ops action summary</p>
                    <p className="ttb-panelSub">
                      These are the things you need to watch after a batch completes
                    </p>
                  </div>

                  <div className="ttb-panelBody">
                    <div className="ttb-opsGrid">
                      <div className="ttb-opsCard">
                        <div className="ttb-opsValue">{retryRows.length}</div>
                        <div className="ttb-opsLabel">Need retry handling</div>
                      </div>
                      <div className="ttb-opsCard">
                        <div className="ttb-opsValue">{failedRows.length}</div>
                        <div className="ttb-opsLabel">Need manual follow-up</div>
                      </div>
                      <div className="ttb-opsCard">
                        <div className="ttb-opsValue">{suspendedRows.length}</div>
                        <div className="ttb-opsLabel">Suspension outcomes</div>
                      </div>
                      <div className="ttb-opsCard">
                        <div className="ttb-opsValue">
                          {filteredRowsAll.filter((row) => String(row.notification || "").toLowerCase() !== "n/a").length}
                        </div>
                        <div className="ttb-opsLabel">Notifications sent</div>
                      </div>
                    </div>

                    <div className="ttb-empty" style={{ marginTop: 12 }}>
                      This view is now using live batch attempts enriched with live debit order data.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ttb-footerBar">
              <div>
                {latestRun?.runId || latestRun?.run_id
                  ? `Run ${latestRun?.runId || latestRun?.run_id} · Range ${startDate} to ${endDate}`
                  : `No batch loaded · Range ${startDate} to ${endDate}`}
              </div>
              <div>
                Collected {moneyZar2(collectedValue)} of {moneyZar2(totalBatchValue)}
              </div>
            </div>

            {error ? (
              <div className="ttb-empty" style={{ color: "rgba(239,68,68,0.92)" }}>
                API error: {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function exportBatchCsv(rows) {
  const header = [
    "Client",
    "Client ID",
    "Amount",
    "Outcome",
    "Retry",
    "Reference",
    "Invoice",
    "Notification",
    "Updated",
  ];

  const body = rows.map((row) => [
    row.client || "",
    row.clientId || "",
    safeNum(row.amount),
    row.outcome || "",
    row.retry || "",
    row.reference || "",
    row.invoice || "",
    row.notification || "",
    row.updated || "",
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
  a.download = `tabbytech-batches-${todayYmdLocal()}.csv`;
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
