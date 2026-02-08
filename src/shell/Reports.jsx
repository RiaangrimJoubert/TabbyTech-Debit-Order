import React, { useMemo, useState } from "react";

const styles = {
  page: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  titleWrap: { display: "flex", flexDirection: "column", gap: 6 },
  title: {
    margin: 0,
    fontSize: 26,
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.92)",
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 1.45,
  },
  actionsRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },

  glass: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
    backdropFilter: "blur(14px)",
    overflow: "hidden",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: 16,
    minHeight: 0,
    flex: 1,
  },

  panelHeader: {
    padding: "14px 14px 12px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.10)",
  },
  panelTitle: { margin: 0, fontSize: 14, color: "rgba(255,255,255,0.86)" },
  panelMeta: { margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)" },

  leftBody: {
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  field: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 12, fontWeight: 800, letterSpacing: 0.2, color: "rgba(255,255,255,0.72)" },
  select: {
    height: 40,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.88)",
    outline: "none",
    padding: "0 12px",
    fontSize: 13,
    appearance: "none",
  },

  hint: { fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 },

  btn: (variant = "secondary", disabled = false) => {
    const base = {
      height: 40,
      padding: "0 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.86)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      userSelect: "none",
      transition: "transform 160ms ease, box-shadow 160ms ease, border 160ms ease",
      fontSize: 13,
      fontWeight: 800,
      letterSpacing: 0.2,
      opacity: disabled ? 0.55 : 1,
      minWidth: 120,
    };

    if (variant === "primary") {
      return {
        ...base,
        background: "linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95))",
        border: "1px solid rgba(168,85,247,0.55)",
        boxShadow: "0 14px 34px rgba(124,58,237,0.28)",
      };
    }

    return base;
  },

  divider: { height: 1, background: "rgba(255,255,255,0.08)" },

  rightBody: { padding: 14, display: "flex", flexDirection: "column", gap: 14, minHeight: 0 },
  kpis: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },

  kpi: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
    padding: 12,
    transition: "transform 160ms ease, box-shadow 160ms ease",
  },
  kpiLabel: { margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)" },
  kpiValue: { margin: "6px 0 0 0", fontSize: 18, fontWeight: 900, color: "rgba(255,255,255,0.88)" },

  split: { display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 12, minHeight: 0 },

  section: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.14)",
    padding: 12,
    minHeight: 0,
    overflow: "hidden",
  },
  sectionTitle: {
    margin: 0,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.78)",
  },

  chartArea: {
    marginTop: 12,
    height: 220,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    overflow: "hidden",
  },
  bar: (h, accent = false) => ({
    width: 28,
    height: `${h}%`,
    borderRadius: 10,
    background: accent ? "rgba(168,85,247,0.85)" : "rgba(255,255,255,0.18)",
    border: accent ? "1px solid rgba(168,85,247,0.55)" : "1px solid rgba(255,255,255,0.12)",
    boxShadow: accent ? "0 14px 30px rgba(124,58,237,0.25)" : "none",
    transition: "transform 160ms ease",
  }),
  chartLegend: {
    marginTop: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
  },

  tableScroll: { marginTop: 12, overflow: "auto", maxHeight: 260, borderRadius: 14 },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 },
  th: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    textAlign: "left",
    padding: "12px 12px",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.62)",
    background: "rgba(10,10,14,0.75)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(10px)",
  },
  td: {
    padding: "12px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.78)",
    whiteSpace: "nowrap",
  },

  badge: (tone) => {
    const map = {
      Success: { bg: "rgba(34,197,94,0.14)", bd: "rgba(34,197,94,0.30)" },
      Warning: { bg: "rgba(245,158,11,0.16)", bd: "rgba(245,158,11,0.32)" },
      Failed: { bg: "rgba(239,68,68,0.16)", bd: "rgba(239,68,68,0.32)" },
      Pending: { bg: "rgba(168,85,247,0.16)", bd: "rgba(168,85,247,0.32)" },
    };
    const t = map[tone] || map.Pending;
    return {
      height: 22,
      padding: "0 10px",
      borderRadius: 999,
      display: "inline-flex",
      alignItems: "center",
      border: `1px solid ${t.bd}`,
      background: t.bg,
      color: "rgba(255,255,255,0.86)",
      fontSize: 11,
      fontWeight: 900,
      letterSpacing: 0.2,
    };
  },

  summary: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.70)",
    fontSize: 13,
    lineHeight: 1.55,
  },
};

