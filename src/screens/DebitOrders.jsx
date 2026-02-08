import React, { useMemo, useState } from "react";

const styles = {
  page: { height: "100%", display: "flex", flexDirection: "column", gap: 16 },
  headerRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 },
  titleWrap: { display: "flex", flexDirection: "column", gap: 6 },
  title: { margin: 0, fontSize: 26, letterSpacing: 0.2, color: "rgba(255,255,255,0.92)" },
  subtitle: { margin: 0, fontSize: 13, color: "rgba(255,255,255,0.62)", lineHeight: 1.4 },

  glass: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  leftTools: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  rightTools: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },

  inputWrap: { position: "relative", flex: "1 1 320px", maxWidth: 520 },
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

  drawerOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(6px)",
    zIndex: 60,
    display: "flex",
    justifyContent: "flex-end",
  },
  drawer: {
    width: 520,
    maxWidth: "92vw",
    height: "100%",
    borderLeft: "1px solid rgba(255,255,255,0.12)",
    background: "linear-gradient(180deg, rgba(18,18,24,0.92), rgba(10,10,14,0.92))",
    boxShadow: "-20px 0 60px rgba(0,0,0,0.55)",
    display: "flex",
    flexDirection: "column",
  },
  drawerHeader: {
    padding: 16,
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  drawerTitle: { margin: 0, fontSize: 16, fontWeight: 900, color: "rgba(255,255,255,0.90)" },
  drawerSub: { margin: "6px 0 0 0", fontSize: 12, color: "rgba(255,255,255,0.62)", lineHeight: 1.4 },
  drawerBody: { padding: 16, display: "flex", flexDirection: "column", gap: 12, overflow: "auto" },

  section: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    padding: 12,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 12,
    fontWeight: 800,
    color: "rgba(255,255,255,0.78)",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  kv: { display: "grid", gridTemplateColumns: "150px 1fr", gap: 10, marginTop: 10 },
  k: { fontSize: 12, color: "rgba(255,255,255,0.55)" },
  v: { fontSize: 13, color: "rgba(255,255,255,0.82)" },

  checkbox: {
    width: 16,
    height: 16,
    accentColor: "#A855F7",
    cursor: "pointer",
  },
};

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

