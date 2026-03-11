import React, { useCallback, useEffect, useMemo, useState } from "react";

function moneyZar(value) {
  const n = Number(value || 0);
  return n.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  });
}

function fmtDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value || "");
  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function fmtDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value || "");
  return d.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ymdToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ymdMonthStart() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function clampPct(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function metricIcon(kind) {
  if (kind === "successful") return "✓";
  if (kind === "failed") return "↺";
  if (kind === "suspended") return "!";
  if (kind === "status") return "◫";
  if (kind === "value") return "R";
  if (kind === "retry") return "↻";
  return "•";
}

function statusTone(status) {
  if (status === "Successful") return "success";
  if (status === "Retry Scheduled") return "warning";
  if (status === "Failed") return "danger";
  if (status === "Suspended") return "danger";
  if (status === "Processing") return "info";
  return "neutral";
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function csvEscape(value) {
  const s = safeText(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

async function fetchBatchesLive({ startDate, endDate, presetClientId, presetBatchId }) {
  const params = new URLSearchParams();

  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (presetClientId) params.set("clientId", presetClientId);
  if (presetBatchId) params.set("batchId", presetBatchId);

  const requestUrl = `/api/dashboard/batches?${params.toString()}`;

  const resp = await fetch(requestUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const rawText = await resp.text().catch(() => "");
  let json = {};
  try {
    json = rawText ? JSON.parse(rawText) : {};
  } catch {
    json = { raw: rawText };
  }

  if (!resp.ok) {
    throw new Error(
      json?.error || json?.message || `Batch request failed ${resp.status}`
    );
  }

  return {
    ok: true,
    requestUrl,
    raw: json,
    batch: json?.data?.batch || null,
    rows: safeArray(json?.data?.rows),
  };
}

function RecordsDropdown({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);

  const options = [
    { value: 10, label: "10 records" },
    { value: 20, label: "20 records" },
    { value: 50, label: "50 records" },
    { value: 100, label: "100 records" },
  ];

  const active = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    function handleDown(event) {
      const node = document.getElementById("tt-batches-records-wrap");
      if (!node) return;
      if (node.contains(event.target)) return;
      setOpen(false);
    }

    window.addEventListener("mousedown", handleDown);
    window.addEventListener("touchstart", handleDown);

    return () => {
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("touchstart", handleDown);
    };
  }, []);

  return (
    <div id="tt-batches-records-wrap" className="tt-ddWrap">
      <span className="tt-ddLabel">Records</span>

      <div className="tt-ddRel">
        <button
          type="button"
          className={open ? "tt-ddBtn tt-ddBtnOpen" : "tt-ddBtn"}
          onClick={() => {
            if (disabled) return;
            setOpen((v) => !v);
          }}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span>{active.label}</span>
          <span className="tt-ddCaret">▾</span>
        </button>

        {open ? (
          <div className="tt-ddMenu" role="listbox" aria-label="Records per page">
            {options.map((option, idx) => {
              const isActive = option.value === value;

              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isActive}
                  className={isActive ? "tt-ddItem tt-ddItemActive" : "tt-ddItem"}
                  style={{
                    borderBottom:
                      idx === options.length - 1
                        ? "none"
                        : "1px solid rgba(255,255,255,0.06)",
                  }}
                  tabIndex={0}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onChange(option.value);
                      setOpen(false);
                    }
                  }}
                >
                  <span>{option.label}</span>
                  {isActive ? (
                    <span className="tt-ddTick">✓</span>
                  ) : (
                    <span style={{ width: 18 }} />
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Batches({ presetClientId = "", presetBatchId = "" }) {
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState("All");

  const [startDate, setStartDate] = useState(ymdMonthStart());
  const [endDate, setEndDate] = useState(ymdToday());

  const [recordsPerPage, setRecordsPerPage] = useState(10);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [lastRequestUrl, setLastRequestUrl] = useState("");

  const [liveBatch, setLiveBatch] = useState(null);
  const [liveRows, setLiveRows] = useState([]);

  const batch = useMemo(() => {
    const fallbackId = String(presetBatchId || "").trim() || "No batch loaded";

    return {
      id: safeText(liveBatch?.id || fallbackId),
      runDate: safeText(liveBatch?.runDate || endDate),
      chargeDate: safeText(liveBatch?.chargeDate || ""),
      createdAt: safeText(liveBatch?.createdAt || ""),
      startedAt: safeText(liveBatch?.startedAt || ""),
      endedAt: safeText(liveBatch?.endedAt || ""),
      createdBy: safeText(liveBatch?.createdBy || "System"),
      batchType: safeText(liveBatch?.batchType || "Live Range View"),
      runStatus: safeText(liveBatch?.runStatus || (error ? "Load Error" : "Awaiting live data")),
      channel: safeText(liveBatch?.channel || "Live API"),
      linkedClientId: safeText(presetClientId || liveBatch?.linkedClientId || ""),
      notes: safeText(
        liveBatch?.notes ||
          "This view is now expecting live data from the backend batch endpoint."
      ),
    };
  }, [liveBatch, presetBatchId, presetClientId, endDate, error]);

  const loadLiveData = useCallback(
    async ({ silent = false } = {}) => {
      const from = String(startDate || "").trim();
      const to = String(endDate || "").trim();

      if (!from || !to) {
        setError("Start date and end date are required.");
        return;
      }

      if (from > to) {
        setError("Start date cannot be later than end date.");
        return;
      }

      try {
        if (!silent) setLoading(true);
        setSyncing(true);
        setError("");

        const result = await fetchBatchesLive({
          startDate: from,
          endDate: to,
          presetClientId,
          presetBatchId,
        });

        setLastRequestUrl(result.requestUrl || "");
        setLiveBatch(result.batch || null);
        setLiveRows(safeArray(result.rows));
      } catch (e) {
        setError(String(e?.message || e));
        setLiveBatch(null);
        setLiveRows([]);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [startDate, endDate, presetClientId, presetBatchId]
  );

  useEffect(() => {
    loadLiveData({ silent: false });
  }, [loadLiveData]);

  const filteredRows = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();

    const result = liveRows.filter((row) => {
      const status = safeText(row?.status);
      const statusMatch = resultFilter === "All" ? true : status === resultFilter;

      const searchMatch =
        !q ||
        safeText(row?.client).toLowerCase().includes(q) ||
        safeText(row?.clientId).toLowerCase().includes(q) ||
        safeText(row?.debitOrderId).toLowerCase().includes(q) ||
        safeText(row?.reference).toLowerCase().includes(q) ||
        safeText(row?.invoiceId).toLowerCase().includes(q);

      return statusMatch && searchMatch;
    });

    return result.slice(0, recordsPerPage);
  }, [liveRows, query, resultFilter, recordsPerPage]);

  const totals = useMemo(() => {
    const totalExpected = liveRows.reduce((sum, row) => sum + Number(row?.amount || 0), 0);
    const successfulRows = liveRows.filter((row) => row?.status === "Successful");
    const failedRows = liveRows.filter((row) => row?.status === "Failed");
    const retryRows = liveRows.filter((row) => row?.status === "Retry Scheduled");
    const suspendedRows = liveRows.filter((row) => row?.status === "Suspended");

    const collected = successfulRows.reduce((sum, row) => sum + Number(row?.amount || 0), 0);
    const failedValue = failedRows.reduce((sum, row) => sum + Number(row?.amount || 0), 0);
    const retryValue = retryRows.reduce((sum, row) => sum + Number(row?.amount || 0), 0);
    const suspendedValue = suspendedRows.reduce((sum, row) => sum + Number(row?.amount || 0), 0);

    return {
      totalExpected,
      collected,
      failedValue,
      retryValue,
      suspendedValue,
      successfulCount: successfulRows.length,
      failedCount: failedRows.length,
      retryCount: retryRows.length,
      suspendedCount: suspendedRows.length,
      totalCount: liveRows.length,
      collectionRate:
        totalExpected > 0 ? Math.round((collected / totalExpected) * 100) : 0,
    };
  }, [liveRows]);

  const filterCounts = useMemo(() => {
    return {
      All: liveRows.length,
      Successful: liveRows.filter((row) => row?.status === "Successful").length,
      "Retry Scheduled": liveRows.filter((row) => row?.status === "Retry Scheduled").length,
      Failed: liveRows.filter((row) => row?.status === "Failed").length,
      Suspended: liveRows.filter((row) => row?.status === "Suspended").length,
    };
  }, [liveRows]);

  const distribution = useMemo(() => {
    const total = Math.max(
      1,
      totals.successfulCount +
        totals.retryCount +
        totals.failedCount +
        totals.suspendedCount
    );

    return {
      successful: Math.round((totals.successfulCount / total) * 100),
      retry: Math.round((totals.retryCount / total) * 100),
      failed: Math.round((totals.failedCount / total) * 100),
      suspended: Math.round((totals.suspendedCount / total) * 100),
    };
  }, [totals]);

  function onExportBatch() {
    if (!liveRows.length) return;

    const header = [
      "Client",
      "Client ID",
      "Debit Order ID",
      "Amount",
      "Status",
      "Retry Date",
      "Reference",
      "Invoice ID",
      "Notification",
      "Failure Reason",
      "Updated At",
    ];

    const body = liveRows.map((row) => [
      safeText(row?.client),
      safeText(row?.clientId),
      safeText(row?.debitOrderId),
      safeText(row?.amount),
      safeText(row?.status),
      safeText(row?.retryDate),
      safeText(row?.reference),
      safeText(row?.invoiceId),
      safeText(row?.notification),
      safeText(row?.failureReason),
      safeText(row?.updatedAt),
    ]);

    const fileName = `tabbytech-batches-${startDate}-to-${endDate}.csv`;
    downloadCsv(fileName, [header, ...body]);
  }

  const screenCss = `
  .tt-batches {
    width: 100%;
    height: 100%;
    color: rgba(255,255,255,0.92);
    --tt-purple: rgba(124,58,237,0.95);
    --tt-purple2: rgba(168,85,247,0.95);
    --tt-panel: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
    --tt-card: rgba(0,0,0,0.14);
    --tt-border: rgba(255,255,255,0.10);
    --tt-border-soft: rgba(255,255,255,0.08);
    --tt-muted: rgba(255,255,255,0.58);
    --tt-soft: rgba(255,255,255,0.72);
    --tt-white: rgba(255,255,255,0.92);
  }

  .tt-batchesWrap {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .tt-batchesHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .tt-batchesTitleWrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tt-batchesTitle {
    margin: 0;
    font-size: 26px;
    letter-spacing: 0.2px;
    color: var(--tt-white);
  }

  .tt-batchesSub {
    margin: 0;
    font-size: 13px;
    color: var(--tt-muted);
    line-height: 1.45;
    max-width: 1040px;
  }

  .tt-glass {
    border-radius: 18px;
    border: 1px solid var(--tt-border);
    background: var(--tt-panel);
    box-shadow: 0 18px 50px rgba(0,0,0,0.35);
    backdrop-filter: blur(14px);
    overflow: hidden;
    min-height: 0;
  }

  .tt-sectionHead {
    padding: 14px;
    border-bottom: 1px solid var(--tt-border-soft);
    background: rgba(0,0,0,0.10);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .tt-sectionHeadLeft {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .tt-sectionTitle {
    margin: 0;
    font-size: 14px;
    font-weight: 800;
    color: rgba(255,255,255,0.86);
  }

  .tt-sectionMeta {
    margin: 0;
    font-size: 12px;
    color: var(--tt-muted);
  }

  .tt-sectionBody {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
  }

  .tt-toolbarTop {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .tt-filterGroup {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .tt-dateGroup {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 180px;
  }

  .tt-dateLabel {
    font-size: 12px;
    font-weight: 800;
    color: rgba(255,255,255,0.62);
    letter-spacing: 0.2px;
  }

  .tt-dateInput {
    height: 40px;
    border-radius: 12px;
    border: 1px solid rgba(124,58,237,0.55);
    background: rgba(0,0,0,0.30);
    color: rgba(255,255,255,0.92);
    padding: 0 12px;
    font-size: 13px;
    outline: none;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
  }

  .tt-dateInput:focus {
    border-color: rgba(168,85,247,0.72);
    box-shadow: 0 0 0 6px rgba(124,58,237,0.18);
  }

  .tt-controlsRight {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .tt-btn {
    height: 40px;
    padding: 0 14px;
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

  .tt-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(0,0,0,0.28);
    background: rgba(255,255,255,0.10);
    border-color: rgba(255,255,255,0.14);
  }

  .tt-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .tt-btnPrimary {
    background: linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95));
    border-color: rgba(124,58,237,0.55);
    box-shadow: 0 14px 34px rgba(124,58,237,0.28);
    color: #fff;
  }

  .tt-btnPrimary:hover {
    filter: brightness(1.06);
  }

  .tt-ddWrap {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }

  .tt-ddLabel {
    font-size: 12px;
    color: rgba(255,255,255,0.62);
    font-weight: 800;
  }

  .tt-ddRel {
    position: relative;
    display: inline-block;
  }

  .tt-ddBtn {
    height: 40px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid rgba(124,58,237,0.55);
    background: rgba(0,0,0,0.30);
    color: rgba(255,255,255,0.92);
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.2px;
    min-width: 150px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
  }

  .tt-ddBtnOpen {
    background: rgba(168,85,247,0.16);
    box-shadow: 0 14px 34px rgba(124,58,237,0.20);
  }

  .tt-ddCaret {
    opacity: 0.95;
  }

  .tt-ddMenu {
    position: absolute;
    top: 46px;
    left: 0;
    min-width: 190px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(10,10,14,0.95);
    box-shadow: 0 18px 50px rgba(0,0,0,0.45);
    backdrop-filter: blur(14px);
    overflow: hidden;
    z-index: 50;
  }

  .tt-ddItem {
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

  .tt-ddItemActive {
    background: rgba(168,85,247,0.22);
  }

  .tt-ddTick {
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

  .tt-syncWrap {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.03);
  }

  .tt-syncMeta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .tt-syncMetaTop {
    font-size: 12px;
    font-weight: 900;
    color: rgba(255,255,255,0.84);
  }

  .tt-syncMetaSub {
    font-size: 11px;
    color: rgba(255,255,255,0.56);
  }

  .tt-infoBanner {
    border-radius: 16px;
    border: 1px solid rgba(168,85,247,0.30);
    background: rgba(168,85,247,0.10);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tt-infoBannerTitle {
    font-size: 13px;
    font-weight: 900;
    color: rgba(255,255,255,0.90);
  }

  .tt-infoBannerText {
    font-size: 12px;
    line-height: 1.5;
    color: rgba(255,255,255,0.72);
  }

  .tt-topMetrics {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
  }

  .tt-metric {
    position: relative;
    min-height: 122px;
    border-radius: 18px;
    border: 1px solid var(--tt-border);
    background: linear-gradient(180deg, rgba(9,13,36,0.90) 0%, rgba(13,17,44,0.78) 100%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow: hidden;
  }

  .tt-metricGlow-success::after,
  .tt-metricGlow-warning::after,
  .tt-metricGlow-danger::after,
  .tt-metricGlow-info::after,
  .tt-metricGlow-purple::after {
    content: "";
    position: absolute;
    inset: auto -30px -36px auto;
    width: 110px;
    height: 110px;
    border-radius: 999px;
    filter: blur(32px);
    opacity: 0.22;
    pointer-events: none;
  }

  .tt-metricGlow-success::after { background: rgba(34,197,94,0.85); }
  .tt-metricGlow-warning::after { background: rgba(245,158,11,0.85); }
  .tt-metricGlow-danger::after { background: rgba(239,68,68,0.85); }
  .tt-metricGlow-info::after { background: rgba(59,130,246,0.85); }
  .tt-metricGlow-purple::after { background: rgba(168,85,247,0.85); }

  .tt-metricTop {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .tt-metricLabel {
    margin: 0;
    font-size: 12px;
    color: var(--tt-muted);
  }

  .tt-metricIcon {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 900;
    color: #fff;
    border: 1px solid rgba(255,255,255,0.10);
  }

  .tt-metricIcon-purple { background: rgba(124,58,237,0.24); }
  .tt-metricIcon-success { background: rgba(34,197,94,0.18); }
  .tt-metricIcon-warning { background: rgba(245,158,11,0.18); }
  .tt-metricIcon-danger { background: rgba(239,68,68,0.18); }
  .tt-metricIcon-info { background: rgba(59,130,246,0.18); }

  .tt-metricValue {
    margin: 0;
    font-size: 30px;
    font-weight: 900;
    letter-spacing: 0.2px;
    color: #fff;
  }

  .tt-metricSub {
    margin: 0;
    font-size: 12px;
    color: var(--tt-muted);
  }

  .tt-mainGrid {
    display: grid;
    grid-template-columns: 1.65fr 0.95fr;
    gap: 16px;
    min-height: 0;
    flex: 1;
  }

  .tt-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
  }

  .tt-card {
    border-radius: 18px;
    border: 1px solid var(--tt-border);
    background: rgba(0,0,0,0.14);
    overflow: hidden;
    min-height: 0;
  }

  .tt-cardBody {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .tt-progressBlock {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .tt-progressLabelRow {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 12px;
    color: var(--tt-soft);
  }

  .tt-progressTrack {
    width: 100%;
    height: 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.06);
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.05);
  }

  .tt-progressFill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(34,197,94,0.95), rgba(20,184,166,0.95));
    box-shadow: 0 10px 30px rgba(34,197,94,0.26);
  }

  .tt-legend {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .tt-legendItem {
    border-radius: 14px;
    border: 1px solid var(--tt-border);
    background: rgba(255,255,255,0.03);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tt-legendHead {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--tt-muted);
  }

  .tt-legendDot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
  }

  .tt-legendValue {
    font-size: 20px;
    font-weight: 900;
    color: #fff;
  }

  .tt-donutWrap {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 0 4px;
  }

  .tt-donut {
    width: 210px;
    height: 210px;
    border-radius: 999px;
    position: relative;
    background:
      conic-gradient(
        rgba(34,197,94,0.95) 0% ${clampPct(distribution.successful)}%,
        rgba(245,158,11,0.95) ${clampPct(distribution.successful)}% ${clampPct(distribution.successful + distribution.retry)}%,
        rgba(239,68,68,0.95) ${clampPct(distribution.successful + distribution.retry)}% ${clampPct(distribution.successful + distribution.retry + distribution.failed)}%,
        rgba(168,85,247,0.95) ${clampPct(distribution.successful + distribution.retry + distribution.failed)}% 100%
      );
    box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  }

  .tt-donutCenter {
    position: absolute;
    inset: 28px;
    border-radius: 999px;
    background: linear-gradient(180deg, rgba(6,10,28,0.96), rgba(12,16,36,0.94));
    border: 1px solid rgba(255,255,255,0.08);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    text-align: center;
  }

  .tt-donutCenterValue {
    font-size: 40px;
    font-weight: 900;
    color: #fff;
    line-height: 1;
  }

  .tt-donutCenterLabel {
    font-size: 12px;
    color: var(--tt-muted);
  }

  .tt-miniStats {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .tt-miniStat {
    border-radius: 16px;
    border: 1px solid var(--tt-border);
    background: rgba(255,255,255,0.03);
    padding: 14px;
  }

  .tt-miniStatValue {
    font-size: 24px;
    font-weight: 900;
    color: #fff;
  }

  .tt-miniStatLabel {
    font-size: 12px;
    color: var(--tt-muted);
  }

  .tt-kv {
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 10px;
  }

  .tt-k {
    font-size: 12px;
    color: var(--tt-muted);
  }

  .tt-v {
    font-size: 13px;
    color: rgba(255,255,255,0.84);
  }

  .tt-actionsSummary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .tt-actionCard {
    border-radius: 14px;
    border: 1px solid var(--tt-border);
    background: rgba(255,255,255,0.03);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tt-actionCardTitle {
    font-size: 12px;
    color: var(--tt-muted);
  }

  .tt-actionCardValue {
    font-size: 18px;
    font-weight: 900;
    color: #fff;
  }

  .tt-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .tt-searchWrap {
    position: relative;
    flex: 1 1 320px;
    max-width: 520px;
  }

  .tt-searchInput {
    width: 100%;
    height: 40px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.18);
    color: rgba(255,255,255,0.88);
    outline: none;
    padding: 0 14px 0 38px;
    font-size: 13px;
  }

  .tt-searchInput:focus {
    border-color: rgba(124,58,237,0.45);
    box-shadow: 0 0 0 6px rgba(124,58,237,0.18);
  }

  .tt-searchIcon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255,255,255,0.62);
    font-size: 14px;
  }

  .tt-chipRow {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  .tt-chip {
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
    transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease;
  }

  .tt-chip:hover {
    transform: translateY(-1px);
    background: rgba(255,255,255,0.07);
    border-color: rgba(255,255,255,0.14);
    box-shadow: 0 10px 24px rgba(0,0,0,0.28);
  }

  .tt-chipActive {
    border-color: rgba(124,58,237,0.55);
    background: rgba(124,58,237,0.16);
    color: rgba(255,255,255,0.92);
  }

  .tt-tableWrap {
    overflow: auto;
  }

  .tt-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
  }

  .tt-th {
    position: sticky;
    top: 0;
    z-index: 2;
    text-align: left;
    padding: 12px 14px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.2px;
    color: rgba(255,255,255,0.62);
    background: rgba(10,10,14,0.75);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(10px);
    white-space: nowrap;
  }

  .tt-td {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.78);
    white-space: nowrap;
    vertical-align: top;
  }

  .tt-rowMain {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .tt-rowTitle {
    font-weight: 900;
    color: rgba(255,255,255,0.90);
  }

  .tt-rowSub {
    font-size: 12px;
    color: rgba(255,255,255,0.56);
  }

  .tt-pill {
    height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid rgba(255,255,255,0.12);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.2px;
  }

  .tt-pill-success {
    color: rgba(255,255,255,0.92);
    background: rgba(34,197,94,0.14);
    border-color: rgba(34,197,94,0.30);
  }

  .tt-pill-warning {
    color: rgba(255,255,255,0.92);
    background: rgba(245,158,11,0.14);
    border-color: rgba(245,158,11,0.30);
  }

  .tt-pill-danger {
    color: rgba(255,255,255,0.92);
    background: rgba(239,68,68,0.14);
    border-color: rgba(239,68,68,0.30);
  }

  .tt-pill-info {
    color: rgba(255,255,255,0.92);
    background: rgba(59,130,246,0.14);
    border-color: rgba(59,130,246,0.30);
  }

  .tt-pill-neutral {
    color: rgba(255,255,255,0.90);
    background: rgba(168,85,247,0.14);
    border-color: rgba(168,85,247,0.30);
  }

  .tt-empty {
    padding: 20px;
    border-radius: 14px;
    border: 1px solid var(--tt-border);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.72);
    font-size: 13px;
    line-height: 1.5;
  }

  .tt-error {
    padding: 14px;
    border-radius: 14px;
    border: 1px solid rgba(239,68,68,0.28);
    background: rgba(239,68,68,0.10);
    color: rgba(255,255,255,0.88);
    font-size: 13px;
    line-height: 1.5;
  }

  @media (max-width: 1400px) {
    .tt-topMetrics {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 1100px) {
    .tt-mainGrid {
      grid-template-columns: 1fr;
    }

    .tt-legend {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .tt-actionsSummary {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 800px) {
    .tt-topMetrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .tt-legend {
      grid-template-columns: 1fr;
    }

    .tt-kv {
      grid-template-columns: 1fr;
    }

    .tt-toolbarTop {
      flex-direction: column;
      align-items: stretch;
    }

    .tt-filterGroup,
    .tt-controlsRight {
      width: 100%;
    }
  }
  `;

  return (
    <div className="tt-batches">
      <style>{screenCss}</style>

      <div className="tt-batchesWrap">
        <div className="tt-batchesHeader">
          <div className="tt-batchesTitleWrap">
            <h1 className="tt-batchesTitle">Batches</h1>
            <p className="tt-batchesSub">
              Batch operations view for debit collections, retries, failures, suspension handling, and run-level decision making.
            </p>
          </div>
        </div>

        <div
          className="tt-glass"
          style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          <div className="tt-sectionHead">
            <div className="tt-sectionHeadLeft">
              <p className="tt-sectionTitle">Batch overview</p>
              <p className="tt-sectionMeta">
                {batch.id} · {batch.batchType} ·
                {batch.chargeDate ? ` Charge date ${batch.chargeDate} ·` : ""}
                {" "}
                {batch.runStatus}
              </p>
            </div>
          </div>

          <div className="tt-sectionBody">
            <div className="tt-toolbarTop">
              <div className="tt-filterGroup">
                <div className="tt-dateGroup">
                  <label className="tt-dateLabel" htmlFor="tt-batches-start-date">
                    Start date
                  </label>
                  <input
                    id="tt-batches-start-date"
                    className="tt-dateInput"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="tt-dateGroup">
                  <label className="tt-dateLabel" htmlFor="tt-batches-end-date">
                    End date
                  </label>
                  <input
                    id="tt-batches-end-date"
                    className="tt-dateInput"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="tt-btn tt-btnPrimary"
                  onClick={() => loadLiveData({ silent: false })}
                >
                  Apply range
                </button>

                <button
                  type="button"
                  className="tt-btn tt-btnPrimary"
                  onClick={onExportBatch}
                  disabled={!liveRows.length}
                >
                  Export batch
                </button>
              </div>

              <div className="tt-controlsRight">
                <RecordsDropdown
                  value={recordsPerPage}
                  onChange={(n) => setRecordsPerPage(Number(n) || 10)}
                  disabled={loading || syncing}
                />

                <div className="tt-syncWrap">
                  <div className="tt-syncMeta">
                    <div className="tt-syncMetaTop">{syncing ? "Syncing live data" : "Live batch sync"}</div>
                    <div className="tt-syncMetaSub">
                      {lastRequestUrl ? "Connected to live endpoint" : "Waiting for first successful response"}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="tt-btn tt-btnPrimary"
                    onClick={() => loadLiveData({ silent: false })}
                    disabled={syncing}
                  >
                    {syncing ? "Syncing..." : "Sync now"}
                  </button>
                </div>
              </div>
            </div>

            {(presetClientId || presetBatchId) ? (
              <div className="tt-infoBanner">
                <div className="tt-infoBannerTitle">Opened from client context</div>
                <div className="tt-infoBannerText">
                  {presetClientId ? `Client ID: ${presetClientId}` : "Client ID not supplied"}
                  {presetBatchId ? ` • Batch ID: ${presetBatchId}` : " • No stored batch id found yet"}
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="tt-error">
                <strong>Live batch data could not be loaded.</strong>
                <div style={{ marginTop: 6 }}>{error}</div>
                {lastRequestUrl ? (
                  <div style={{ marginTop: 6, color: "rgba(255,255,255,0.68)" }}>
                    Request: {lastRequestUrl}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="tt-topMetrics">
              <div className="tt-metric tt-metricGlow-purple">
                <div className="tt-metricTop">
                  <p className="tt-metricLabel">Total Batch Value</p>
                  <span className="tt-metricIcon tt-metricIcon-purple">{metricIcon("value")}</span>
                </div>
                <p className="tt-metricValue">{moneyZar(totals.totalExpected)}</p>
                <p className="tt-metricSub">{totals.totalCount} debit order item(s)</p>
              </div>

              <div className="tt-metric tt-metricGlow-success">
                <div className="tt-metricTop">
                  <p className="tt-metricLabel">Collected</p>
                  <span className="tt-metricIcon tt-metricIcon-success">{metricIcon("successful")}</span>
                </div>
                <p className="tt-metricValue">{moneyZar(totals.collected)}</p>
                <p className="tt-metricSub">{totals.successfulCount} successful</p>
              </div>

              <div className="tt-metric tt-metricGlow-warning">
                <div className="tt-metricTop">
                  <p className="tt-metricLabel">Retry Scheduled</p>
                  <span className="tt-metricIcon tt-metricIcon-warning">{metricIcon("retry")}</span>
                </div>
                <p className="tt-metricValue">{moneyZar(totals.retryValue)}</p>
                <p className="tt-metricSub">{totals.retryCount} moving to 1st</p>
              </div>

              <div className="tt-metric tt-metricGlow-danger">
                <div className="tt-metricTop">
                  <p className="tt-metricLabel">Failed Value</p>
                  <span className="tt-metricIcon tt-metricIcon-danger">{metricIcon("failed")}</span>
                </div>
                <p className="tt-metricValue">{moneyZar(totals.failedValue)}</p>
                <p className="tt-metricSub">{totals.failedCount} failed</p>
              </div>

              <div className="tt-metric tt-metricGlow-danger">
                <div className="tt-metricTop">
                  <p className="tt-metricLabel">Suspended</p>
                  <span className="tt-metricIcon tt-metricIcon-danger">{metricIcon("suspended")}</span>
                </div>
                <p className="tt-metricValue">{moneyZar(totals.suspendedValue)}</p>
                <p className="tt-metricSub">{totals.suspendedCount} suspended</p>
              </div>

              <div className="tt-metric tt-metricGlow-info">
                <div className="tt-metricTop">
                  <p className="tt-metricLabel">Collection Rate</p>
                  <span className="tt-metricIcon tt-metricIcon-info">{metricIcon("status")}</span>
                </div>
                <p className="tt-metricValue">{totals.collectionRate}%</p>
                <p className="tt-metricSub">{batch.runStatus}</p>
              </div>
            </div>

            <div className="tt-mainGrid">
              <div className="tt-stack">
                <div className="tt-card">
                  <div className="tt-sectionHead">
                    <div className="tt-sectionHeadLeft">
                      <p className="tt-sectionTitle">Batch performance</p>
                      <p className="tt-sectionMeta">
                        Track how much of the run converted into successful collections
                      </p>
                    </div>
                  </div>

                  <div className="tt-cardBody">
                    <div className="tt-progressBlock">
                      <div className="tt-progressLabelRow">
                        <span>Collected against expected value</span>
                        <strong style={{ color: "rgba(255,255,255,0.92)" }}>
                          {totals.collectionRate}%
                        </strong>
                      </div>
                      <div className="tt-progressTrack">
                        <div
                          className="tt-progressFill"
                          style={{ width: `${clampPct(totals.collectionRate)}%` }}
                        />
                      </div>
                    </div>

                    <div className="tt-legend">
                      <div className="tt-legendItem">
                        <div className="tt-legendHead">
                          <span className="tt-legendDot" style={{ background: "rgba(34,197,94,0.95)" }} />
                          Successful
                        </div>
                        <div className="tt-legendValue">{totals.successfulCount}</div>
                      </div>

                      <div className="tt-legendItem">
                        <div className="tt-legendHead">
                          <span className="tt-legendDot" style={{ background: "rgba(245,158,11,0.95)" }} />
                          Retry Scheduled
                        </div>
                        <div className="tt-legendValue">{totals.retryCount}</div>
                      </div>

                      <div className="tt-legendItem">
                        <div className="tt-legendHead">
                          <span className="tt-legendDot" style={{ background: "rgba(239,68,68,0.95)" }} />
                          Failed
                        </div>
                        <div className="tt-legendValue">{totals.failedCount}</div>
                      </div>

                      <div className="tt-legendItem">
                        <div className="tt-legendHead">
                          <span className="tt-legendDot" style={{ background: "rgba(168,85,247,0.95)" }} />
                          Suspended
                        </div>
                        <div className="tt-legendValue">{totals.suspendedCount}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tt-card">
                  <div className="tt-sectionHead">
                    <div className="tt-sectionHeadLeft">
                      <p className="tt-sectionTitle">Batch result table</p>
                      <p className="tt-sectionMeta">
                        Search and filter each debit order outcome inside this batch
                      </p>
                    </div>
                  </div>

                  <div className="tt-cardBody">
                    <div className="tt-toolbar">
                      <div className="tt-searchWrap">
                        <span className="tt-searchIcon">⌕</span>
                        <input
                          className="tt-searchInput"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search by client, client id, debit order, reference, invoice"
                          aria-label="Search batch rows"
                        />
                      </div>

                      <div className="tt-chipRow">
                        {["All", "Successful", "Retry Scheduled", "Failed", "Suspended"].map((filter) => {
                          const active = resultFilter === filter;
                          return (
                            <div
                              key={filter}
                              className={active ? "tt-chip tt-chipActive" : "tt-chip"}
                              role="button"
                              tabIndex={0}
                              onClick={() => setResultFilter(filter)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") setResultFilter(filter);
                              }}
                            >
                              <span>{filter}</span>
                              <span style={{ opacity: 0.85 }}>{filterCounts[filter] ?? 0}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="tt-tableWrap">
                      <table className="tt-table">
                        <thead>
                          <tr>
                            <th className="tt-th">Client</th>
                            <th className="tt-th">Amount</th>
                            <th className="tt-th">Outcome</th>
                            <th className="tt-th">Retry</th>
                            <th className="tt-th">Reference</th>
                            <th className="tt-th">Invoice</th>
                            <th className="tt-th">Notification</th>
                            <th className="tt-th">Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.map((row) => (
                            <tr key={`${safeText(row?.debitOrderId)}-${safeText(row?.clientId)}`}>
                              <td className="tt-td">
                                <div className="tt-rowMain">
                                  <span className="tt-rowTitle">{safeText(row?.client)}</span>
                                  <span className="tt-rowSub">
                                    {safeText(row?.clientId)} · {safeText(row?.debitOrderId)}
                                  </span>
                                </div>
                              </td>

                              <td className="tt-td">{moneyZar(row?.amount)}</td>

                              <td className="tt-td">
                                <span className={`tt-pill tt-pill-${statusTone(row?.status)}`}>
                                  {safeText(row?.status)}
                                </span>
                                {safeText(row?.failureReason) ? (
                                  <div className="tt-rowSub" style={{ marginTop: 6 }}>
                                    {safeText(row?.failureReason)}
                                  </div>
                                ) : null}
                              </td>

                              <td className="tt-td">{safeText(row?.retryDate) || "-"}</td>
                              <td className="tt-td">{safeText(row?.reference) || "-"}</td>
                              <td className="tt-td">{safeText(row?.invoiceId) || "-"}</td>
                              <td className="tt-td">{safeText(row?.notification) || "-"}</td>
                              <td className="tt-td">{fmtDateTime(row?.updatedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {!loading && !filteredRows.length ? (
                        <div className="tt-empty">
                          No live batch rows match your search, filter, or selected date range.
                        </div>
                      ) : null}

                      {loading ? (
                        <div className="tt-empty">
                          Loading live batch data for the selected date range.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="tt-stack">
                <div className="tt-card">
                  <div className="tt-sectionHead">
                    <div className="tt-sectionHeadLeft">
                      <p className="tt-sectionTitle">Result distribution</p>
                      <p className="tt-sectionMeta">
                        Split of successful, retry, failed, and suspended outcomes
                      </p>
                    </div>
                  </div>

                  <div className="tt-cardBody">
                    <div className="tt-donutWrap">
                      <div className="tt-donut">
                        <div className="tt-donutCenter">
                          <div className="tt-donutCenterValue">{totals.totalCount}</div>
                          <div className="tt-donutCenterLabel">Total items</div>
                        </div>
                      </div>
                    </div>

                    <div className="tt-miniStats">
                      <div className="tt-miniStat">
                        <div className="tt-miniStatValue">{distribution.successful}%</div>
                        <div className="tt-miniStatLabel">Successful share</div>
                      </div>
                      <div className="tt-miniStat">
                        <div className="tt-miniStatValue">{distribution.retry}%</div>
                        <div className="tt-miniStatLabel">Retry share</div>
                      </div>
                      <div className="tt-miniStat">
                        <div className="tt-miniStatValue">{distribution.failed}%</div>
                        <div className="tt-miniStatLabel">Failed share</div>
                      </div>
                      <div className="tt-miniStat">
                        <div className="tt-miniStatValue">{distribution.suspended}%</div>
                        <div className="tt-miniStatLabel">Suspended share</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tt-card">
                  <div className="tt-sectionHead">
                    <div className="tt-sectionHeadLeft">
                      <p className="tt-sectionTitle">Run monitor</p>
                      <p className="tt-sectionMeta">
                        Use this section to audit the batch and make service decisions
                      </p>
                    </div>
                  </div>

                  <div className="tt-cardBody">
                    <div className="tt-kv">
                      <div className="tt-k">Batch ID</div>
                      <div className="tt-v">{batch.id}</div>

                      <div className="tt-k">Run type</div>
                      <div className="tt-v">{batch.batchType}</div>

                      <div className="tt-k">Run status</div>
                      <div className="tt-v">{batch.runStatus}</div>

                      <div className="tt-k">Charge date</div>
                      <div className="tt-v">{batch.chargeDate || "Not supplied"}</div>

                      <div className="tt-k">Created by</div>
                      <div className="tt-v">{batch.createdBy}</div>

                      <div className="tt-k">Channel</div>
                      <div className="tt-v">{batch.channel}</div>

                      <div className="tt-k">Created at</div>
                      <div className="tt-v">{batch.createdAt ? fmtDateTime(batch.createdAt) : "Not supplied"}</div>

                      <div className="tt-k">Started at</div>
                      <div className="tt-v">{batch.startedAt ? fmtDateTime(batch.startedAt) : "Not supplied"}</div>

                      <div className="tt-k">Ended at</div>
                      <div className="tt-v">{batch.endedAt ? fmtDateTime(batch.endedAt) : "Not supplied"}</div>

                      <div className="tt-k">Linked client</div>
                      <div className="tt-v">{batch.linkedClientId || "None"}</div>
                    </div>
                  </div>
                </div>

                <div className="tt-card">
                  <div className="tt-sectionHead">
                    <div className="tt-sectionHeadLeft">
                      <p className="tt-sectionTitle">Ops action summary</p>
                      <p className="tt-sectionMeta">
                        These are the things you need to watch after a batch completes
                      </p>
                    </div>
                  </div>

                  <div className="tt-cardBody">
                    <div className="tt-actionsSummary">
                      <div className="tt-actionCard">
                        <div className="tt-actionCardTitle">Need retry handling</div>
                        <div className="tt-actionCardValue">{totals.retryCount}</div>
                      </div>

                      <div className="tt-actionCard">
                        <div className="tt-actionCardTitle">Need manual follow-up</div>
                        <div className="tt-actionCardValue">{totals.failedCount}</div>
                      </div>

                      <div className="tt-actionCard">
                        <div className="tt-actionCardTitle">Suspension outcomes</div>
                        <div className="tt-actionCardValue">{totals.suspendedCount}</div>
                      </div>

                      <div className="tt-actionCard">
                        <div className="tt-actionCardTitle">Notifications sent</div>
                        <div className="tt-actionCardValue">
                          {
                            liveRows.filter((row) =>
                              safeText(row?.notification).toLowerCase().includes("sent")
                            ).length
                          }
                        </div>
                      </div>
                    </div>

                    <div className="tt-empty">{batch.notes}</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div className="tt-sectionMeta">
                Batch {batch.id} · Range {startDate} to {endDate}
              </div>
              <div className="tt-sectionMeta">
                Collected {moneyZar(totals.collected)} of {moneyZar(totals.totalExpected)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
