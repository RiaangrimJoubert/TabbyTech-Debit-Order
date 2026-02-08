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
    lineHeight: 1.4,
  },
  actionsRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },

  grid: {
    display: "grid",
    gridTemplateColumns: "1.6fr 1fr",
    gap: 16,
    minHeight: 0,
    flex: 1,
  },

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
  panelHeaderLeft: { display: "flex", flexDirection: "column", gap: 2 },
  panelTitle: { margin: 0, fontSize: 14, color: "rgba(255,255,255,0.86)" },
  panelMeta: { margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)" },

  controls: {
    padding: 14,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  tableWrap: { minHeight: 0, height: "100%", display: "flex", flexDirection: "column" },
  tableScroll: { overflow: "auto", height: "100%" },

  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: 13,
  },
  th: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    textAlign: "left",
    padding: "12px 14px",
    fontSize: 12,
    fontWeight: 600,
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
    background: active ? "rgba(168,85,247,0.14)" : "transparent",
    transition: "transform 160ms ease, background 160ms ease, box-shadow 160ms ease",
  }),
  rowHover: {
    transform: "translateY(-1px)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
    background: "rgba(255,255,255,0.04)",
  },

  rightContent: {
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 0,
  },

  split: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },

  statCard: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
    padding: 12,
  },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.55)", margin: 0 },
  statValue: {
    margin: "6px 0 0 0",
    fontSize: 18,
    fontWeight: 700,
    color: "rgba(255,255,255,0.88)",
    letterSpacing: 0.2,
  },

  section: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.14)",
    padding: 12,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(255,255,255,0.78)",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  kv: { display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, marginTop: 10 },
  k: { fontSize: 12, color: "rgba(255,255,255,0.55)" },
  v: { fontSize: 13, color: "rgba(255,255,255,0.82)" },

  divider: { height: 1, background: "rgba(255,255,255,0.08)", margin: "10px 0" },

  btn: (variant = "primary") => {
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
      cursor: "pointer",
      userSelect: "none",
      transition: "transform 160ms ease, box-shadow 160ms ease, border 160ms ease",
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: 0.2,
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

  input: {
    height: 38,
    minWidth: 260,
    flex: "1 1 260px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.88)",
    outline: "none",
    padding: "0 12px 0 38px",
    fontSize: 13,
  },
  inputWrap: { position: "relative", flex: "1 1 300px", maxWidth: 520 },
  inputIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    opacity: 0.7,
  },

  badge: (tone) => {
    const map = {
      Active: { bg: "rgba(34,197,94,0.14)", bd: "rgba(34,197,94,0.30)", tx: "rgba(255,255,255,0.86)" },
      Paused: { bg: "rgba(245,158,11,0.16)", bd: "rgba(245,158,11,0.32)", tx: "rgba(255,255,255,0.86)" },
      Risk: { bg: "rgba(239,68,68,0.16)", bd: "rgba(239,68,68,0.32)", tx: "rgba(255,255,255,0.86)" },
      New: { bg: "rgba(168,85,247,0.16)", bd: "rgba(168,85,247,0.32)", tx: "rgba(255,255,255,0.90)" },
    };
    const t = map[tone] || map.New;
    return {
      height: 22,
      padding: "0 10px",
      borderRadius: 999,
      display: "inline-flex",
      alignItems: "center",
      border: `1px solid ${t.bd}`,
      background: t.bg,
      color: t.tx,
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: 0.2,
    };
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

function IconPlus({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" />
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

const seedClients = [
  {
    id: "CL-10021",
    name: "Mkhize Holdings",
    ref: "MKH-DO-0021",
    status: "Active",
    mandates: 14,
    nextRun: "2026-02-15T10:00:00.000Z",
    outstanding: 245000,
    updated: "2026-02-06T14:22:00.000Z",
    contact: "finance@mkhize.co.za",
    phone: "010 446 5754",
    industry: "Commercial",
    risk: "Low",
    notes: "High volume accounts. Prefers batch notifications by email.",
  },
  {
    id: "CL-10022",
    name: "Sable Properties",
    ref: "SBL-DO-0148",
    status: "Risk",
    mandates: 7,
    nextRun: "2026-02-12T10:00:00.000Z",
    outstanding: 89000,
    updated: "2026-02-07T09:08:00.000Z",
    contact: "accounts@sableprop.co.za",
    phone: "011 204 7721",
    industry: "Property",
    risk: "High",
    notes: "Recent reversals. Monitor mandate activity and batch outcomes.",
  },
  {
    id: "CL-10023",
    name: "Aurora Wellness Group",
    ref: "AWG-DO-0312",
    status: "Active",
    mandates: 21,
    nextRun: "2026-02-18T10:00:00.000Z",
    outstanding: 128000,
    updated: "2026-02-01T17:55:00.000Z",
    contact: "billing@aurorawellness.co.za",
    phone: "010 998 4432",
    industry: "Healthcare",
    risk: "Medium",
    notes: "Multiple branches. Standard debit schedule on the 18th.",
  },
  {
    id: "CL-10024",
    name: "Kopano Tutors",
    ref: "KOP-DO-0099",
    status: "Paused",
    mandates: 3,
    nextRun: "2026-03-01T10:00:00.000Z",
    outstanding: 12000,
    updated: "2026-02-03T11:12:00.000Z",
    contact: "admin@kopanotutors.co.za",
    phone: "021 110 0081",
    industry: "Education",
    risk: "Low",
    notes: "Paused pending mandate refresh and updated banking details.",
  },
  {
    id: "CL-10025",
    name: "TabbyTech Partners",
    ref: "TTP-DO-0007",
    status: "New",
    mandates: 2,
    nextRun: "2026-02-20T10:00:00.000Z",
    outstanding: 9000,
    updated: "2026-02-07T16:40:00.000Z",
    contact: "ops@tabbytech.co.za",
    phone: "010 446 5754",
    industry: "Technology",
    risk: "Low",
    notes: "New onboarding. Needs mandate templates and first batch dry run.",
  },
];

export default function Clients() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(seedClients[0]?.id || "");
  const [hoverRow, setHoverRow] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return seedClients
      .filter((c) => (statusFilter === "All" ? true : c.status === statusFilter))
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.ref.toLowerCase().includes(q) ||
          c.contact.toLowerCase().includes(q)
        );
      });
  }, [query, statusFilter]);

  const selected = useMemo(() => seedClients.find((c) => c.id === selectedId) || seedClients[0], [selectedId]);

  const counts = useMemo(() => {
    const base = { All: seedClients.length, Active: 0, Paused: 0, Risk: 0, New: 0 };
    for (const c of seedClients) base[c.status] = (base[c.status] || 0) + 1;
    return base;
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={styles.titleWrap}>
          <h1 style={styles.title}>Clients</h1>
          <p style={styles.subtitle}>
            Manage client profiles, mandate activity, and operational status. UI-only for now, no backend actions.
          </p>
        </div>

        <div style={styles.actionsRow}>
          <button style={styles.btn("secondary")} type="button">
            Export
          </button>
          <button style={styles.btn("secondary")} type="button">
            Import
          </button>
          <button style={styles.btn("primary")} type="button">
            <IconPlus />
            New client
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        {/* LEFT: LIST */}
        <div style={{ ...styles.glass, ...styles.tableWrap, minHeight: 0 }}>
          <div style={styles.panelHeader}>
            <div style={styles.panelHeaderLeft}>
              <p style={styles.panelTitle}>Client list</p>
              <p style={styles.panelMeta}>{filtered.length} shown</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Sort:</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.82)" }}>Last updated</span>
            </div>
          </div>

          <div style={styles.controls}>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>
                <IconSearch />
              </span>
              <input
                style={styles.input}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients by name, id, reference, or email"
                aria-label="Search clients"
              />
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {["All", "Active", "Paused", "Risk", "New"].map((k) => {
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
                    <span style={{ opacity: 0.8 }}>{counts[k] ?? 0}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Client</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Mandates</th>
                  <th style={styles.th}>Next run</th>
                  <th style={styles.th}>Outstanding</th>
                  <th style={styles.th}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const isActive = c.id === selectedId;
                  const isHover = hoverRow === c.id;
                  const rowStyle = {
                    ...styles.row(isActive),
                    ...(isHover ? styles.rowHover : null),
                  };

                  return (
                    <tr
                      key={c.id}
                      style={rowStyle}
                      onMouseEnter={() => setHoverRow(c.id)}
                      onMouseLeave={() => setHoverRow(null)}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <td style={{ ...styles.td, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontWeight: 800, color: "rgba(255,255,255,0.88)" }}>{c.name}</span>
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{c.id}</span>
                          </div>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.60)" }}>{c.ref}</span>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.badge(c.status)}>{c.status}</span>
                      </td>

                      <td style={styles.td}>{c.mandates}</td>
                      <td style={styles.td}>{formatDate(c.nextRun)}</td>
                      <td style={styles.td}>{currencyZar(c.outstanding)}</td>
                      <td style={styles.td}>{formatDate(c.updated)}</td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td style={{ ...styles.td, padding: 20 }} colSpan={6}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.86)" }}>No clients found</div>
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

        {/* RIGHT: DETAILS */}
        <div style={{ ...styles.glass, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={styles.panelHeader}>
            <div style={styles.panelHeaderLeft}>
              <p style={styles.panelTitle}>Client details</p>
              <p style={styles.panelMeta}>Selection updates this panel</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button style={styles.btn("secondary")} type="button">
                Edit
              </button>
              <button style={styles.btn("danger")} type="button">
                Disable
              </button>
            </div>
          </div>

          <div style={styles.rightContent}>
            {selected ? (
              <>
                <div style={styles.split}>
                  <div style={styles.statCard}>
                    <p style={styles.statLabel}>Mandates</p>
                    <p style={styles.statValue}>{selected.mandates}</p>
                  </div>
                  <div style={styles.statCard}>
                    <p style={styles.statLabel}>Outstanding</p>
                    <p style={styles.statValue}>{currencyZar(selected.outstanding)}</p>
                  </div>
                </div>

                <div style={styles.section}>
                  <p style={styles.sectionTitle}>Profile</p>
                  <div style={styles.kv}>
                    <div style={styles.k}>Client</div>
                    <div style={styles.v}>{selected.name}</div>

                    <div style={styles.k}>Client id</div>
                    <div style={styles.v}>{selected.id}</div>

                    <div style={styles.k}>Reference</div>
                    <div style={styles.v}>{selected.ref}</div>

                    <div style={styles.k}>Status</div>
                    <div style={styles.v}>
                      <span style={styles.badge(selected.status)}>{selected.status}</span>
                    </div>

                    <div style={styles.k}>Industry</div>
                    <div style={styles.v}>{selected.industry}</div>

                    <div style={styles.k}>Risk</div>
                    <div style={styles.v}>{selected.risk}</div>
                  </div>

                  <div style={styles.divider} />

                  <div style={styles.kv}>
                    <div style={styles.k}>Primary contact</div>
                    <div style={styles.v}>{selected.contact}</div>

                    <div style={styles.k}>Phone</div>
                    <div style={styles.v}>{selected.phone}</div>

                    <div style={styles.k}>Next run</div>
                    <div style={styles.v}>{formatDate(selected.nextRun)}</div>

                    <div style={styles.k}>Updated</div>
                    <div style={styles.v}>{formatDate(selected.updated)}</div>
                  </div>
                </div>

                <div style={styles.section}>
                  <p style={styles.sectionTitle}>Notes</p>
                  <p style={{ margin: "10px 0 0 0", color: "rgba(255,255,255,0.70)", fontSize: 13, lineHeight: 1.5 }}>
                    {selected.notes}
                  </p>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                    <button style={styles.btn("secondary")} type="button">
                      View debit orders
                    </button>
                    <button style={styles.btn("secondary")} type="button">
                      View batches
                    </button>
                    <button style={styles.btn("primary")} type="button">
                      Start onboarding
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: 14, color: "rgba(255,255,255,0.70)" }}>Select a client to view details.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
