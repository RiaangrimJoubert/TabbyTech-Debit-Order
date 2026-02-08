import React, { useMemo, useState } from "react";

const PURPLE = "var(--purple)";

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
    maxWidth: 960,
  },
  actionsRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },

  grid: {
    display: "grid",
    gridTemplateColumns: "1.65fr 1fr",
    gap: 16,
    minHeight: 0,
    flex: 1,
  },

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
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.78)",
    whiteSpace: "nowrap",
  },
  row: (active) => ({
    cursor: "pointer",
    background: active ? "rgba(124,58,237,0.14)" : "transparent",
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
    background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
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
  kv: { display: "grid", gridTemplateColumns: "150px 1fr", gap: 10, marginTop: 10 },
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
      transition: "transform 160ms ease, box-shadow 160ms ease, border 160ms ease, filter 160ms ease",
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: 0.2,
      whiteSpace: "nowrap",
    };

    if (variant === "primary") {
      return {
        ...base,
        background: PURPLE,
        border: "1px solid rgba(124,58,237,0.55)",
        boxShadow: "0 14px 34px rgba(124,58,237,0.28)",
        color: "rgba(255,255,255,0.96)",
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
    border: `1px solid ${active ? "rgba(124,58,237,0.55)" : "rgba(255,255,255,0.12)"}`,
    background: active ? "rgba(124,58,237,0.16)" : "rgba(255,255,255,0.05)",
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

  select: {
    height: 38,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.88)",
    outline: "none",
    padding: "0 12px",
    fontSize: 13,
  },

  badge: (tone) => {
    const map = {
      Active: { bg: "rgba(34,197,94,0.14)", bd: "rgba(34,197,94,0.30)", tx: "rgba(255,255,255,0.86)" },
      Paused: { bg: "rgba(245,158,11,0.16)", bd: "rgba(245,158,11,0.32)", tx: "rgba(255,255,255,0.86)" },
      Risk: { bg: "rgba(239,68,68,0.16)", bd: "rgba(239,68,68,0.32)", tx: "rgba(255,255,255,0.86)" },
      New: { bg: "rgba(124,58,237,0.16)", bd: "rgba(124,58,237,0.32)", tx: "rgba(255,255,255,0.90)" },
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

  syncBadge: (state) => {
    const map = {
      Synced: { bg: "rgba(34,197,94,0.14)", bd: "rgba(34,197,94,0.30)" },
      Pending: { bg: "rgba(124,58,237,0.14)", bd: "rgba(124,58,237,0.28)" },
      "Needs review": { bg: "rgba(245,158,11,0.16)", bd: "rgba(245,158,11,0.30)" },
      "Sync error": { bg: "rgba(239,68,68,0.14)", bd: "rgba(239,68,68,0.30)" },
    };
    const t = map[state] || map.Pending;
    return {
      height: 22,
      padding: "0 10px",
      borderRadius: 999,
      display: "inline-flex",
      alignItems: "center",
      border: `1px solid ${t.bd}`,
      background: t.bg,
      color: "rgba(255,255,255,0.88)",
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: 0.2,
      whiteSpace: "nowrap",
    };
  },

  sourceBadge: (source) => ({
    height: 22,
    padding: "0 10px",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    border: source === "Zoho CRM" ? "1px solid rgba(124,58,237,0.28)" : "1px solid rgba(255,255,255,0.12)",
    background: source === "Zoho CRM" ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
  }),

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.62)",
    zIndex: 60,
    display: "grid",
    placeItems: "center",
    padding: 18,
  },
  modal: {
    width: "min(720px, 96vw)",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05))",
    boxShadow: "0 28px 90px rgba(0,0,0,0.55)",
    backdropFilter: "blur(18px)",
    overflow: "hidden",
  },
  modalHead: {
    padding: 14,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.14)",
  },
  modalTitle: { margin: 0, fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.92)" },
  modalHint: { marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.62)", lineHeight: 1.4 },
  modalBody: { padding: 14, display: "grid", gap: 12 },
  modalGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },

  field: { display: "grid", gap: 6 },
  label: { fontSize: 12, color: "rgba(255,255,255,0.62)", fontWeight: 700 },
  inputPlain: {
    height: 40,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.90)",
    outline: "none",
    padding: "0 12px",
    fontSize: 13,
  },
  textarea: {
    minHeight: 96,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.90)",
    outline: "none",
    padding: "10px 12px",
    fontSize: 13,
    resize: "none",
    lineHeight: 1.45,
  },

  banner: {
    borderRadius: 14,
    border: "1px solid rgba(245,158,11,0.30)",
    background: "rgba(245,158,11,0.12)",
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  bannerTitle: { margin: 0, fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.90)" },
  bannerText: { marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.74)", lineHeight: 1.45 },

  toastWrap: { position: "fixed", bottom: 24, right: 24, zIndex: 80 },
  toast: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.70)",
    backdropFilter: "blur(14px)",
    padding: "10px 12px",
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    boxShadow: "0 22px 70px rgba(0,0,0,0.45)",
  },

  muted: { color: "rgba(255,255,255,0.62)" },
};