function currencyZar(n) {
  const val = Number(n || 0);
  return val.toLocaleString("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "2-digit" });
}

const REPORT_TYPES = [
  { key: "overview", label: "Executive overview" },
  { key: "collections", label: "Collections performance" },
  { key: "failures", label: "Failures and reversals" },
  { key: "clients", label: "Client health" },
];

const PERIODS = [
  { key: "thismonth", label: "This month" },
  { key: "lastmonth", label: "Last month" },
  { key: "last90", label: "Last 90 days" },
  { key: "ytd", label: "Year to date" },
];

function buildMockData(reportKey, periodKey) {
  const base = {
    totalCollected: 1523400,
    successRate: 0.942,
    failedCount: 37,
    activeClients: 84,
    bars: [42, 55, 48, 70, 62, 76, 68, 84, 74, 92, 88, 96],
    table: [
      { id: "BT-20260206-0002", date: "2026-02-06T10:00:00.000Z", items: 64, amount: 412000, status: "Success" },
      { id: "BT-20260201-0001", date: "2026-02-01T10:00:00.000Z", items: 58, amount: 355000, status: "Warning" },
      { id: "BT-20260125-0008", date: "2026-01-25T10:00:00.000Z", items: 61, amount: 398000, status: "Success" },
      { id: "BT-20260118-0006", date: "2026-01-18T10:00:00.000Z", items: 60, amount: 372000, status: "Failed" },
      { id: "BT-20260112-0004", date: "2026-01-12T10:00:00.000Z", items: 52, amount: 301000, status: "Success" },
    ],
    summary:
      "This report is UI-only and uses sample data. When backend resumes, these metrics should reflect provider responses, batch outcomes, and client level performance.",
  };

  if (reportKey === "collections") {
    return {
      ...base,
      totalCollected: 1928400,
      successRate: 0.958,
      failedCount: 22,
      activeClients: 84,
      bars: [50, 62, 58, 74, 66, 80, 72, 88, 78, 95, 92, 98],
      summary:
        "Collections performance focuses on amounts collected, success rates, and month-on-month movement. Sample values shown here are placeholders only.",
    };
  }

  if (reportKey === "failures") {
    return {
      ...base,
      totalCollected: 1422000,
      successRate: 0.905,
      failedCount: 64,
      activeClients: 84,
      bars: [30, 42, 38, 55, 49, 62, 58, 70, 61, 78, 72, 82],
      summary:
        "Failures and reversals highlights failed debits, rejection reasons, and risk areas. This UI shows how the report will be structured once real data is connected.",
    };
  }

  if (reportKey === "clients") {
    return {
      ...base,
      totalCollected: 1581100,
      successRate: 0.934,
      failedCount: 41,
      activeClients: 92,
      bars: [40, 52, 46, 66, 58, 74, 63, 82, 71, 89, 84, 93],
      summary:
        "Client health groups clients by activity, risk, mandate freshness, and collection outcomes. The visuals here are placeholders for the final connected report.",
    };
  }

  if (periodKey === "lastmonth") {
    return {
      ...base,
      totalCollected: Math.round(base.totalCollected * 0.93),
      successRate: 0.928,
      failedCount: base.failedCount + 9,
      bars: base.bars.map((n) => Math.max(18, n - 10)),
    };
  }

  if (periodKey === "last90") {
    return {
      ...base,
      totalCollected: Math.round(base.totalCollected * 2.65),
      successRate: 0.935,
      failedCount: base.failedCount + 41,
      bars: base.bars.map((n, i) => Math.min(98, n + (i % 3 === 0 ? 6 : 2))),
    };
  }

  if (periodKey === "ytd") {
    return {
      ...base,
      totalCollected: Math.round(base.totalCollected * 5.2),
      successRate: 0.939,
      failedCount: base.failedCount + 120,
      bars: base.bars.map((n, i) => Math.min(98, n + (i % 2 === 0 ? 4 : 1))),
    };
  }

  return base;
}

export default function Reports() {
  const [reportKey, setReportKey] = useState("overview");
  const [periodKey, setPeriodKey] = useState("thismonth");

  const data = useMemo(() => buildMockData(reportKey, periodKey), [reportKey, periodKey]);

  const successPct = Math.round((data.successRate || 0) * 100);

  function downloadMock() {
    const payload = {
      report: reportKey,
      period: periodKey,
      generatedAt: new Date().toISOString(),
      kpis: {
        totalCollected: data.totalCollected,
        successRate: data.successRate,
        failedCount: data.failedCount,
        activeClients: data.activeClients,
      },
      batches: data.table,
      note: "UI-only mock export. Replace with real report generator later.",
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `tabbytech-report-${reportKey}-${periodKey}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={styles.titleWrap}>
          <h1 style={styles.title}>Reports</h1>
          <p style={styles.subtitle}>
            Generate operational snapshots and performance summaries. This page uses sample data and supports a UI-only mock export.
          </p>
        </div>

        <div style={styles.actionsRow}>
          <button style={styles.btn("secondary")} type="button" onClick={downloadMock}>
            Download report
          </button>
          <button style={styles.btn("primary")} type="button">
            New report
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.glass}>
          <div style={styles.panelHeader}>
            <div>
              <p style={styles.panelTitle}>Report builder</p>
              <p style={styles.panelMeta}>Select a report type and a period</p>
            </div>
          </div>

          <div style={styles.leftBody}>
            <div style={styles.field}>
              <div style={styles.label}>Report type</div>
              <select
                style={styles.select}
                value={reportKey}
                onChange={(e) => setReportKey(e.target.value)}
                aria-label="Report type"
              >
                {REPORT_TYPES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Period</div>
              <select
                style={styles.select}
                value={periodKey}
                onChange={(e) => setPeriodKey(e.target.value)}
                aria-label="Report period"
              >
                {PERIODS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.divider} />

            <div style={styles.hint}>
              Download report exports a JSON file with the selected KPI values and batch lines. When backend resumes, this will become a PDF or spreadsheet generator.
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
              <button style={styles.btn("primary")} type="button" onClick={downloadMock}>
                Generate and download
              </button>
              <button style={styles.btn("secondary")} type="button">
                Save preset
              </button>
            </div>

            <div style={{ marginTop: 6, ...styles.hint }}>
              Tip: we can later add presets like Monthly finance pack, Client risk review, and Batch outcome summary.
            </div>
          </div>
        </div>

        <div style={{ ...styles.glass, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={styles.panelHeader}>
            <div>
              <p style={styles.panelTitle}>Preview</p>
              <p style={styles.panelMeta}>
                {REPORT_TYPES.find((r) => r.key === reportKey)?.label} · {PERIODS.find((p) => p.key === periodKey)?.label}
              </p>
            </div>
          </div>

          <div style={styles.rightBody}>
            <div style={styles.kpis}>
              <div style={styles.kpi}>
                <p style={styles.kpiLabel}>Total collected</p>
                <p style={styles.kpiValue}>{currencyZar(data.totalCollected)}</p>
              </div>
              <div style={styles.kpi}>
                <p style={styles.kpiLabel}>Success rate</p>
                <p style={styles.kpiValue}>{successPct}%</p>
              </div>
              <div style={styles.kpi}>
                <p style={styles.kpiLabel}>Failed items</p>
                <p style={styles.kpiValue}>{data.failedCount}</p>
              </div>
              <div style={styles.kpi}>
                <p style={styles.kpiLabel}>Active clients</p>
                <p style={styles.kpiValue}>{data.activeClients}</p>
              </div>
            </div>

            <div style={styles.split}>
              <div style={styles.section}>
                <p style={styles.sectionTitle}>Trend</p>

                <div style={styles.chartArea} aria-label="Trend chart">
                  {data.bars.map((h, idx) => (
                    <div
                      key={idx}
                      style={styles.bar(h, idx >= data.bars.length - 2)}
                      title={`Week ${idx + 1}: ${h}`}
                    />
                  ))}
                </div>

                <div style={styles.chartLegend}>
                  <div>Grey bars show historical performance</div>
                  <div>Purple bars highlight latest period</div>
                </div>

                <div style={styles.summary}>{data.summary}</div>
              </div>

              <div style={styles.section}>
                <p style={styles.sectionTitle}>Recent batches</p>

                <div style={styles.tableScroll}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Batch</th>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Items</th>
                        <th style={styles.th}>Amount</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.table.map((r) => (
                        <tr key={r.id}>
                          <td style={styles.td}>{r.id}</td>
                          <td style={styles.td}>{formatDate(r.date)}</td>
                          <td style={styles.td}>{r.items}</td>
                          <td style={styles.td}>{currencyZar(r.amount)}</td>
                          <td style={styles.td}>
                            <span style={styles.badge(r.status)}>{r.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button style={styles.btn("secondary")} type="button">
                    View all batches
                  </button>
                  <button style={styles.btn("secondary")} type="button">
                    View failures
                  </button>
                </div>

                <div style={{ marginTop: 8, ...styles.hint }}>
                  This section will later pull real batch history, outcomes, and provider responses.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={styles.hint}>
                Generated: <span style={{ color: "rgba(255,255,255,0.78)", fontWeight: 900 }}>UI-only</span>
              </div>
              <div style={styles.hint}>
                Export format: <span style={{ color: "rgba(255,255,255,0.78)", fontWeight: 900 }}>JSON mock</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
