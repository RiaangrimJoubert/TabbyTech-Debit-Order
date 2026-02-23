import React, { useEffect, useMemo, useState } from "react";
import { request } from "../api";

const styles = {
  page: { height: "100%", display: "flex", flexDirection: "column", gap: 16 },
  headerRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 },
  titleWrap: { display: "flex", flexDirection: "column", gap: 6 },
  title: { margin: 0, fontSize: 26, letterSpacing: 0.2, color: "rgba(255,255,255,0.92)" },
  subtitle: { margin: 0, fontSize: 13, color: "rgba(255,255,255,0.62)", lineHeight: 1.4 },

  glass: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
    backdropFilter: "blur(14px)",
    overflow: "hidden",
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

  toolbar: {
    padding: 14,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  leftTools: { display: "flex", flexDirection: "column", gap: 10, flex: "1 1 520px", minWidth: 340 },
  rightTools: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },

  inputWrap: { position: "relative", width: "100%", maxWidth: 560 },
  input: {
    height: 38,
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.88)",
    outline: "none",
    padding: "0 12px 0 38px",
    fontSize: 13,
  },
  inputIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.7 },

  chipsRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },

  chip: (active) => ({
    height: 34,
    padding: "0 10px",
    borderRadius: 999,
    border: `1px solid ${active ? "rgba(168,85,247,0.55)" : "rgba(255,255,255,0.12)"}`,
    background: active ? "rgba(168,85,247,0.16)" : "rgba(255,255,255,0.05)",
    color: active ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.76)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.2,
    userSelect: "none",
    transition: "transform 160ms ease, box-shadow 160ms ease, background 160ms ease",
  }),

  btn: (variant = "secondary", disabled = false) => {
    const base = {
      height: 38,
      padding: "0 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.86)",
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      userSelect: "none",
      transition: "transform 160ms ease, box-shadow 160ms ease, border 160ms ease",
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: 0.2,
      opacity: disabled ? 0.55 : 1,
      whiteSpace: "nowrap",
    };

    if (variant === "primary") {
      return {
        ...base,
        background: "linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95))",
        border: "1px solid rgba(168,85,247,0.55)",
        boxShadow: "0 14px 34px rgba(124,58,237,0.28)",
      };
    }

    if (variant === "danger") {
      return {
        ...base,
        background: "rgba(239,68,68,0.14)",
        border: "1px solid rgba(239,68,68,0.35)",
      };
    }

    return base;
  },

  select: {
    height: 38,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.86)",
    outline: "none",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 0.2,
    cursor: "pointer",
  },
  selectLabel: { fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 800 },

  tableScroll: { overflow: "auto", height: "100%" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 },
  th: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    textAlign: "left",
    padding: "12px 14px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.62)",
    background: "rgba(10,10,14,0.75)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(10px)",
  },
  td: {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.78)",
    whiteSpace: "nowrap",
  },
  thCenter: { textAlign: "center" },
  tdCenter: { textAlign: "center" },

  row: (active) => ({
    cursor: "pointer",
    background: active ? "rgba(168,85,247,0.12)" : "transparent",
    transition: "transform 160ms ease, background 160ms ease, box-shadow 160ms ease",
  }),
  rowHover: {
    transform: "translateY(-1px)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
    background: "rgba(255,255,255,0.04)",
  },

  badge: (tone) => {
    const map = {
      Live: { bg: "rgba(34,197,94,0.14)", bd: "rgba(34,197,94,0.30)" },
      Paused: { bg: "rgba(245,158,11,0.16)", bd: "rgba(245,158,11,0.32)" },
      Cancelled: { bg: "rgba(239,68,68,0.16)", bd: "rgba(239,68,68,0.32)" },
      Draft: { bg: "rgba(168,85,247,0.16)", bd: "rgba(168,85,247,0.32)" },
      Scheduled: { bg: "rgba(99,102,241,0.16)", bd: "rgba(99,102,241,0.32)" },
      Paid: { bg: "rgba(34,197,94,0.14)", bd: "rgba(34,197,94,0.30)" },
      Unpaid: { bg: "rgba(239,68,68,0.16)", bd: "rgba(239,68,68,0.32)" },
    };
    const t = map[tone] || { bg: "rgba(255,255,255,0.06)", bd: "rgba(255,255,255,0.14)" };
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
      fontWeight: 800,
      letterSpacing: 0.2,
    };
  },

  checkbox: { width: 16, height: 16, accentColor: "#A855F7", cursor: "pointer" },
  errorBar: {
    padding: "10px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(239,68,68,0.10)",
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
  },
};