function currencyZar(n) {
  const val = Number(n || 0);
  return val.toLocaleString("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "2-digit" });
}

const seed = [
  {
    id: "DO-90021",
    client: "Mkhize Holdings",
    reference: "MKH-MND-0182",
    status: "Live",
    amount: 3990,
    frequency: "Monthly",
    runDay: "15",
    nextRun: "2026-02-15T10:00:00.000Z",
    bank: "FNB",
    accountLast4: "1129",
    updated: "2026-02-06T14:22:00.000Z",
  },
  {
    id: "DO-90022",
    client: "Sable Properties",
    reference: "SBL-MND-2201",
    status: "Paused",
    amount: 12500,
    frequency: "Monthly",
    runDay: "12",
    nextRun: "2026-02-12T10:00:00.000Z",
    bank: "Standard Bank",
    accountLast4: "8841",
    updated: "2026-02-07T09:08:00.000Z",
  },
  {
    id: "DO-90023",
    client: "Aurora Wellness Group",
    reference: "AWG-MND-0319",
    status: "Live",
    amount: 1790,
    frequency: "Monthly",
    runDay: "18",
    nextRun: "2026-02-18T10:00:00.000Z",
    bank: "ABSA",
    accountLast4: "5510",
    updated: "2026-02-01T17:55:00.000Z",
  },
  {
    id: "DO-90024",
    client: "Kopano Tutors",
    reference: "KOP-MND-0099",
    status: "Cancelled",
    amount: 990,
    frequency: "Monthly",
    runDay: "01",
    nextRun: "2026-03-01T10:00:00.000Z",
    bank: "Nedbank",
    accountLast4: "7003",
    updated: "2026-02-03T11:12:00.000Z",
  },
  {
    id: "DO-90025",
    client: "TabbyTech Partners",
    reference: "TTP-MND-0007",
    status: "Draft",
    amount: 2500,
    frequency: "Monthly",
    runDay: "20",
    nextRun: "2026-02-20T10:00:00.000Z",
    bank: "FNB",
    accountLast4: "1022",
    updated: "2026-02-07T16:40:00.000Z",
  },
];

export default function DebitOrders() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [hoverRow, setHoverRow] = useState(null);
  const [drawerId, setDrawerId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return seed
      .filter((d) => (statusFilter === "All" ? true : d.status === statusFilter))
      .filter((d) => {
        if (!q) return true;
        return (
          d.client.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q) ||
          d.reference.toLowerCase().includes(q) ||
          d.bank.toLowerCase().includes(q)
        );
      });
  }, [query, statusFilter]);

  const statusCounts = useMemo(() => {
    const base = { All: seed.length, Live: 0, Paused: 0, Cancelled: 0, Draft: 0 };
    for (const d of seed) base[d.status] = (base[d.status] || 0) + 1;
    return base;
  }, []);

  const allVisibleSelected = filtered.length > 0 && filtered.every((x) => selectedIds.includes(x.id));
  const anySelected = selectedIds.length > 0;

  const drawerItem = useMemo(() => seed.find((d) => d.id === drawerId) || null, [drawerId]);

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

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={styles.titleWrap}>
          <h1 style={styles.title}>Debit Orders</h1>
          <p style={styles.subtitle}>
            View and manage debit orders. Bulk actions are UI-only and do not persist yet.
          </p>
        </div>
      </div>

      <div style={{ ...styles.glass, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={styles.panelHeader}>
          <div>
            <p style={styles.panelTitle}>All debit orders</p>
            <p style={styles.panelMeta}>{filtered.length} shown</p>
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
                placeholder="Search by client, id, reference, or bank"
                aria-label="Search debit orders"
              />
            </div>

            {["All", "Live", "Paused", "Cancelled", "Draft"].map((k) => {
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
          </div>

          <div style={styles.rightTools}>
            <button style={styles.btn("secondary", !anySelected)} type="button" disabled={!anySelected}>
              Pause
            </button>
            <button style={styles.btn("secondary", !anySelected)} type="button" disabled={!anySelected}>
              Resume
            </button>
            <button style={styles.btn("danger", !anySelected)} type="button" disabled={!anySelected}>
              Cancel
            </button>
            <button style={styles.btn("primary", false)} type="button">
              New debit order
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
                <th style={styles.th}>Schedule</th>
                <th style={styles.th}>Next run</th>
                <th style={styles.th}>Bank</th>
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
                    style={{
                      ...styles.row(isSelected),
                      ...(isHover ? styles.rowHover : null),
                    }}
                    onMouseEnter={() => setHoverRow(d.id)}
                    onMouseLeave={() => setHoverRow(null)}
                    onClick={() => setDrawerId(d.id)}
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
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.60)" }}>{d.reference}</span>
                      </div>
                    </td>

                    <td style={styles.td}>{d.client}</td>
                    <td style={styles.td}>
                      <span style={styles.badge(d.status)}>{d.status}</span>
                    </td>
                    <td style={styles.td}>{currencyZar(d.amount)}</td>
                    <td style={styles.td}>
                      {d.frequency} · Day {d.runDay}
                    </td>
                    <td style={styles.td}>{formatDate(d.nextRun)}</td>
                    <td style={styles.td}>
                      {d.bank} · {d.accountLast4}
                    </td>
                    <td style={styles.td}>{formatDate(d.updated)}</td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td style={{ ...styles.td, padding: 20 }} colSpan={9}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.86)" }}>No debit orders found</div>
                      <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, lineHeight: 1.4 }}>
                        Try a different search term or adjust the status filter.
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drawerItem && (
        <div
          style={styles.drawerOverlay}
          role="button"
          tabIndex={0}
          onClick={() => setDrawerId("")}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDrawerId("");
          }}
          aria-label="Close details"
        >
          <div style={styles.drawer} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div style={styles.drawerHeader}>
              <div>
                <p style={styles.drawerTitle}>Debit order details</p>
                <p style={styles.drawerSub}>
                  {drawerItem.id} · {drawerItem.client}
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button style={styles.btn("secondary")} type="button">
                  Edit
                </button>
                <button style={styles.btn("primary")} type="button">
                  Run test
                </button>
              </div>
            </div>

            <div style={styles.drawerBody}>
              <div style={styles.section}>
                <p style={styles.sectionTitle}>Status</p>
                <div style={styles.kv}>
                  <div style={styles.k}>Current</div>
                  <div style={styles.v}>
                    <span style={styles.badge(drawerItem.status)}>{drawerItem.status}</span>
                  </div>
                  <div style={styles.k}>Updated</div>
                  <div style={styles.v}>{formatDate(drawerItem.updated)}</div>
                </div>
              </div>

              <div style={styles.section}>
                <p style={styles.sectionTitle}>Billing</p>
                <div style={styles.kv}>
                  <div style={styles.k}>Amount</div>
                  <div style={styles.v}>{currencyZar(drawerItem.amount)}</div>
                  <div style={styles.k}>Frequency</div>
                  <div style={styles.v}>{drawerItem.frequency}</div>
                  <div style={styles.k}>Run day</div>
                  <div style={styles.v}>{drawerItem.runDay}</div>
                  <div style={styles.k}>Next run</div>
                  <div style={styles.v}>{formatDate(drawerItem.nextRun)}</div>
                </div>
              </div>

              <div style={styles.section}>
                <p style={styles.sectionTitle}>Banking</p>
                <div style={styles.kv}>
                  <div style={styles.k}>Bank</div>
                  <div style={styles.v}>{drawerItem.bank}</div>
                  <div style={styles.k}>Account</div>
                  <div style={styles.v}>Ending {drawerItem.accountLast4}</div>
                  <div style={styles.k}>Reference</div>
                  <div style={styles.v}>{drawerItem.reference}</div>
                </div>
              </div>

              <div style={styles.section}>
                <p style={styles.sectionTitle}>Actions</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  <button style={styles.btn("secondary")} type="button">
                    Pause
                  </button>
                  <button style={styles.btn("secondary")} type="button">
                    Resume
                  </button>
                  <button style={styles.btn("danger")} type="button">
                    Cancel
                  </button>
                  <button style={styles.btn("primary")} type="button">
                    Create batch
                  </button>
                </div>
                <p style={{ margin: "10px 0 0 0", fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
                  These buttons are UI-only. No data is saved yet.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
