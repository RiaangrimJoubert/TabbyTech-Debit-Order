import React, { useEffect, useMemo, useRef, useState } from "react";
import { request } from "../api";

const DEBIT_ORDERS_CACHE_TTL_MS = 10 * 60 * 1000;

let debitOrdersProfileCache = {
  rows: [],
  query: "",
  selectedClientKey: "",
  historyFilter: "All",
  clientListPage: 1,
  clientListPerPage: 10,
  historyPage: 1,
  historyPerPage: 10,
  errorText: "",
  lastLoadedAt: 0,
};

function hasFreshCache() {
  return (
    Array.isArray(debitOrdersProfileCache.rows) &&
    debitOrdersProfileCache.rows.length > 0 &&
    Date.now() - Number(debitOrdersProfileCache.lastLoadedAt || 0) < DEBIT_ORDERS_CACHE_TTL_MS
  );
}

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = safeText(value);
    if (text) return text;
  }
  return "";
}

function currencyZar(value) {
  const num = Number(value || 0);
  return num.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(value) {
  const s = safeText(value);
  if (!s) return "Not set";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatDateTime(value) {
  const s = safeText(value);
  if (!s) return "Not set";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStatus(value) {
  const s = safeText(value);
  if (!s) return "Draft";
  const lower = s.toLowerCase();

  if (
    lower === "failed" ||
    lower === "failure" ||
    lower === "failed debit" ||
    lower === "failed payment" ||
    lower === "payment failed" ||
    lower === "retry failed" ||
    lower === "unsuccessful" ||
    lower === "error" ||
    lower === "declined" ||
    lower === "rejected"
  ) {
    return "Failed";
  }

  if (lower === "paid" || lower === "successful" || lower === "success") return "Paid";
  if (lower === "live" || lower === "active") return "Paid";
  if (lower === "paused") return "Scheduled";
  if (lower === "cancelled" || lower === "canceled") return "Failed";
  if (lower === "scheduled" || lower === "retry" || lower === "retry pending" || lower === "pending retry") {
    return "Scheduled";
  }
  if (lower === "unpaid") return "Failed";
  if (lower === "draft") return "Scheduled";

  return s;
}

function getFailureReason(row) {
  return firstNonEmpty(
    row?.failureReason,
    row?.failure_reason,
    row?.statusReason,
    row?.reason,
    row?.notes
  );
}

function isFailedRow(row) {
  if (normalizeStatus(row?.status) === "Failed") return true;
  return !!safeText(getFailureReason(row));
}

function getResolvedClientId(row) {
  return firstNonEmpty(
    row?.clientId,
    row?.crmClientId,
    row?.zohoClientId,
    row?.client?.id,
    row?.client?.crmId,
    row?.client?.crm_id,
    row?.client?.clientId,
    row?.client?.zohoClientId,
    row?.client?.zoho_client_id,
    row?.client_id,
    row?.crm_client_id,
    row?.zoho_client_id,
    row?.Client_ID,
    row?.CRM_Client_ID,
    row?.Zoho_Client_ID
  );
}

function getResolvedClientName(row) {
  return firstNonEmpty(
    row?.clientName,
    row?.client?.name,
    row?.client?.Name,
    row?.name
  );
}

function getRetryCount(row) {
  const n = Number(row?.retryCount ?? row?.retry_count ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isRetryRecoveredRow(row) {
  return !isFailedRow(row) && getRetryCount(row) > 0 && normalizeStatus(row?.status) === "Paid";
}

function isMissed25thRow(row) {
  return !isFailedRow(row) && !isRetryRecoveredRow(row) && normalizeStatus(row?.status) === "Scheduled";
}

function isPaidOnTimeRow(row) {
  return !isFailedRow(row) && !isRetryRecoveredRow(row) && !isMissed25thRow(row) && normalizeStatus(row?.status) === "Paid";
}

function getHealthSummary(rows) {
  const failed = rows.filter(isFailedRow).length;
  const retryRecovered = rows.filter(isRetryRecoveredRow).length;
  const missed25th = rows.filter(isMissed25thRow).length;
  const paidOnTime = rows.filter(isPaidOnTimeRow).length;

  const scoreRaw = 100 - failed * 30 - missed25th * 18 - retryRecovered * 8;
  const score = Math.max(0, Math.min(100, scoreRaw));

  let label = "Healthy";
  let tone = "good";
  let note = "Client is paying consistently with low recovery pressure.";

  if (failed >= 2 || score <= 50) {
    label = "Critical";
    tone = "critical";
    note = "Repeated failures detected. Immediate follow-up recommended.";
  } else if (failed >= 1 || missed25th >= 2 || score <= 60) {
    label = "At Risk";
    tone = "risk";
    note = "Client is showing debit stress and should be monitored closely.";
  } else if (retryRecovered >= 1 || missed25th >= 1 || score <= 75) {
    label = "Watchlist";
    tone = "watch";
    note = "Client is still recoverable but needs closer attention.";
  }

  return {
    score,
    label,
    tone,
    note,
    failed,
    retryRecovered,
    missed25th,
    paidOnTime,
  };
}

function buildClientGroups(rows) {
  const map = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    const clientId = getResolvedClientId(row);
    const clientName = getResolvedClientName(row);
    const key = firstNonEmpty(clientId, clientName, row?.id);

    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, {
        key,
        clientId,
        clientName,
        rows: [],
      });
    }

    const entry = map.get(key);
    entry.rows.push(row);

    if (!entry.clientId && clientId) entry.clientId = clientId;
    if (!entry.clientName && clientName) entry.clientName = clientName;
  }

  const groups = Array.from(map.values()).map((group) => {
    const orderedRows = [...group.rows].sort((a, b) => {
      return new Date(b?.updatedAt || 0).getTime() - new Date(a?.updatedAt || 0).getTime();
    });

    const latest = orderedRows[0] || null;
    const health = getHealthSummary(orderedRows);
    const totalValue = orderedRows.reduce((sum, row) => sum + Number(row?.amount || 0), 0);

    return {
      ...group,
      rows: orderedRows,
      latest,
      health,
      totalRecords: orderedRows.length,
      totalValue,
    };
  });

  return groups.sort((a, b) => {
    const aTime = new Date(a.latest?.updatedAt || 0).getTime();
    const bTime = new Date(b.latest?.updatedAt || 0).getTime();
    return bTime - aTime;
  });
}

function downloadCsv(filename, rows) {
  const csvEscape = (v) => {
    const s = safeText(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function getScoreColor(score) {
  if (score >= 90) return "#22c55e";
  if (score >= 75) return "#84cc16";
  if (score >= 60) return "#eab308";
  if (score > 50) return "#f97316";
  return "#ef4444";
}

function SearchIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="rgba(255,255,255,0.74)" strokeWidth="2" />
      <path d="M16.2 16.2 21 21" stroke="rgba(255,255,255,0.74)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CaretDownIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 10l5 5 5-5" stroke="rgba(255,255,255,0.86)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TickIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" stroke="rgba(255,255,255,0.95)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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

function RecordsDropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useOnClickOutside(wrapRef, () => setOpen(false));

  const active = options.find((item) => Number(item.value) === Number(value)) || options[0];

  return (
    <div ref={wrapRef} className="tt-do-ddWrap">
      <span className="tt-do-ddLabel">Records</span>

      <div className="tt-do-ddRel">
        <button
          type="button"
          className={open ? "tt-do-ddBtn tt-do-ddBtnOpen" : "tt-do-ddBtn"}
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span>{active?.label || ""}</span>
          <span className="tt-do-ddCaret">
            <CaretDownIcon />
          </span>
        </button>

        {open ? (
          <div className="tt-do-ddMenu" role="listbox" aria-label="Records per page">
            {options.map((item, index) => {
              const isActive = Number(item.value) === Number(value);

              return (
                <button
                  key={item.value}
                  type="button"
                  className={isActive ? "tt-do-ddItem tt-do-ddItemActive" : "tt-do-ddItem"}
                  style={{
                    borderBottom: index === options.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)",
                  }}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <span>{item.label}</span>
                  {isActive ? (
                    <span className="tt-do-ddTick">
                      <TickIcon />
                    </span>
                  ) : (
                    <span style={{ width: 18, height: 18 }} />
                  )}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DonutChart({ missed25th, retryRecovered, failed, paidOnTime, score }) {
  const total = Math.max(1, missed25th + retryRecovered + failed + paidOnTime);
  const radius = 58;
  const stroke = 14;
  const size = 160;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { value: paidOnTime, color: "#22c55e" },
    { value: retryRecovered, color: "#8b5cf6" },
    { value: missed25th, color: "#f59e0b" },
    { value: failed, color: "#ef4444" },
  ];

  let offset = 0;
  const scoreColor = getScoreColor(score);

  return (
    <div className="tt-do-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="tt-do-svg" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        {segments.map((segment, index) => {
          const length = (segment.value / total) * circumference;
          const circle = (
            <circle
              key={`${segment.color}-${index}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${length} ${circumference}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += length;
          return circle;
        })}
      </svg>

      <div className="tt-do-center">
        <div className="tt-do-score" style={{ color: scoreColor }}>
          {score}
        </div>
        <div className="tt-do-scoreLabel">Health score</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);
  const toneMap = {
    Paid: "good",
    Scheduled: "watch",
    Failed: "critical",
  };

  return (
    <span className={`tt-statusBadge tt-statusBadge-${toneMap[normalized] || "neutral"}`}>
      <span className="tt-statusDot" />
      {normalized}
    </span>
  );
}

function HealthBadge({ tone, label }) {
  return <span className={`tt-healthBadge tt-healthBadge-${tone}`}>{label}</span>;
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="tt-metricCard">
      <div className="tt-metricLabel">{label}</div>
      <div className="tt-metricValue">{value}</div>
      {sub ? <div className="tt-metricSub">{sub}</div> : null}
    </div>
  );
}

export default function DebitOrders({ presetSearch = "", presetFocusClientId = "" }) {
  const [rows, setRows] = useState(() => (Array.isArray(debitOrdersProfileCache.rows) ? debitOrdersProfileCache.rows : []));
  const [query, setQuery] = useState(() => safeText(presetSearch || debitOrdersProfileCache.query));
  const [selectedClientKey, setSelectedClientKey] = useState(() =>
    safeText(presetFocusClientId || debitOrdersProfileCache.selectedClientKey)
  );
  const [historyFilter, setHistoryFilter] = useState(() => safeText(debitOrdersProfileCache.historyFilter) || "All");
  const [clientListPage, setClientListPage] = useState(() => {
    const n = Number(debitOrdersProfileCache.clientListPage || 1);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  const [clientListPerPage, setClientListPerPage] = useState(() => {
    const n = Number(debitOrdersProfileCache.clientListPerPage || 10);
    return Number.isFinite(n) && n > 0 ? n : 10;
  });
  const [historyPage, setHistoryPage] = useState(() => {
    const n = Number(debitOrdersProfileCache.historyPage || 1);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  const [historyPerPage] = useState(() => {
    const n = Number(debitOrdersProfileCache.historyPerPage || 10);
    return Number.isFinite(n) && n > 0 ? n : 10;
  });
  const [loading, setLoading] = useState(() => !hasFreshCache());
  const [errorText, setErrorText] = useState(() => safeText(debitOrdersProfileCache.errorText));

  useEffect(() => {
    debitOrdersProfileCache = {
      ...debitOrdersProfileCache,
      rows,
      query,
      selectedClientKey,
      historyFilter,
      clientListPage,
      clientListPerPage,
      historyPage,
      historyPerPage,
      errorText,
      lastLoadedAt: debitOrdersProfileCache.lastLoadedAt,
    };
  }, [
    rows,
    query,
    selectedClientKey,
    historyFilter,
    clientListPage,
    clientListPerPage,
    historyPage,
    historyPerPage,
    errorText,
  ]);

  async function load({ force = false } = {}) {
    if (!force && hasFreshCache()) {
      setRows(Array.isArray(debitOrdersProfileCache.rows) ? debitOrdersProfileCache.rows : []);
      setErrorText(safeText(debitOrdersProfileCache.errorText));
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorText("");

    try {
      const json = await request("/api/debit-orders", { method: "GET" });

      if (!json || json.ok !== true || !Array.isArray(json.data)) {
        throw new Error("Unexpected response from /api/debit-orders");
      }

      setRows(json.data);

      debitOrdersProfileCache = {
        ...debitOrdersProfileCache,
        rows: json.data,
        query,
        selectedClientKey,
        historyFilter,
        clientListPage,
        clientListPerPage,
        historyPage,
        historyPerPage,
        errorText: "",
        lastLoadedAt: Date.now(),
      };
    } catch (e) {
      const nextError = safeText(e?.message || e);
      setRows([]);
      setErrorText(nextError);

      debitOrdersProfileCache = {
        ...debitOrdersProfileCache,
        rows: [],
        errorText: nextError,
        lastLoadedAt: 0,
      };
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load({ force: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const nextPreset = safeText(presetFocusClientId || presetSearch);
    if (!nextPreset) return;
    setQuery(nextPreset);
    setSelectedClientKey(nextPreset);
    setClientListPage(1);
    setHistoryPage(1);
  }, [presetFocusClientId, presetSearch]);

  const clientGroups = useMemo(() => buildClientGroups(rows), [rows]);

  const filteredGroups = useMemo(() => {
    const q = safeText(query).toLowerCase();
    if (!q) return clientGroups;

    return clientGroups.filter((group) => {
      const searchPool = [
        group.clientId,
        group.clientName,
        group.key,
        group.latest?.paystackCustomerCode,
        group.latest?.paystackAuthorizationCode,
        group.latest?.booksInvoiceId,
      ]
        .map((value) => safeText(value).toLowerCase())
        .filter(Boolean);

      return searchPool.some((value) => value.includes(q));
    });
  }, [clientGroups, query]);

  useEffect(() => {
    setClientListPage(1);
  }, [query, clientListPerPage]);

  const clientListPageCount = useMemo(() => {
    return Math.max(1, Math.ceil(filteredGroups.length / clientListPerPage));
  }, [filteredGroups.length, clientListPerPage]);

  useEffect(() => {
    if (clientListPage > clientListPageCount) setClientListPage(clientListPageCount);
  }, [clientListPage, clientListPageCount]);

  const pagedClientGroups = useMemo(() => {
    const start = (clientListPage - 1) * clientListPerPage;
    return filteredGroups.slice(start, start + clientListPerPage);
  }, [filteredGroups, clientListPage, clientListPerPage]);

  useEffect(() => {
    if (!filteredGroups.length) {
      setSelectedClientKey("");
      return;
    }

    const desired = safeText(presetFocusClientId) || safeText(selectedClientKey) || safeText(query);

    const match =
      filteredGroups.find((group) => safeText(group.clientId) === desired) ||
      filteredGroups.find((group) => safeText(group.key) === desired) ||
      filteredGroups.find((group) => safeText(group.clientName).toLowerCase() === desired.toLowerCase());

    if (match) {
      if (selectedClientKey !== match.key) {
        setSelectedClientKey(match.key);
      }

      const matchIndex = filteredGroups.findIndex((group) => group.key === match.key);
      if (matchIndex >= 0) {
        const targetPage = Math.floor(matchIndex / clientListPerPage) + 1;
        if (targetPage !== clientListPage) {
          setClientListPage(targetPage);
        }
      }
      return;
    }

    if (!filteredGroups.some((group) => group.key === selectedClientKey)) {
      setSelectedClientKey(filteredGroups[0].key);
    }
  }, [filteredGroups, presetFocusClientId, selectedClientKey, query, clientListPerPage, clientListPage]);

  const selectedGroup = useMemo(() => {
    return (
      filteredGroups.find((group) => group.key === selectedClientKey) ||
      filteredGroups.find((group) => safeText(group.clientId) === safeText(selectedClientKey)) ||
      filteredGroups[0] ||
      null
    );
  }, [filteredGroups, selectedClientKey]);

  const historyRows = useMemo(() => {
    const rowsForClient = Array.isArray(selectedGroup?.rows) ? selectedGroup.rows : [];
    if (historyFilter === "Paid") return rowsForClient.filter((row) => normalizeStatus(row?.status) === "Paid");
    if (historyFilter === "Scheduled") return rowsForClient.filter((row) => normalizeStatus(row?.status) === "Scheduled");
    if (historyFilter === "Failed") return rowsForClient.filter((row) => isFailedRow(row) || normalizeStatus(row?.status) === "Failed");
    return rowsForClient;
  }, [selectedGroup, historyFilter]);

  const historyCounts = useMemo(() => {
    const rowsForClient = Array.isArray(selectedGroup?.rows) ? selectedGroup.rows : [];
    return {
      All: rowsForClient.length,
      Paid: rowsForClient.filter((row) => normalizeStatus(row?.status) === "Paid").length,
      Scheduled: rowsForClient.filter((row) => normalizeStatus(row?.status) === "Scheduled").length,
      Failed: rowsForClient.filter((row) => isFailedRow(row) || normalizeStatus(row?.status) === "Failed").length,
    };
  }, [selectedGroup]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyFilter, selectedGroup?.key]);

  const historyPageCount = useMemo(() => {
    return Math.max(1, Math.ceil(historyRows.length / historyPerPage));
  }, [historyRows.length, historyPerPage]);

  useEffect(() => {
    if (historyPage > historyPageCount) setHistoryPage(historyPageCount);
  }, [historyPage, historyPageCount]);

  const pagedHistoryRows = useMemo(() => {
    const start = (historyPage - 1) * historyPerPage;
    return historyRows.slice(start, start + historyPerPage);
  }, [historyRows, historyPage, historyPerPage]);

  function onExportHistory() {
    if (!selectedGroup) return;

    const header = [
      "Client Name",
      "CRM Client ID",
      "Debit Order Record ID",
      "Status",
      "Amount",
      "Billing Cycle",
      "Next Charge Date",
      "Retry Count",
      "Last Transaction Reference",
      "Failure Reason",
      "Books Invoice ID",
      "Updated At",
    ];

    const body = historyRows.map((row) => [
      selectedGroup.clientName || "",
      selectedGroup.clientId || "",
      row.id || "",
      normalizeStatus(row.status),
      row.amount ?? "",
      row.billingCycle || "",
      row.nextChargeDate || "",
      getRetryCount(row),
      row.lastTransactionReference || "",
      getFailureReason(row),
      row.booksInvoiceId || "",
      row.updatedAt || "",
    ]);

    downloadCsv(
      `tabbytech-debit-history-${safeText(selectedGroup.clientId || selectedGroup.clientName || "client")}.csv`,
      [header, ...body]
    );
  }

  const health = selectedGroup?.health || {
    score: 0,
    label: "Healthy",
    tone: "good",
    note: "",
    failed: 0,
    retryRecovered: 0,
    missed25th: 0,
    paidOnTime: 0,
  };

  const clientListOptions = [
    { value: 10, label: "10 records" },
    { value: 20, label: "20 records" },
    { value: 50, label: "50 records" },
    { value: 100, label: "100 records" },
  ];

  const css = `
    .tt-do-page {
      width: 100%;
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: rgba(255,255,255,0.94);
      --tt-purple: #7c3aed;
      --tt-purple2: #a855f7;
      --tt-purple3: #5b21b6;
      --tt-purple4: #3b0764;
      --tt-panel-border: rgba(168,85,247,0.18);
    }

    .tt-do-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .tt-do-title {
      margin: 0;
      font-size: 26px;
      font-weight: 900;
      color: rgba(255,255,255,0.98);
      letter-spacing: 0.2px;
    }

    .tt-do-sub {
      margin: 6px 0 0 0;
      font-size: 13px;
      color: rgba(255,255,255,0.62);
      line-height: 1.45;
      max-width: 900px;
    }

    .tt-do-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .tt-do-btn {
      height: 38px;
      padding: 0 15px;
      border-radius: 12px;
      border: 1px solid rgba(168,85,247,0.58);
      background: linear-gradient(135deg, #a855f7, #7c3aed);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.2px;
      box-shadow: 0 14px 34px rgba(124,58,237,0.32);
      transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
      white-space: nowrap;
    }

    .tt-do-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.05);
      box-shadow: 0 18px 40px rgba(124,58,237,0.38);
    }

    .tt-do-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      filter: none;
    }

    .tt-do-shell {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .tt-do-glass {
      position: relative;
      overflow: hidden;
      border-radius: 22px;
      border: 1px solid var(--tt-panel-border);
      background:
        radial-gradient(circle at top right, rgba(168,85,247,0.20), transparent 24%),
        radial-gradient(circle at bottom left, rgba(91,33,182,0.14), transparent 28%),
        linear-gradient(180deg, rgba(20,18,40,0.98) 0%, rgba(8,10,24,0.98) 100%);
      box-shadow:
        0 24px 60px rgba(0,0,0,0.40),
        inset 0 1px 0 rgba(255,255,255,0.05);
      backdrop-filter: blur(16px);
    }

    .tt-do-hero {
      padding: 18px;
      display: grid;
      grid-template-columns: minmax(420px, 1.15fr) minmax(300px, 0.85fr);
      gap: 16px;
      align-items: stretch;
    }

    .tt-do-leftHero {
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-width: 0;
    }

    .tt-do-searchWrap {
      position: relative;
      width: 100%;
      max-width: 620px;
    }

    .tt-do-searchIcon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0.8;
    }

    .tt-do-search {
      width: 100%;
      height: 42px;
      border-radius: 14px;
      border: 1px solid rgba(168,85,247,0.30);
      background: linear-gradient(180deg, rgba(7,8,20,0.96) 0%, rgba(20,18,40,0.96) 100%);
      color: rgba(255,255,255,0.94);
      outline: none;
      padding: 0 14px 0 40px;
      font-size: 13px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
    }

    .tt-do-search:focus {
      border-color: rgba(168,85,247,0.6);
      box-shadow: 0 0 0 5px rgba(124,58,237,0.18);
    }

    .tt-do-selectorCard {
      border-radius: 20px;
      border: 1px solid rgba(168,85,247,0.18);
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
      overflow: hidden;
    }

    .tt-do-selectorHead {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(168,85,247,0.12);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      background: rgba(15,12,30,0.6);
    }

    .tt-do-selectorTitle {
      font-size: 13px;
      font-weight: 900;
      color: rgba(255,255,255,0.94);
      margin: 0;
    }

    .tt-do-selectorSub {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: rgba(255,255,255,0.58);
    }

    .tt-do-selectorScroll {
      max-height: 235px;
      overflow: auto;
    }

    .tt-do-selectorTable {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 12px;
    }

    .tt-do-selectorTh {
      position: sticky;
      top: 0;
      z-index: 1;
      text-align: left;
      padding: 11px 14px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.2px;
      color: rgba(255,255,255,0.62);
      background: rgba(7,8,18,0.92);
      border-bottom: 1px solid rgba(168,85,247,0.12);
    }

    .tt-do-selectorTd {
      padding: 11px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.84);
      vertical-align: middle;
      white-space: nowrap;
    }

    .tt-do-selectorRow {
      cursor: pointer;
      transition: background 160ms ease;
    }

    .tt-do-selectorRow:hover {
      background: rgba(255,255,255,0.04);
    }

    .tt-do-selectorRowActive {
      background: linear-gradient(90deg, rgba(168,85,247,0.20), rgba(124,58,237,0.08));
    }

    .tt-do-miniBadge {
      height: 22px;
      padding: 0 9px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.2px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.86);
    }

    .tt-do-miniBadge-good {
      background: rgba(34,197,94,0.16);
      border-color: rgba(34,197,94,0.34);
    }

    .tt-do-miniBadge-watch {
      background: rgba(132,204,22,0.16);
      border-color: rgba(132,204,22,0.34);
    }

    .tt-do-miniBadge-risk {
      background: rgba(234,179,8,0.16);
      border-color: rgba(234,179,8,0.34);
    }

    .tt-do-miniBadge-critical {
      background: rgba(239,68,68,0.18);
      border-color: rgba(239,68,68,0.42);
    }

    .tt-do-selectorFoot {
      padding: 12px 16px;
      border-top: 1px solid rgba(168,85,247,0.12);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      background: rgba(15,12,30,0.55);
    }

    .tt-do-clientCard {
      border-radius: 20px;
      border: 1px solid rgba(168,85,247,0.18);
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .tt-do-kicker {
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(193,168,255,0.96);
    }

    .tt-do-clientName {
      font-size: 28px;
      line-height: 1.12;
      font-weight: 900;
      color: rgba(255,255,255,0.98);
      margin: 0;
      word-break: break-word;
    }

    .tt-do-metaRow {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .tt-do-idPill {
      height: 28px;
      padding: 0 12px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      border: 1px solid rgba(168,85,247,0.34);
      background: rgba(168,85,247,0.14);
      color: rgba(255,255,255,0.92);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.2px;
    }

    .tt-healthBadge {
      height: 28px;
      padding: 0 12px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.2px;
      border: 1px solid rgba(255,255,255,0.14);
    }

    .tt-healthBadge-good {
      background: rgba(34,197,94,0.16);
      border-color: rgba(34,197,94,0.34);
      color: rgba(255,255,255,0.94);
    }

    .tt-healthBadge-watch {
      background: rgba(132,204,22,0.16);
      border-color: rgba(132,204,22,0.34);
      color: rgba(255,255,255,0.94);
    }

    .tt-healthBadge-risk {
      background: rgba(234,179,8,0.16);
      border-color: rgba(234,179,8,0.34);
      color: rgba(255,255,255,0.94);
    }

    .tt-healthBadge-critical {
      background: rgba(239,68,68,0.18);
      border-color: rgba(239,68,68,0.42);
      color: rgba(255,255,255,0.98);
    }

    .tt-do-note {
      font-size: 13px;
      line-height: 1.5;
      color: rgba(255,255,255,0.72);
      margin: 0;
      max-width: 760px;
    }

    .tt-do-rightHero {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .tt-metricCard {
      border-radius: 18px;
      border: 1px solid rgba(168,85,247,0.16);
      background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
      padding: 14px;
      min-height: 104px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .tt-metricLabel {
      font-size: 12px;
      color: rgba(255,255,255,0.56);
      font-weight: 800;
    }

    .tt-metricValue {
      font-size: 22px;
      font-weight: 900;
      color: rgba(255,255,255,0.96);
      line-height: 1.1;
      margin-top: 6px;
    }

    .tt-metricSub {
      font-size: 12px;
      color: rgba(255,255,255,0.58);
      line-height: 1.4;
      margin-top: 8px;
    }

    .tt-do-mainGrid {
      display: grid;
      grid-template-columns: minmax(360px, 0.95fr) minmax(420px, 1.05fr);
      gap: 16px;
      min-height: 0;
    }

    .tt-do-panelHeader {
      padding: 16px 16px 12px 16px;
      border-bottom: 1px solid rgba(168,85,247,0.14);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      background: rgba(15,12,30,0.65);
    }

    .tt-do-panelTitle {
      margin: 0;
      font-size: 14px;
      font-weight: 900;
      color: rgba(255,255,255,0.94);
    }

    .tt-do-panelSub {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: rgba(255,255,255,0.56);
      line-height: 1.45;
    }

    .tt-do-panelBody {
      padding: 16px;
    }

    .tt-do-healthGrid {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: 16px;
      align-items: center;
    }

    .tt-do-wrap {
      width: 160px;
      height: 160px;
      position: relative;
      margin: 0 auto;
    }

    .tt-do-svg {
      display: block;
      overflow: visible;
    }

    .tt-do-center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      text-align: center;
    }

    .tt-do-score {
      font-size: 30px;
      font-weight: 900;
      line-height: 1;
    }

    .tt-do-scoreLabel {
      margin-top: 6px;
      font-size: 12px;
      color: rgba(255,255,255,0.58);
      font-weight: 800;
    }

    .tt-do-legend {
      display: grid;
      gap: 10px;
    }

    .tt-do-legendItem {
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .tt-do-legendLeft {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .tt-do-legendDot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex: 0 0 auto;
    }

    .tt-do-legendTitle {
      font-size: 12px;
      color: rgba(255,255,255,0.72);
      font-weight: 800;
    }

    .tt-do-legendValue {
      font-size: 18px;
      color: rgba(255,255,255,0.96);
      font-weight: 900;
      line-height: 1;
    }

    .tt-do-insights {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .tt-do-insightCard {
      border-radius: 18px;
      border: 1px solid rgba(168,85,247,0.14);
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
      padding: 14px;
    }

    .tt-do-insightTitle {
      font-size: 12px;
      color: rgba(255,255,255,0.56);
      font-weight: 800;
      margin-bottom: 8px;
    }

    .tt-do-insightValue {
      font-size: 18px;
      color: rgba(255,255,255,0.96);
      font-weight: 900;
      line-height: 1.15;
      word-break: break-word;
    }

    .tt-do-history {
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .tt-do-historyToolbar {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(168,85,247,0.14);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      background: rgba(15,12,30,0.6);
    }

    .tt-do-historyMeta {
      font-size: 12px;
      color: rgba(255,255,255,0.60);
      font-weight: 700;
    }

    .tt-do-pillRow {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .tt-do-pill {
      height: 34px;
      padding: 0 12px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.2px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.82);
      transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }

    .tt-do-pill:hover {
      transform: translateY(-1px);
    }

    .tt-do-pillActive {
      border-color: rgba(168,85,247,0.52);
      background: linear-gradient(135deg, rgba(168,85,247,0.22), rgba(124,58,237,0.12));
      color: rgba(255,255,255,0.96);
      box-shadow: 0 12px 28px rgba(124,58,237,0.18);
    }

    .tt-do-tableScroll {
      overflow: auto;
      min-height: 0;
      flex: 1;
    }

    .tt-do-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 13px;
    }

    .tt-do-th {
      position: sticky;
      top: 0;
      z-index: 2;
      text-align: left;
      padding: 12px 14px;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.2px;
      color: rgba(255,255,255,0.62);
      background: rgba(7,8,18,0.92);
      border-bottom: 1px solid rgba(168,85,247,0.14);
      backdrop-filter: blur(10px);
    }

    .tt-do-td {
      padding: 13px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.82);
      white-space: nowrap;
      vertical-align: top;
    }

    .tt-do-tr {
      transition: background 160ms ease;
    }

    .tt-do-tr:hover {
      background: rgba(255,255,255,0.04);
    }

    .tt-statusBadge {
      height: 24px;
      padding: 0 10px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.2px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.90);
    }

    .tt-statusDot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 10px currentColor;
      opacity: 0.95;
    }

    .tt-statusBadge-good {
      background: rgba(34,197,94,0.15);
      border-color: rgba(34,197,94,0.34);
      color: #66f0bf;
    }

    .tt-statusBadge-watch {
      background: rgba(245,158,11,0.15);
      border-color: rgba(245,158,11,0.34);
      color: #ffcf72;
    }

    .tt-statusBadge-critical {
      background: rgba(239,68,68,0.16);
      border-color: rgba(239,68,68,0.34);
      color: #ff8b8b;
    }

    .tt-statusBadge-neutral {
      background: rgba(255,255,255,0.07);
      border-color: rgba(255,255,255,0.14);
      color: rgba(255,255,255,0.84);
    }

    .tt-do-empty {
      min-height: 280px;
      display: grid;
      place-items: center;
      padding: 24px;
      text-align: center;
    }

    .tt-do-emptyCard {
      max-width: 520px;
      border-radius: 22px;
      border: 1px solid rgba(168,85,247,0.14);
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
      padding: 28px;
    }

    .tt-do-emptyTitle {
      font-size: 22px;
      font-weight: 900;
      color: rgba(255,255,255,0.96);
      margin: 0 0 10px 0;
    }

    .tt-do-emptySub {
      font-size: 13px;
      line-height: 1.55;
      color: rgba(255,255,255,0.66);
      margin: 0;
    }

    .tt-do-navRow {
      display: flex;
      align-items: center;
      gap: 10px;
      justify-content: flex-end;
      padding: 14px 16px 16px 16px;
      border-top: 1px solid rgba(168,85,247,0.14);
      background: rgba(15,12,30,0.6);
    }

    .tt-do-pagePill {
      height: 38px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.88);
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      font-weight: 900;
    }

    .tt-do-error {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(168,85,247,0.14);
      background: rgba(239,68,68,0.12);
      color: rgba(255,255,255,0.90);
      font-size: 12px;
      font-weight: 700;
    }

    .tt-do-ddWrap {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .tt-do-ddLabel {
      font-size: 12px;
      color: rgba(255,255,255,0.55);
      font-weight: 800;
    }

    .tt-do-ddRel {
      position: relative;
      display: inline-block;
    }

    .tt-do-ddBtn {
      height: 34px;
      padding: 0 12px;
      border-radius: 11px;
      border: 1px solid rgba(168,85,247,0.40);
      background: rgba(0,0,0,0.42);
      color: rgba(255,255,255,0.92);
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.15px;
      min-width: 130px;
      box-sizing: border-box;
    }

    .tt-do-ddBtnOpen {
      background: rgba(168,85,247,0.16);
    }

    .tt-do-ddCaret {
      opacity: 0.95;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .tt-do-ddMenu {
      position: absolute;
      top: 40px;
      left: 0;
      min-width: 190px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(10,10,14,0.92);
      box-shadow: 0 18px 50px rgba(0,0,0,0.45);
      backdrop-filter: blur(14px);
      overflow: hidden;
      z-index: 60;
    }

    .tt-do-ddItem {
      width: 100%;
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
      border-left: none;
      border-right: none;
      border-top: none;
      outline: none;
    }

    .tt-do-ddItemActive {
      background: rgba(168,85,247,0.22);
    }

    .tt-do-ddTick {
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

    @media (max-width: 1320px) {
      .tt-do-hero,
      .tt-do-mainGrid {
        grid-template-columns: 1fr;
      }

      .tt-do-healthGrid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 980px) {
      .tt-do-rightHero,
      .tt-do-insights {
        grid-template-columns: 1fr;
      }

      .tt-do-selectorHead,
      .tt-do-selectorFoot,
      .tt-do-historyToolbar,
      .tt-do-navRow {
        justify-content: flex-start;
      }
    }
  `;

  return (
    <div className="tt-do-page">
      <style>{css}</style>

      <div className="tt-do-header">
        <div>
          <h1 className="tt-do-title">Debit Orders</h1>
          <p className="tt-do-sub">
            Premium client debit profile view with CRM record visibility, health scoring, retry behaviour and debit history.
          </p>
        </div>

        <div className="tt-do-actions">
          <button type="button" className="tt-do-btn" onClick={() => load({ force: true })} disabled={loading}>
            {loading ? "Syncing..." : "Sync now"}
          </button>

          <button type="button" className="tt-do-btn" onClick={onExportHistory} disabled={!selectedGroup}>
            Export history
          </button>
        </div>
      </div>

      <div className="tt-do-shell">
        <div className="tt-do-glass">
          {errorText ? <div className="tt-do-error">Error: {errorText}</div> : null}

          <div className="tt-do-hero">
            <div className="tt-do-leftHero">
              <div className="tt-do-searchWrap">
                <span className="tt-do-searchIcon">
                  <SearchIcon />
                </span>
                <input
                  className="tt-do-search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setClientListPage(1);
                    setHistoryPage(1);
                  }}
                  placeholder="Search client name, CRM record ID, Books invoice ID, or Paystack code"
                  aria-label="Search debit order client"
                />
              </div>

              <div className="tt-do-selectorCard">
                <div className="tt-do-selectorHead">
                  <div>
                    <p className="tt-do-selectorTitle">Client selection</p>
                    <p className="tt-do-selectorSub">Choose the client debit profile you want to inspect.</p>
                  </div>

                  <RecordsDropdown
                    value={clientListPerPage}
                    onChange={(nextValue) => {
                      setClientListPerPage(Number(nextValue));
                      setClientListPage(1);
                    }}
                    options={clientListOptions}
                  />
                </div>

                <div className="tt-do-selectorScroll">
                  <table className="tt-do-selectorTable">
                    <thead>
                      <tr>
                        <th className="tt-do-selectorTh">Client</th>
                        <th className="tt-do-selectorTh">CRM ID</th>
                        <th className="tt-do-selectorTh">Records</th>
                        <th className="tt-do-selectorTh">Health</th>
                        <th className="tt-do-selectorTh">Latest Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedClientGroups.map((group) => {
                        const active = selectedGroup?.key === group.key;
                        return (
                          <tr
                            key={group.key}
                            className={active ? "tt-do-selectorRow tt-do-selectorRowActive" : "tt-do-selectorRow"}
                            onClick={() => {
                              setSelectedClientKey(group.key);
                              setHistoryPage(1);
                            }}
                          >
                            <td className="tt-do-selectorTd" style={{ fontWeight: 800 }}>
                              {group.clientName || "Unknown client"}
                            </td>
                            <td className="tt-do-selectorTd">{group.client_id || group.clientId || "Not available"}</td>
                            <td className="tt-do-selectorTd">{group.totalRecords}</td>
                            <td className="tt-do-selectorTd">
                              <span className={`tt-do-miniBadge tt-do-miniBadge-${group.health.tone}`}>
                                {group.health.label}
                              </span>
                            </td>
                            <td className="tt-do-selectorTd">
                              <StatusBadge status={group.latest?.status} />
                            </td>
                          </tr>
                        );
                      })}

                      {!loading && pagedClientGroups.length === 0 ? (
                        <tr>
                          <td className="tt-do-selectorTd" colSpan={5} style={{ whiteSpace: "normal", padding: 18 }}>
                            No clients found for the current search.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <div className="tt-do-selectorFoot">
                  <span className="tt-do-pagePill">
                    Page {clientListPage} of {clientListPageCount}
                  </span>

                  <div className="tt-do-actions">
                    <button
                      type="button"
                      className="tt-do-btn"
                      onClick={() => setClientListPage((prev) => Math.max(1, prev - 1))}
                      disabled={clientListPage <= 1}
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      className="tt-do-btn"
                      onClick={() => setClientListPage((prev) => Math.min(clientListPageCount, prev + 1))}
                      disabled={clientListPage >= clientListPageCount}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              <div className="tt-do-clientCard">
                <div className="tt-do-kicker">Client debit profile</div>

                <h2 className="tt-do-clientName">
                  {selectedGroup?.clientName || "No client selected"}
                </h2>

                <div className="tt-do-metaRow">
                  <span className="tt-do-idPill">
                    CRM Record ID: {selectedGroup?.clientId || "Not available"}
                  </span>

                  {selectedGroup ? (
                    <HealthBadge tone={health.tone} label={`Client Health ${health.label}`} />
                  ) : null}
                </div>

                <p className="tt-do-note">
                  {selectedGroup
                    ? health.note
                    : "Search for a client or open Debit Orders from the Clients module to load a client-specific view."}
                </p>
              </div>
            </div>

            <div className="tt-do-rightHero">
              <MetricCard
                label="History records"
                value={selectedGroup ? String(selectedGroup.totalRecords) : "0"}
                sub="Debit-order rows available for this client."
              />

              <MetricCard
                label="Tracked value"
                value={selectedGroup ? currencyZar(selectedGroup.totalValue) : currencyZar(0)}
                sub="Combined amount across the rows currently loaded."
              />

              <MetricCard
                label="Latest status"
                value={selectedGroup ? normalizeStatus(selectedGroup.latest?.status) : "Draft"}
                sub={selectedGroup?.latest?.updatedAt ? `Updated ${formatDateTime(selectedGroup.latest.updatedAt)}` : "No update yet"}
              />

              <MetricCard
                label="Latest next charge"
                value={selectedGroup ? formatDate(selectedGroup.latest?.nextChargeDate) : "Not set"}
                sub={selectedGroup?.latest?.billingCycle ? selectedGroup.latest.billingCycle : "Billing cycle not set"}
              />
            </div>
          </div>
        </div>

        {!selectedGroup && !loading ? (
          <div className="tt-do-glass tt-do-empty">
            <div className="tt-do-emptyCard">
              <h3 className="tt-do-emptyTitle">No debit-order client found</h3>
              <p className="tt-do-emptySub">
                No client matched the current search. Open a client from the Clients module, or search using the CRM record ID to load the debit profile.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="tt-do-mainGrid">
              <div className="tt-do-glass">
                <div className="tt-do-panelHeader">
                  <div>
                    <p className="tt-do-panelTitle">Client health</p>
                    <p className="tt-do-panelSub">
                      Health donut based on missed 25th signals, retry recovery and failed debit outcomes.
                    </p>
                  </div>
                </div>

                <div className="tt-do-panelBody">
                  <div className="tt-do-healthGrid">
                    <DonutChart
                      missed25th={health.missed25th}
                      retryRecovered={health.retryRecovered}
                      failed={health.failed}
                      paidOnTime={health.paidOnTime}
                      score={health.score}
                    />

                    <div className="tt-do-legend">
                      <div className="tt-do-legendItem">
                        <div className="tt-do-legendLeft">
                          <span className="tt-do-legendDot" style={{ background: "#f59e0b" }} />
                          <span className="tt-do-legendTitle">Missed on 25th</span>
                        </div>
                        <span className="tt-do-legendValue">{health.missed25th}</span>
                      </div>

                      <div className="tt-do-legendItem">
                        <div className="tt-do-legendLeft">
                          <span className="tt-do-legendDot" style={{ background: "#8b5cf6" }} />
                          <span className="tt-do-legendTitle">Recovered on retry</span>
                        </div>
                        <span className="tt-do-legendValue">{health.retryRecovered}</span>
                      </div>

                      <div className="tt-do-legendItem">
                        <div className="tt-do-legendLeft">
                          <span className="tt-do-legendDot" style={{ background: "#ef4444" }} />
                          <span className="tt-do-legendTitle">Failed / unable to pay</span>
                        </div>
                        <span className="tt-do-legendValue">{health.failed}</span>
                      </div>

                      <div className="tt-do-legendItem">
                        <div className="tt-do-legendLeft">
                          <span className="tt-do-legendDot" style={{ background: "#22c55e" }} />
                          <span className="tt-do-legendTitle">Paid on time</span>
                        </div>
                        <span className="tt-do-legendValue">{health.paidOnTime}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tt-do-glass">
                <div className="tt-do-panelHeader">
                  <div>
                    <p className="tt-do-panelTitle">Client behaviour summary</p>
                    <p className="tt-do-panelSub">
                      Quick operational view of debit performance for this client.
                    </p>
                  </div>
                </div>

                <div className="tt-do-panelBody">
                  <div className="tt-do-insights">
                    <div className="tt-do-insightCard">
                      <div className="tt-do-insightTitle">Health status</div>
                      <div className="tt-do-insightValue">{health.label}</div>
                    </div>

                    <div className="tt-do-insightCard">
                      <div className="tt-do-insightTitle">Current Books invoice</div>
                      <div className="tt-do-insightValue">
                        {safeText(selectedGroup?.latest?.booksInvoiceId) || "Not linked"}
                      </div>
                    </div>

                    <div className="tt-do-insightCard">
                      <div className="tt-do-insightTitle">Current Paystack customer</div>
                      <div className="tt-do-insightValue">
                        {safeText(selectedGroup?.latest?.paystackCustomerCode) || "Not linked"}
                      </div>
                    </div>

                    <div className="tt-do-insightCard">
                      <div className="tt-do-insightTitle">Retry pressure</div>
                      <div className="tt-do-insightValue">
                        {health.retryRecovered + health.missed25th}
                      </div>
                    </div>

                    <div className="tt-do-insightCard">
                      <div className="tt-do-insightTitle">Latest reference</div>
                      <div className="tt-do-insightValue">
                        {safeText(selectedGroup?.latest?.lastTransactionReference) || "Not available"}
                      </div>
                    </div>

                    <div className="tt-do-insightCard">
                      <div className="tt-do-insightTitle">Latest failure reason</div>
                      <div className="tt-do-insightValue">
                        {safeText(getFailureReason(selectedGroup?.latest)) || "No failure logged"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="tt-do-glass tt-do-history">
              <div className="tt-do-panelHeader">
                <div>
                  <p className="tt-do-panelTitle">Debit order history</p>
                  <p className="tt-do-panelSub">
                    Client-specific debit-order rows loaded from Zoho CRM.
                  </p>
                </div>
              </div>

              <div className="tt-do-historyToolbar">
                <div className="tt-do-historyMeta">
                  {historyRows.length} filtered row(s) for {selectedGroup?.clientName || selectedGroup?.clientId || "client"}
                </div>

                <div className="tt-do-actions">
                  <HealthBadge tone={health.tone} label={health.label} />
                </div>
              </div>

              <div className="tt-do-historyToolbar" style={{ borderTop: "1px solid rgba(168,85,247,0.08)" }}>
                <div className="tt-do-pillRow">
                  {["All", "Paid", "Scheduled", "Failed"].map((pill) => (
                    <button
                      key={pill}
                      type="button"
                      className={`tt-do-pill ${historyFilter === pill ? "tt-do-pillActive" : ""}`}
                      onClick={() => setHistoryFilter(pill)}
                    >
                      <span>{pill}</span>
                      <span>{historyCounts[pill] ?? 0}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="tt-do-tableScroll">
                <table className="tt-do-table">
                  <thead>
                    <tr>
                      <th className="tt-do-th">Debit order record</th>
                      <th className="tt-do-th">Status</th>
                      <th className="tt-do-th">Amount</th>
                      <th className="tt-do-th">Billing cycle</th>
                      <th className="tt-do-th">Next charge</th>
                      <th className="tt-do-th">Retry count</th>
                      <th className="tt-do-th">Books invoice</th>
                      <th className="tt-do-th">Reference</th>
                      <th className="tt-do-th">Failure reason</th>
                      <th className="tt-do-th">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedHistoryRows.map((row) => {
                      const normalizedStatus = normalizeStatus(row?.status);

                      return (
                        <tr key={row.id} className="tt-do-tr">
                          <td className="tt-do-td">
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <span style={{ fontWeight: 900, color: "rgba(255,255,255,0.94)" }}>
                                {safeText(row?.name) || safeText(row?.id)}
                              </span>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.58)" }}>{safeText(row?.id)}</span>
                            </div>
                          </td>
                          <td className="tt-do-td">
                            <StatusBadge status={normalizedStatus} />
                          </td>
                          <td className="tt-do-td">{currencyZar(row?.amount)}</td>
                          <td className="tt-do-td">{safeText(row?.billingCycle) || "Not set"}</td>
                          <td className="tt-do-td">{formatDate(row?.nextChargeDate)}</td>
                          <td className="tt-do-td">{String(getRetryCount(row))}</td>
                          <td className="tt-do-td">{safeText(row?.booksInvoiceId) || "Not linked"}</td>
                          <td className="tt-do-td">{safeText(row?.lastTransactionReference) || "Not available"}</td>
                          <td className="tt-do-td" style={{ whiteSpace: "normal", minWidth: 220 }}>
                            {safeText(getFailureReason(row)) || "No failure logged"}
                          </td>
                          <td className="tt-do-td">{formatDateTime(row?.updatedAt)}</td>
                        </tr>
                      );
                    })}

                    {!loading && pagedHistoryRows.length === 0 ? (
                      <tr>
                        <td className="tt-do-td" colSpan={10} style={{ padding: 24, whiteSpace: "normal" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>No debit history found</div>
                            <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, lineHeight: 1.45 }}>
                              No rows matched the selected pill for this client.
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}

                    {loading ? (
                      <tr>
                        <td className="tt-do-td" colSpan={10} style={{ padding: 24 }}>
                          <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>Loading debit-order history...</div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="tt-do-navRow">
                <span className="tt-do-pagePill">
                  Page {historyPage} of {historyPageCount}
                </span>

                <button
                  type="button"
                  className="tt-do-btn"
                  onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                  disabled={historyPage <= 1}
                >
                  Back
                </button>

                <button
                  type="button"
                  className="tt-do-btn"
                  onClick={() => setHistoryPage((prev) => Math.min(historyPageCount, prev + 1))}
                  disabled={historyPage >= historyPageCount}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