function IconSearch({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
      <path d="M16.2 16.2 21 21" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function currencyZar(n) {
  const val = Number(n || 0);
  return val.toLocaleString("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 });
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "2-digit" });
}

function safeText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
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

export default function DebitOrders() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [hoverRow, setHoverRow] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    setErrorText("");
    try {
      const json = await request("/api/debit-orders", { method: "GET" });

      if (!json || json.ok !== true || !Array.isArray(json.data)) {
        const preview = typeof json?.raw === "string" ? json.raw.slice(0, 140) : "";
        throw new Error(preview ? `Unexpected response: ${preview}` : "Unexpected response from API");
      }

      setRows(json.data);
    } catch (e) {
      setRows([]);
      setErrorText(safeText(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((d) => (statusFilter === "All" ? true : safeText(d.status) === statusFilter))
      .filter((d) => {
        if (!q) return true;

        return (
          safeText(d?.name).toLowerCase().includes(q) ||
          safeText(d?.id).toLowerCase().includes(q) ||
          safeText(d?.paystackCustomerCode).toLowerCase().includes(q) ||
          safeText(d?.paystackAuthorizationCode).toLowerCase().includes(q)
        );
      });
  }, [rows, query, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize]);

  const statusCounts = useMemo(() => {
    const counts = { All: rows.length };
    for (const r of rows) {
      const s = safeText(r?.status) || "Draft";
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const statusKeys = useMemo(() => {
    const preferred = ["All", "Live", "Paused", "Cancelled", "Draft", "Scheduled", "Paid", "Unpaid"];
    const present = new Set(Object.keys(statusCounts));
    return preferred.filter((k) => present.has(k) || k === "All");
  }, [statusCounts]);

  const totalPages = useMemo(() => {
    const n = Math.ceil((filtered.length || 0) / Number(pageSize || 1));
    return n <= 0 ? 1 : n;
  }, [filtered.length, pageSize]);

  const pageClamped = useMemo(() => {
    if (page < 1) return 1;
    if (page > totalPages) return totalPages;
    return page;
  }, [page, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (pageClamped - 1) * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end);
  }, [filtered, pageClamped, pageSize]);

  const allVisibleSelected = pagedRows.length > 0 && pagedRows.every((x) => selectedIds.includes(x.id));
  const anySelected = selectedIds.length > 0;

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pagedRows.some((x) => x.id === id)));
      return;
    }
    setSelectedIds((prev) => {
      const set = new Set(prev);
      for (const x of pagedRows) set.add(x.id);
      return Array.from(set);
    });
  }

  function onExportExcel() {
    const exportRows = filtered.length > 0 ? filtered : rows;

    const header = [
      "ID",
      "Name",
      "Paystack Customer Code",
      "Amount",
      "Billing Cycle",
      "Next Charge Date",
      "Status",
      "Paystack Authorization Code",
      "Retry Count",
      "Last Transaction Reference",
      "Failure Reason",
      "Updated At",
    ];

    const body = exportRows.map((r) => [
      r.id,
      r.name,
      r.paystackCustomerCode || "",
      r.amount ?? "",
      r.billingCycle || "",
      r.nextChargeDate || "",
      r.status || "",
      r.paystackAuthorizationCode || "",
      r.retryCount ?? 0,
      r.lastTransactionReference || "",
      r.failureReason || "",
      r.updatedAt || "",
    ]);

    downloadCsv(`tabbytech-debit-orders-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body]);
  }

  function goPrev() {
    setPage((p) => Math.max(1, p - 1));
  }

  function goNext() {
    setPage((p) => Math.min(totalPages, p + 1));
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={styles.titleWrap}>
          <h1 style={styles.title}>Debit Orders</h1>
          <p style={styles.subtitle}>
            Live data from Zoho CRM.
            {loading ? " Loading..." : ""}
          </p>
        </div>
      </div>

      <div style={{ ...styles.glass, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {errorText ? <div style={styles.errorBar}>Error: {errorText}</div> : null}

        <div style={styles.panelHeader}>
          <div>
            <p style={styles.panelTitle}>All debit orders</p>
            <p style={styles.panelMeta}>
              {loading ? "Loading..." : `${pagedRows.length} shown`}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Selected:</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.86)" }}>
              {selectedIds.length}
            </span>
          </div>
        </div>

        <div style={styles.toolbar}>
          <div style={styles.leftTools}>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>
                <IconSearch />
              </span>
              <input
                style={styles.input}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by id or Paystack codes"
                aria-label="Search debit orders"
              />
            </div>

            <div style={styles.chipsRow}>
              {statusKeys.map((k) => {
                const active = statusFilter === k;
                return (
                  <div
                    key={k}
                    style={styles.chip(active)}
                    role="button"
                    tabIndex={0}
                    onClick={() => setStatusFilter(k)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setStatusFilter(k);
                    }}
                    title={`Filter: ${k}`}
                  >
                    <span>{k}</span>
                    <span style={{ opacity: 0.8 }}>{statusCounts[k] ?? 0}</span>
                  </div>
                );
              })}

              <button
                style={styles.btn("primary", loading)}
                type="button"
                disabled={loading}
                onClick={load}
                title="Re-fetch latest data from CRM"
              >
                Sync to CRM
              </button>
            </div>
          </div>

          <div style={styles.rightTools}>
            <button style={styles.btn("primary", false)} type="button" onClick={onExportExcel}>
              Export to Excel
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={styles.selectLabel}>Records</span>
              <select
                style={styles.select}
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                aria-label="Records per page"
              >
                <option value={10}>10 records</option>
                <option value={20}>20 records</option>
                <option value={50}>50 records</option>
                <option value={100}>100 records</option>
              </select>
            </div>

            <button style={styles.btn("primary", pageClamped <= 1)} type="button" disabled={pageClamped <= 1} onClick={goPrev}>
              Back
            </button>
            <button style={styles.btn("primary", pageClamped >= totalPages)} type="button" disabled={pageClamped >= totalPages} onClick={goNext}>
              Next
            </button>
          </div>
        </div>

        <div style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  <input
                    style={styles.checkbox}
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all visible"
                    disabled={loading || pagedRows.length === 0}
                  />
                </th>
                <th style={styles.th}>Debit order</th>
                <th style={{ ...styles.th, ...styles.thCenter }}>Paystack Customer Code</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Billing cycle</th>
                <th style={styles.th}>Next charge</th>
                <th style={styles.th}>Updated</th>
              </tr>
            </thead>

            <tbody>
              {pagedRows.map((d) => {
                const isHover = hoverRow === d.id;
                const isSelected = selectedIds.includes(d.id);

                return (
                  <tr
                    key={d.id}
                    style={{ ...styles.row(isSelected), ...(isHover ? styles.rowHover : null) }}
                    onMouseEnter={() => setHoverRow(d.id)}
                    onMouseLeave={() => setHoverRow(null)}
                  >
                    <td style={{ ...styles.td, width: 42 }} onClick={(e) => e.stopPropagation()}>
                      <input
                        style={styles.checkbox}
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(d.id)}
                        aria-label={`Select ${d.id}`}
                      />
                    </td>

                    <td style={styles.td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontWeight: 900, color: "rgba(255,255,255,0.88)" }}>{d.name || d.id}</span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.60)" }}>{d.id}</span>
                      </div>
                    </td>

                    <td style={{ ...styles.td, ...styles.tdCenter }}>
                      {d?.paystackCustomerCode || ""}
                    </td>

                    <td style={styles.td}>
                      <span style={styles.badge(d.status)}>{d.status || "Draft"}</span>
                    </td>
                    <td style={styles.td}>{currencyZar(d.amount)}</td>
                    <td style={styles.td}>{d.billingCycle || ""}</td>
                    <td style={styles.td}>{formatDate(d.nextChargeDate)}</td>
                    <td style={styles.td}>{formatDate(d.updatedAt)}</td>
                  </tr>
                );
              })}

              {!loading && pagedRows.length === 0 && (
                <tr>
                  <td style={{ ...styles.td, padding: 20 }} colSpan={8}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.86)" }}>No debit orders found</div>
                      <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, lineHeight: 1.4 }}>
                        Try a different search term or adjust the status filter.
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td style={{ ...styles.td, padding: 20 }} colSpan={8}>
                    <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 13 }}>Loading debit orders...</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
