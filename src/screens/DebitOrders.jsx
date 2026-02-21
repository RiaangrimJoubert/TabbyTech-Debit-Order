import React, { useEffect, useMemo, useState } from "react";

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

  leftTools: { display: "flex", flexDirection: "column", gap: 10, flex: "1 1 560px", minWidth: 320 },
  rightTools: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },

  inputWrap: { position: "relative", width: "100%", maxWidth: 640 },
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

  chipRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },

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

    if (variant === "ghost") {
      return {
        ...base,
        background: "rgba(0,0,0,0.10)",
        border: "1px solid rgba(255,255,255,0.10)",
      };
    }

    return base;
  },

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
  row: (active) => ({
    cursor: "pointer",
    background: active ? "rgba(168,85,247,0.12)" : "transparent",
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
      Scheduled: { bg: "rgba(168,85,247,0.16)", bd: "rgba(168,85,247,0.32)" },
      Paid: { bg: "rgba(34,197,94,0.14)", bd: "rgba(34,197,94,0.30)" },
      Unpaid: { bg: "rgba(245,158,11,0.16)", bd: "rgba(245,158,11,0.32)" },
    };
    const t = map[tone] || map.Draft;
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

  note: { margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 },
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

function downloadTextFile(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function DebitOrders() {
  const API_BASE =
    (import.meta?.env?.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "") ||
    window.location.origin;

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [hoverRow, setHoverRow] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  async function fetchList() {
    setLoading(true);
    setLoadError("");
    try {
      const url = `${API_BASE}/api/debit-orders`;
      const resp = await fetch(url, { method: "GET" });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json.ok) throw new Error(json.error || `Request failed ${resp.status}`);
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setLoadError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalized = useMemo(() => {
    return rows.map((r) => ({
      id: r.id,
      name: r.name || "",
      clientName: r?.client?.name || r?.client?.Name || "",
      status: r.status || "Draft",
      amount: r.amount ?? null,
      billingCycle: r.billingCycle || "",
      nextChargeDate: r.nextChargeDate || "",
      retryCount: Number(r.retryCount ?? 0),
      lastTransactionReference: r.lastTransactionReference || "",
      failureReason: r.failureReason || "",
      updatedAt: r.updatedAt || "",
    }));
  }, [rows]);

  const statusCounts = useMemo(() => {
    const base = { All: normalized.length };
    for (const r of normalized) base[r.status] = (base[r.status] || 0) + 1;
    return base;
  }, [normalized]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return normalized
      .filter((d) => (statusFilter === "All" ? true : d.status === statusFilter))
      .filter((d) => {
        if (!q) return true;
        return (
          String(d.clientName || "").toLowerCase().includes(q) ||
          String(d.id || "").toLowerCase().includes(q) ||
          String(d.lastTransactionReference || "").toLowerCase().includes(q)
        );
      });
  }, [normalized, query, statusFilter]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((x) => selectedIds.includes(x.id));
  const anySelected = selectedIds.length > 0;

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filtered.some((x) => x.id === id)));
      return;
    }
    setSelectedIds((prev) => {
      const set = new Set(prev);
      for (const x of filtered) set.add(x.id);
      return Array.from(set);
    });
  }

  function exportVisibleToExcelCsv() {
    const header = [
      "Debit Order ID",
      "Name",
      "Client",
      "Status",
      "Amount",
      "Billing Cycle",
      "Next Charge Date",
      "Retry Count",
      "Last Transaction Reference",
      "Failure Reason",
      "Updated At",
    ];

    const lines = [header.map(escapeCsv).join(",")];

    for (const r of filtered) {
      lines.push(
        [
          r.id,
          r.name,
          r.clientName,
          r.status,
          r.amount,
          r.billingCycle,
          r.nextChargeDate,
          r.retryCount,
          r.lastTransactionReference,
          r.failureReason,
          r.updatedAt,
        ]
          .map(escapeCsv)
          .join(",")
      );
    }

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadTextFile(`tabbytech-debit-orders-${stamp}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
  }

  async function syncToCrm() {
    await fetchList();
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={styles.titleWrap}>
          <h1 style={styles.title}>Debit Orders</h1>
          <p style={styles.subtitle}>
            Live data from Zoho CRM via Catalyst API Gateway.
            {loadError ? ` Error: ${loadError}` : ""}
          </p>
        </div>
      </div>

      <div style={{ ...styles.glass, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={styles.panelHeader}>
          <div>
            <p style={styles.panelTitle}>All debit orders</p>
            <p style={styles.panelMeta}>{loading ? "Loading..." : `${filtered.length} shown`}</p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Selected:</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.86)" }}>{selectedIds.length}</span>
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
                placeholder="Search by client, id, reference, or codes"
                aria-label="Search debit orders"
              />
            </div>

            <div style={styles.chipRow}>
              {["All", "Live", "Paused", "Cancelled", "Draft", "Scheduled", "Paid", "Unpaid"].map((k) => {
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
                    <span style={{ opacity: 0.8 }}>{k === "All" ? normalized.length : statusCounts[k] ?? 0}</span>
                  </div>
                );
              })}

              <button style={styles.btn("ghost", loading)} type="button" onClick={syncToCrm} disabled={loading}>
                Sync to CRM Debit-Orders
              </button>
            </div>
          </div>

          <div style={styles.rightTools}>
            <button
              style={styles.btn("primary", filtered.length === 0)}
              type="button"
              onClick={exportVisibleToExcelCsv}
              disabled={filtered.length === 0}
            >
              Export to Excel
            </button>

            <button style={styles.btn("secondary", !anySelected)} type="button" disabled={!anySelected}>
              Pause
            </button>
            <button style={styles.btn("secondary", !anySelected)} type="button" disabled={!anySelected}>
              Resume
            </button>
            <button style={styles.btn("danger", !anySelected)} type="button" disabled={!anySelected}>
              Cancel
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
                  />
                </th>
                <th style={styles.th}>Debit order</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Billing cycle</th>
                <th style={styles.th}>Next charge</th>
                <th style={styles.th}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
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
                        <span style={{ fontWeight: 900, color: "rgba(255,255,255,0.88)" }}>{d.id}</span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.60)" }}>
                          {d.lastTransactionReference || ""}
                        </span>
                      </div>
                    </td>

                    <td style={styles.td}>{d.clientName || "-"}</td>
                    <td style={styles.td}>
                      <span style={styles.badge(d.status)}>{d.status}</span>
                    </td>
                    <td style={styles.td}>{currencyZar(d.amount)}</td>
                    <td style={styles.td}>{d.billingCycle || "-"}</td>
                    <td style={styles.td}>{formatDate(d.nextChargeDate)}</td>
                    <td style={styles.td}>{formatDate(d.updatedAt)}</td>
                  </tr>
                );
              })}

              {!loading && filtered.length === 0 && (
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
                    <div style={{ color: "rgba(255,255,255,0.70)" }}>Loading debit orders...</div>
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