function IconSearch({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
      <path d="M16.2 16.2 21 21" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" />
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

function IconRefresh({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 12a8 8 0 0 1-14.5 4.6M4 12a8 8 0 0 1 14.5-4.6"
        stroke="rgba(255,255,255,0.90)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M19 5v5h-5" stroke="rgba(255,255,255,0.90)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19v-5h5" stroke="rgba(255,255,255,0.90)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function currencyZar(n) {
  const val = Number(n || 0);
  return val.toLocaleString("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 });
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "2-digit" });
}

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("en-ZA", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function makeId() {
  return `CL-${Math.floor(10000 + Math.random() * 89999)}`;
}

function makeRef(name) {
  const cleaned = String(name || "CLIENT")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join("-");
  return `${cleaned || "CLIENT"}-DO-${Math.floor(10 + Math.random() * 989)}`;
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
    source: "Zoho CRM",
    syncStatus: "Synced",
    lastSync: "2026-02-07T09:30:00.000Z",
    zohoRecordId: "5038291000000143021",
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
    source: "Zoho CRM",
    syncStatus: "Needs review",
    lastSync: "2026-02-07T09:35:00.000Z",
    zohoRecordId: "5038291000000143059",
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
    source: "Zoho CRM",
    syncStatus: "Synced",
    lastSync: "2026-02-07T09:32:00.000Z",
    zohoRecordId: "5038291000000143112",
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
    source: "Zoho CRM",
    syncStatus: "Pending",
    lastSync: "",
    zohoRecordId: "5038291000000143188",
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
    source: "Manual",
    syncStatus: "Pending",
    lastSync: "",
    zohoRecordId: "",
  },
];

export default function Clients() {
  const [toast, setToast] = useState(null);
  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  }

  // UI-only connection state (later this will come from Settings integration)
  const [zohoConnected, setZohoConnected] = useState(true);

  const [clients, setClients] = useState(seedClients);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [syncFilter, setSyncFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(clients[0]?.id || "");
  const [hoverRow, setHoverRow] = useState(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState({
    name: "",
    email: "",
    phone: "",
    industry: "",
    notes: "",
  });

  const possibleDuplicate = useMemo(() => {
    const n = manualDraft.name.trim().toLowerCase();
    const e = manualDraft.email.trim().toLowerCase();
    if (!n && !e) return null;

    return (
      clients.find((c) => c.source === "Zoho CRM" && ((n && c.name.toLowerCase() === n) || (e && c.contact.toLowerCase() === e))) ||
      null
    );
  }, [manualDraft.name, manualDraft.email, clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => (statusFilter === "All" ? true : c.status === statusFilter))
      .filter((c) => (sourceFilter === "All" ? true : c.source === sourceFilter))
      .filter((c) => (syncFilter === "All" ? true : c.syncStatus === syncFilter))
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.ref.toLowerCase().includes(q) ||
          c.contact.toLowerCase().includes(q) ||
          String(c.zohoRecordId || "").toLowerCase().includes(q)
        );
      });
  }, [clients, query, statusFilter, sourceFilter, syncFilter]);

  const selected = useMemo(() => clients.find((c) => c.id === selectedId) || clients[0], [clients, selectedId]);

  const counts = useMemo(() => {
    const base = { All: clients.length, Active: 0, Paused: 0, Risk: 0, New: 0 };
    for (const c of clients) base[c.status] = (base[c.status] || 0) + 1;
    return base;
  }, [clients]);

  function upsertClient(next) {
    setClients((prev) => {
      const idx = prev.findIndex((x) => x.id === next.id);
      if (idx === -1) return [next, ...prev];
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  }

  function createManualClient() {
    const name = manualDraft.name.trim();
    const email = manualDraft.email.trim();
    if (!name || !email) {
      showToast("Name and email are required.");
      return;
    }

    const now = new Date().toISOString();
    const client = {
      id: makeId(),
      name,
      ref: makeRef(name),
      status: "New",
      mandates: 0,
      nextRun: "",
      outstanding: 0,
      updated: now,
      contact: email,
      phone: manualDraft.phone.trim() || "-",
      industry: manualDraft.industry.trim() || "-",
      risk: "Low",
      notes: manualDraft.notes.trim() || "Manual client created.",
      source: "Manual",
      syncStatus: zohoConnected ? "Pending" : "Pending",
      lastSync: "",
      zohoRecordId: "",
    };

    setClients((prev) => [client, ...prev]);
    setSelectedId(client.id);
    setManualOpen(false);
    setManualDraft({ name: "", email: "", phone: "", industry: "", notes: "" });
    showToast("Manual client created (UI only).");
  }

  function linkManualToZoho(duplicateZohoRecordId) {
    if (!selected) return;
    if (selected.source !== "Manual") return;

    const now = new Date().toISOString();
    const updated = {
      ...selected,
      source: "Zoho CRM",
      zohoRecordId: String(duplicateZohoRecordId || "5038291000000000000"),
      syncStatus: "Synced",
      lastSync: now,
      updated: now,
    };
    upsertClient(updated);
    showToast("Client linked to Zoho (UI only).");
  }

  function simulateZohoSync() {
    if (!zohoConnected) {
      showToast("Connect Zoho CRM first.");
      return;
    }

    const now = new Date().toISOString();
    setClients((prev) =>
      prev.map((c) => {
        if (c.source !== "Zoho CRM") return c;
        const nextState = c.syncStatus === "Synced" ? "Synced" : c.syncStatus;
        return { ...c, syncStatus: nextState, lastSync: now, updated: now };
      })
    );
    showToast("Zoho sync simulated (UI only).");
  }

  const topPrimary = zohoConnected ? "Sync from Zoho" : "Connect Zoho CRM";

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={styles.titleWrap}>
          <h1 style={styles.title}>Clients</h1>
          <p style={styles.subtitle}>
            Most clients are managed in Zoho CRM and synced into TabbyTech. Manual creation stays available for exceptions. UI-only for now, no backend actions.
          </p>
        </div>

        <div style={styles.actionsRow}>
          <button
            style={styles.btn("secondary")}
            type="button"
            onClick={() => showToast("Export placeholder (UI only).")}
            title="UI-only placeholder"
          >
            Export
          </button>

          <button
            style={styles.btn("secondary")}
            type="button"
            onClick={() => showToast("Import placeholder (UI only).")}
            title="UI-only placeholder"
          >
            Import
          </button>

          <button
            style={styles.btn("primary")}
            type="button"
            onClick={() => {
              if (zohoConnected) simulateZohoSync();
              else {
                setZohoConnected(true);
                showToast("Zoho CRM marked connected (UI only).");
              }
            }}
            title="UI-only placeholder"
          >
            <IconRefresh />
            {topPrimary}
          </button>

          <button
            style={styles.btn("secondary")}
            type="button"
            onClick={() => setManualOpen(true)}
            title="Manual creation is the exception"
          >
            <IconPlus />
            Add client manually
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={{ ...styles.glass, ...styles.tableWrap, minHeight: 0 }}>
          <div style={styles.panelHeader}>
            <div style={styles.panelHeaderLeft}>
              <p style={styles.panelTitle}>Client list</p>
              <p style={styles.panelMeta}>
                {filtered.length} shown · Zoho CRM:{" "}
                <span style={{ fontWeight: 900, color: "rgba(255,255,255,0.82)" }}>{zohoConnected ? "Connected" : "Not connected"}</span>
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                style={styles.btn("secondary")}
                type="button"
                onClick={() => {
                  setZohoConnected((p) => !p);
                  showToast(`Zoho CRM set to ${!zohoConnected ? "Connected" : "Not connected"} (UI only).`);
                }}
                title="UI-only toggle"
              >
                {zohoConnected ? "Disconnect Zoho" : "Connect Zoho"}
              </button>
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
                placeholder="Search by name, id, reference, email, or Zoho ID"
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

            <select style={styles.select} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} aria-label="Filter source">
              <option value="All">All sources</option>
              <option value="Zoho CRM">Zoho CRM</option>
              <option value="Manual">Manual</option>
            </select>

            <select style={styles.select} value={syncFilter} onChange={(e) => setSyncFilter(e.target.value)} aria-label="Filter sync status">
              <option value="All">All sync</option>
              <option value="Synced">Synced</option>
              <option value="Pending">Pending</option>
              <option value="Needs review">Needs review</option>
              <option value="Sync error">Sync error</option>
            </select>
          </div>

          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Client</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Source</th>
                  <th style={styles.th}>Sync</th>
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
                  const rowStyle = { ...styles.row(isActive), ...(isHover ? styles.rowHover : null) };

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

                      <td style={styles.td}>
                        <span style={styles.sourceBadge(c.source)}>{c.source}</span>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.syncBadge(c.syncStatus)}>{c.syncStatus}</span>
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
                    <td style={{ ...styles.td, padding: 20 }} colSpan={8}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.86)" }}>No clients found</div>
                        <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, lineHeight: 1.4 }}>
                          Try a different search term or adjust filters.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...styles.glass, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={styles.panelHeader}>
            <div style={styles.panelHeaderLeft}>
              <p style={styles.panelTitle}>Client details</p>
              <p style={styles.panelMeta}>Selection updates this panel</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                style={styles.btn("secondary")}
                type="button"
                onClick={() => {
                  if (!selected) return;
                  if (selected.source === "Zoho CRM") {
                    showToast("Zoho sourced fields are read-only (UI only).");
                    return;
                  }
                  showToast("Edit placeholder (UI only).");
                }}
                title="UI-only placeholder"
              >
                Edit
              </button>

              <button style={styles.btn("danger")} type="button" onClick={() => showToast("Disable placeholder (UI only).")} title="UI-only placeholder">
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

                {selected.source === "Manual" && zohoConnected && (
                  <div style={styles.section}>
                    <p style={styles.sectionTitle}>Sync guidance</p>
                    <p style={{ margin: "10px 0 0 0", color: "rgba(255,255,255,0.70)", fontSize: 13, lineHeight: 1.5 }}>
                      This client was created manually. If it exists in Zoho CRM, link it to reduce risk and prevent duplicates.
                    </p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                      <button
                        style={styles.btn("primary")}
                        type="button"
                        onClick={() => linkManualToZoho("5038291000000000000")}
                        title="UI-only placeholder"
                      >
                        Link to Zoho
                      </button>
                      <button style={styles.btn("secondary")} type="button" onClick={() => showToast("Marked as Keep separate (UI only).")}>
                        Keep separate
                      </button>
                    </div>
                  </div>
                )}

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

                    <div style={styles.k}>Source</div>
                    <div style={styles.v}>
                      <span style={styles.sourceBadge(selected.source)}>{selected.source}</span>
                    </div>

                    <div style={styles.k}>Sync status</div>
                    <div style={styles.v}>
                      <span style={styles.syncBadge(selected.syncStatus)}>{selected.syncStatus}</span>
                    </div>

                    <div style={styles.k}>Zoho Record ID</div>
                    <div style={styles.v}>{selected.zohoRecordId ? selected.zohoRecordId : <span style={styles.muted}>-</span>}</div>

                    <div style={styles.k}>Last sync</div>
                    <div style={styles.v}>{selected.lastSync ? formatDateTime(selected.lastSync) : <span style={styles.muted}>-</span>}</div>

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
                    <button style={styles.btn("secondary")} type="button" onClick={() => showToast("View debit orders (UI only).")}>
                      View debit orders
                    </button>
                    <button style={styles.btn("secondary")} type="button" onClick={() => showToast("View batches (UI only).")}>
                      View batches
                    </button>
                    <button style={styles.btn("primary")} type="button" onClick={() => showToast("Start onboarding (UI only).")}>
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

      {manualOpen && (
        <div style={styles.overlay} role="dialog" aria-modal="true" aria-label="Add client manually">
          <div style={styles.modal}>
            <div style={styles.modalHead}>
              <div>
                <p style={styles.modalTitle}>Add client manually</p>
                <div style={styles.modalHint}>
                  Manual creation is the exception. If a matching Zoho CRM record exists, linking later reduces risk and prevents duplicates.
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={styles.btn("secondary")} type="button" onClick={() => setManualOpen(false)}>
                  Close
                </button>
                <button style={styles.btn("primary")} type="button" onClick={createManualClient}>
                  Create
                </button>
              </div>
            </div>

            <div style={styles.modalBody}>
              {possibleDuplicate && (
                <div style={styles.banner}>
                  <div>
                    <p style={styles.bannerTitle}>Possible duplicate found in Zoho CRM</p>
                    <div style={styles.bannerText}>
                      Match: <b>{possibleDuplicate.name}</b> ({possibleDuplicate.contact}). You can still create this manually, but linking is recommended.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      style={styles.btn("primary")}
                      type="button"
                      onClick={() => {
                        // UI-only: auto create manual and then link immediately
                        const name = manualDraft.name.trim() || possibleDuplicate.name;
                        const email = manualDraft.email.trim() || possibleDuplicate.contact;
                        const now = new Date().toISOString();
                        const manual = {
                          id: makeId(),
                          name,
                          ref: makeRef(name),
                          status: "New",
                          mandates: 0,
                          nextRun: "",
                          outstanding: 0,
                          updated: now,
                          contact: email,
                          phone: manualDraft.phone.trim() || "-",
                          industry: manualDraft.industry.trim() || "-",
                          risk: "Low",
                          notes: manualDraft.notes.trim() || "Manual client created and linked.",
                          source: "Zoho CRM",
                          syncStatus: "Synced",
                          lastSync: now,
                          zohoRecordId: possibleDuplicate.zohoRecordId || "5038291000000000000",
                        };
                        setClients((prev) => [manual, ...prev]);
                        setSelectedId(manual.id);
                        setManualOpen(false);
                        setManualDraft({ name: "", email: "", phone: "", industry: "", notes: "" });
                        showToast("Created and linked to Zoho (UI only).");
                      }}
                    >
                      Link to Zoho
                    </button>
                    <button style={styles.btn("secondary")} type="button" onClick={() => showToast("You can keep it separate and link later.")}>
                      Keep separate
                    </button>
                  </div>
                </div>
              )}

              <div style={styles.modalGrid}>
                <div style={styles.field}>
                  <div style={styles.label}>Client name</div>
                  <input
                    style={styles.inputPlain}
                    value={manualDraft.name}
                    onChange={(e) => setManualDraft((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Example: Mokoena Interiors"
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>Email</div>
                  <input
                    style={styles.inputPlain}
                    value={manualDraft.email}
                    onChange={(e) => setManualDraft((p) => ({ ...p, email: e.target.value }))}
                    placeholder="Example: accounts@example.co.za"
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>Phone (optional)</div>
                  <input
                    style={styles.inputPlain}
                    value={manualDraft.phone}
                    onChange={(e) => setManualDraft((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="Example: 010 446 5754"
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>Industry (optional)</div>
                  <input
                    style={styles.inputPlain}
                    value={manualDraft.industry}
                    onChange={(e) => setManualDraft((p) => ({ ...p, industry: e.target.value }))}
                    placeholder="Example: Property"
                  />
                </div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Notes (optional)</div>
                <textarea
                  style={styles.textarea}
                  value={manualDraft.notes}
                  onChange={(e) => setManualDraft((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Add any operational notes for onboarding and risk context."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={styles.toastWrap}>
          <div style={styles.toast}>{toast}</div>
        </div>
      )}
    </div>
  );
}
