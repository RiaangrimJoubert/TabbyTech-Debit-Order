import React, { useEffect, useMemo, useState } from "react";
import { request } from "../api";

const DEBIT_ORDERS_CACHE_TTL_MS = 10 * 60 * 1000;

let debitOrdersProfileCache = {
  rows: [],
  query: "",
  selectedClientKey: "",
  page: 1,
  perPage: 10,
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
  if (lower === "live" || lower === "active") return "Live";
  if (lower === "paused") return "Paused";
  if (lower === "cancelled" || lower === "canceled") return "Cancelled";
  if (lower === "scheduled" || lower === "retry" || lower === "retry pending" || lower === "pending retry") {
    return "Scheduled";
  }
  if (lower === "unpaid") return "Unpaid";
  if (lower === "draft") return "Draft";

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
  const reason = safeText(getFailureReason(row));
  return !!reason;
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
  const status = normalizeStatus(row?.status);
  return !isFailedRow(row) && getRetryCount(row) > 0 && (status === "Paid" || status === "Live");
}

function isMissed25thRow(row) {
  const status = normalizeStatus(row?.status);
  return !isFailedRow(row) && !isRetryRecoveredRow(row) && (getRetryCount(row) > 0 || status === "Scheduled");
}

function isPaidOnTimeRow(row) {
  const status = normalizeStatus(row?.status);
  return !isFailedRow(row) && !isRetryRecoveredRow(row) && !isMissed25thRow(row) && (status === "Paid" || status === "Live");
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

  if (failed >= 2 || score < 40) {
    label = "Critical";
    tone = "critical";
    note = "Repeated failures detected. Immediate follow-up recommended.";
  } else if (failed >= 1 || missed25th >= 2 || score < 65) {
    label = "At Risk";
    tone = "risk";
    note = "Client is showing debit stress and should be monitored closely.";
  } else if (retryRecovered >= 1 || missed25th >= 1 || score < 85) {
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

function DonutChart({ missed25th, retryRecovered, failed, score }) {
  const total = Math.max(1, missed25th + retryRecovered + failed);
  const radius = 58;
  const stroke = 14;
  const size = 160;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { value: missed25th, color: "#f59e0b" },
    { value: retryRecovered, color: "#8b5cf6" },
    { value: failed, color: "#ef4444" },
  ];

  let offset = 0;

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
        <div className="tt-do-score">{score}</div>
        <div className="tt-do-scoreLabel">Health score</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);
  const toneMap = {
    Paid: "good",
    Live: "good",
    Scheduled: "watch",
    Failed: "critical",
    Cancelled: "critical",
    Paused: "watch",
    Draft: "neutral",
    Unpaid: "critical",
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

function SearchIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="rgba(255,255,255,0.74)" strokeWidth="2" />
      <path d="M16.2 16.2 21 21" stroke="rgba(255,255,255,0.74)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function DebitOrders({ presetSearch = "", presetFocusClientId = "" }) {
  const [rows, setRows] = useState(() => (Array.isArray(debitOrdersProfileCache.rows) ? debitOrdersProfileCache.rows : []));
  const [query, setQuery] = useState(() => safeText(presetSearch || debitOrdersProfileCache.query));
  const [selectedClientKey, setSelectedClientKey] = useState(() =>
    safeText(presetFocusClientId || debitOrdersProfileCache.selectedClientKey)
  );
  const [page, setPage] = useState(() => {
    const n = Number(debitOrdersProfileCache.page || 1);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  const [perPage] = useState(() => {
    const n = Number(debitOrdersProfileCache.perPage || 10);
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
      page,
      perPage,
      errorText,
      lastLoadedAt: debitOrdersProfileCache.lastLoadedAt,
    };
  }, [rows, query, selectedClientKey, page, perPage, errorText]);

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
        page,
        perPage,
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
    setPage(1);
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
    if (!filteredGroups.length) {
      setSelectedClientKey("");
      return;
    }

    const desired = safeText(presetFocusClientId) || safeText(selectedClientKey);
    const match =
      filteredGroups.find((group) => safeText(group.clientId) === desired) ||
      filteredGroups.find((group) => safeText(group.key) === desired);

    if (match) {
      if (selectedClientKey !== match.key) {
        setSelectedClientKey(match.key);
      }
      return;
    }

    if (!filteredGroups.some((group) => group.key === selectedClientKey)) {
      setSelectedClientKey(filteredGroups[0].key);
    }
  }, [filteredGroups, presetFocusClientId, selectedClientKey]);

  const selectedGroup = useMemo(() => {
    return (
      filteredGroups.find((group) => group.key === selectedClientKey) ||
      filteredGroups.find((group) => safeText(group.clientId) === safeText(selectedClientKey)) ||
      filteredGroups[0] ||
      null
    );
  }, [filteredGroups, selectedClientKey]);

  const historyRows = useMemo(() => {
    return Array.isArray(selectedGroup?.rows) ? selectedGroup.rows : [];
  }, [selectedGroup]);

  const historyPageCount = useMemo(() => {
    return Math.max(1, Math.ceil(historyRows.length / perPage));
  }, [historyRows.length, perPage]);

  useEffect(() => {
    if (page > historyPageCount) setPage(historyPageCount);
  }, [page, historyPageCount]);

  const pagedHistoryRows = useMemo(() => {
    const start = (page - 1) * perPage;
    return historyRows.slice(start, start + perPage);
  }, [historyRows, page, perPage]);

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

  const css = `
    .tt-do-page {
      width: 100%;
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: rgba(255,255,255,0.94);
      --tt-purple: rgba(124,58,237,0.98);
      --tt-purple2: rgba(168,85,247,0.98);
      --tt-panel-border: rgba(255,255,255,0.10);
      --tt-soft: rgba(255,255,255,0.62);
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
      color: rgba(255,255,255,0.97);
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
      border: 1px solid rgba(168,85,247,0.55);
      background: linear-gradient(135deg, rgba(168,85,247,0.96), rgba(124,58,237,0.96));
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.2px;
      box-shadow: 0 14px 34px rgba(124,58,237,0.24);
      transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
      white-space: nowrap;
    }

    .tt-do-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.04);
      box-shadow: 0 18px 40px rgba(124,58,237,0.30);
    }

    .tt-do-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      filter: none;
      box-shadow: 0 14px 34px rgba(124,58,237,0.12);
    }

    .tt-do-btnSecondary {
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.90);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
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
        radial-gradient(circle at top right, rgba(168,85,247,0.12), transparent 30%),
        linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.035) 100%);
      box-shadow:
        0 24px 60px rgba(0,0,0,0.36),
        inset 0 1px 0 rgba(255,255,255,0.05);
      backdrop-filter: blur(16px);
    }

    .tt-do-hero {
      padding: 18px;
      display: grid;
      grid-template-columns: minmax(320px, 1.1fr) minmax(300px, 0.9fr);
      gap: 16px;
      align-items: stretch;
    }

    .tt-do-leftHero {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .tt-do-searchWrap {
      position: relative;
      width: 100%;
      max-width: 560px;
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
      border: 1px solid rgba(255,255,255,0.12);
      background:
        linear-gradient(180deg, rgba(0,0,0,0.24) 0%, rgba(255,255,255,0.03) 100%);
      color: rgba(255,255,255,0.94);
      outline: none;
      padding: 0 14px 0 40px;
      font-size: 13px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
    }

    .tt-do-search:focus {
      border-color: rgba(168,85,247,0.48);
      box-shadow: 0 0 0 6px rgba(124,58,237,0.16);
    }

    .tt-do-clientCard {
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.10);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025));
      padding: 18px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
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
      background: rgba(245,158,11,0.16);
      border-color: rgba(245,158,11,0.34);
      color: rgba(255,255,255,0.94);
    }

    .tt-healthBadge-risk {
      background: rgba(239,68,68,0.16);
      border-color: rgba(239,68,68,0.34);
      color: rgba(255,255,255,0.94);
    }

    .tt-healthBadge-critical {
      background: rgba(185,28,28,0.18);
      border-color: rgba(239,68,68,0.42);
      color: rgba(255,255,255,0.98);
      box-shadow: 0 0 0 1px rgba(239,68,68,0.12);
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
      border: 1px solid rgba(255,255,255,0.10);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
      padding: 14px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
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
      border-bottom: 1px solid rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      background: rgba(0,0,0,0.08);
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
      color: rgba(255,255,255,0.98);
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
      border: 1px solid rgba(255,255,255,0.10);
      background: linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02));
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
    }

    .tt-do-history {
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .tt-do-historyToolbar {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.05));
    }

    .tt-do-historyMeta {
      font-size: 12px;
      color: rgba(255,255,255,0.60);
      font-weight: 700;
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
      background: rgba(10,10,14,0.84);
      border-bottom: 1px solid rgba(255,255,255,0.08);
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
      transition: transform 160ms ease, background 160ms ease;
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
      background: rgba(16,185,129,0.15);
      border-color: rgba(16,185,129,0.34);
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
      border: 1px solid rgba(255,255,255,0.08);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
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
      border-top: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.08);
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

    .tt-do-clientList {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 2px;
    }

    .tt-do-clientChip {
      height: 34px;
      padding: 0 12px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.80);
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.2px;
      transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
      max-width: 100%;
    }

    .tt-do-clientChip:hover {
      transform: translateY(-1px);
      background: rgba(255,255,255,0.08);
    }

    .tt-do-clientChipActive {
      border-color: rgba(168,85,247,0.52);
      background: linear-gradient(135deg, rgba(168,85,247,0.22), rgba(124,58,237,0.12));
      box-shadow: 0 12px 28px rgba(124,58,237,0.16);
      color: rgba(255,255,255,0.96);
    }

    .tt-do-miniCount {
      font-size: 11px;
      color: rgba(255,255,255,0.60);
      font-weight: 800;
    }

    .tt-do-error {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background: rgba(239,68,68,0.12);
      color: rgba(255,255,255,0.90);
      font-size: 12px;
      font-weight: 700;
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

    @media (max-width: 860px) {
      .tt-do-rightHero,
      .tt-do-insights {
        grid-template-columns: 1fr;
      }

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

          <button
            type="button"
            className="tt-do-btn tt-do-btnSecondary"
            onClick={onExportHistory}
            disabled={!selectedGroup}
          >
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
                    setPage(1);
                  }}
                  placeholder="Search client name, CRM record ID, Books invoice ID, or Paystack code"
                  aria-label="Search debit order client"
                />
              </div>

              {filteredGroups.length ? (
                <div className="tt-do-clientList">
                  {filteredGroups.slice(0, 8).map((group) => {
                    const active = selectedGroup?.key === group.key;
                    return (
                      <button
                        key={group.key}
                        type="button"
                        className={`tt-do-clientChip ${active ? "tt-do-clientChipActive" : ""}`}
                        onClick={() => {
                          setSelectedClientKey(group.key);
                          setPage(1);
                        }}
                        title={group.clientName || group.clientId || group.key}
                      >
                        <span>{group.clientName || group.clientId || group.key}</span>
                        <span className="tt-do-miniCount">{group.totalRecords}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

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
                  {historyRows.length} total row(s) for {selectedGroup?.clientName || selectedGroup?.clientId || "client"}
                </div>

                <div className="tt-do-actions">
                  <HealthBadge tone={health.tone} label={health.label} />
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
                              This client does not have debit-order rows in the current result set.
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
                  Page {page} of {historyPageCount}
                </span>

                <button
                  type="button"
                  className="tt-do-btn"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                >
                  Back
                </button>

                <button
                  type="button"
                  className="tt-do-btn"
                  onClick={() => setPage((prev) => Math.min(historyPageCount, prev + 1))}
                  disabled={page >= historyPageCount}
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
