import React, { useEffect, useMemo, useState } from "react";
import { request } from "../api";

const TENANT_STATUSES = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Risk" },
];

const PLAN_OPTIONS = ["Starter", "Growth", "Enterprise"];

function safeStr(v) {
  return String(v == null ? "" : v).trim();
}

function formatDate(value) {
  const s = safeStr(value);
  if (!s) return "Not set";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function maskKey(key) {
  const s = safeStr(key);
  if (!s) return "Not set";
  if (s.length <= 8) return "••••••••";
  return `${s.slice(0, 4)}••••••••${s.slice(-4)}`;
}

function normalizeTenant(raw, index) {
  const safe = raw || {};
  const connections = safe.connections || {};
  const keys = safe.keys || {};
  const config = safe.config || {};

  return {
    id: safeStr(safe.id) || `tnt_${index}`,
    name: safeStr(safe.name) || "Unnamed tenant",
    owner: safeStr(safe.owner),
    email: safeStr(safe.email),
    domain: safeStr(safe.domain),
    status: safeStr(safe.status) || "active",
    plan: safeStr(safe.plan) || "Starter",
    notes: safeStr(safe.notes),
    password: "", // Always empty for editing unless user types a new one
    created: safeStr(safe.created),
    updated: safeStr(safe.updated),
    connections: {
      zohoCrm: {
        connected: !!connections.zohoCrm?.connected,
        lastTested: safeStr(connections.zohoCrm?.lastTested),
      },
      zohoBooks: {
        connected: !!connections.zohoBooks?.connected,
        lastTested: safeStr(connections.zohoBooks?.lastTested),
      },
      paystack: {
        connected: !!connections.paystack?.connected,
        lastTested: safeStr(connections.paystack?.lastTested),
      },
    },
    keys: {
      zohoCrmClientId: safeStr(keys.zohoCrmClientId),
      zohoCrmClientSecret: safeStr(keys.zohoCrmClientSecret),
      zohoCrmRefreshToken: safeStr(keys.zohoCrmRefreshToken),
      zohoBooksOrgId: safeStr(keys.zohoBooksOrgId),
      zohoBooksClientId: safeStr(keys.zohoBooksClientId),
      zohoBooksClientSecret: safeStr(keys.zohoBooksClientSecret),
      zohoBooksRefreshToken: safeStr(keys.zohoBooksRefreshToken),
      paystackSecretKey: safeStr(keys.paystackSecretKey),
      paystackPublicKey: safeStr(keys.paystackPublicKey),
    },
    config: {
      preferredAmounts: Array.isArray(config.preferredAmounts) ? config.preferredAmounts : [50, 100, 200, 500, 1000],
    },
  };
}

function emptyTenantDraft() {
  return {
    id: "",
    name: "",
    owner: "",
    email: "",
    domain: "",
    status: "active",
    plan: "Starter",
    notes: "",
    password: "",
    keys: {
      zohoCrmClientId: "",
      zohoCrmClientSecret: "",
      zohoCrmRefreshToken: "",
      zohoBooksOrgId: "",
      zohoBooksClientId: "",
      zohoBooksClientSecret: "",
      zohoBooksRefreshToken: "",
      paystackSecretKey: "",
      paystackPublicKey: "",
    },
    config: {
      preferredAmounts: [50, 100, 200, 500, 1000],
    }
  };
}

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [editDraft, setEditDraft] = useState(null);
  // New view state: "list" or "workspace"
  const [viewMode, setViewMode] = useState("list");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const resp = await request("/api/tenants", { method: "GET" });
        if (!active) return;
        const list = Array.isArray(resp?.data) ? resp.data : [];
        setTenants(list.map((t, i) => normalizeTenant(t, i)));
      } catch (e) {
        if (!active) return;
        setError(String(e?.message || e));
        setTenants([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    const by = { all: tenants.length, active: 0, inactive: 0, suspended: 0 };
    for (const t of tenants) {
      const s = t.status;
      if (s === "active") by.active += 1;
      else if (s === "inactive") by.inactive += 1;
      else if (s === "suspended") by.suspended += 1;
    }
    return by;
  }, [tenants]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return tenants.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [t.name, t.email, t.domain, t.id].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [tenants, searchQuery, statusFilter]);

  const selectedTenant = useMemo(() => {
    if (!selectedId) return null;
    return tenants.find((t) => t.id === selectedId) || null;
  }, [tenants, selectedId]);

  function handleSelectTenant(id) {
    setSelectedId(id);
    setViewMode("workspace");
  }

  function handleBackToList() {
    setViewMode("list");
  }

  function openAddModal() {
    setEditDraft(emptyTenantDraft());
  }

  function openEditModal(id) {
    const t = tenants.find((x) => x.id === id);
    if (!t) return;
    // Use normalizeTenant to ensure we have a complete, valid draft structure
    setEditDraft(normalizeTenant(t));
  }

  function closeModal() {
    setEditDraft(null);
  }

  function updateDraftField(key, value) {
    setEditDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateDraftKey(key, value) {
    setEditDraft((prev) =>
      prev ? { ...prev, keys: { ...prev.keys, [key]: value } } : prev
    );
  }

  function updateDraftConfig(key, value) {
    setEditDraft((prev) =>
      prev ? { ...prev, config: { ...prev.config, [key]: value } } : prev
    );
  }

  async function saveTenantDraft() {
    if (!editDraft) return;
    const isNew = !editDraft.id;
    const payload = { ...editDraft };

    try {
      const path = isNew
        ? "/api/tenants"
        : `/api/tenants/${encodeURIComponent(editDraft.id)}`;
      const method = isNew ? "POST" : "PUT";

      const resp = await request(path, {
        method,
        body: JSON.stringify(payload),
      });

      const saved = resp?.data ? normalizeTenant(resp.data, tenants.length) : null;

      setTenants((prev) => {
        if (isNew && saved) return [saved, ...prev];
        if (!isNew && saved) {
          return prev.map((t) => (t.id === saved.id ? saved : t));
        }
        return prev;
      });

      if (saved) setSelectedId(saved.id);
      closeModal();
    } catch (e) {
      alert(`Failed to save tenant: ${String(e?.message || e)}`);
    }
  }

  async function deleteTenant(id) {
    const t = tenants.find((x) => x.id === id);
    if (!t) return;
    if (!window.confirm(`Delete ${t.name}? This cannot be undone.`)) return;

    try {
      await request(`/api/tenants/${encodeURIComponent(id)}`, { method: "DELETE" });
      setTenants((prev) => prev.filter((x) => x.id !== id));
      if (selectedId === id) setSelectedId("");
      if (viewMode === "workspace") setViewMode("list");
    } catch (e) {
      alert(`Failed to delete tenant: ${String(e?.message || e)}`);
    }
  }

  const [testingService, setTestingService] = useState("");

  async function testConnection(tenantId, service) {
    if (testingService) return;
    setTestingService(service);
    try {
      const resp = await request(
        `/api/tenants/${encodeURIComponent(tenantId)}/test-connection`,
        {
          method: "POST",
          body: JSON.stringify({ service }),
        }
      );

      const connected = !!resp?.connected;
      const lastTested = safeStr(resp?.lastTested) || new Date().toISOString();

      setTenants((prev) =>
        prev.map((t) => {
          if (t.id !== tenantId) return t;
          const connections = { ...t.connections };
          if (service === "crm") connections.zohoCrm = { connected, lastTested };
          if (service === "books") connections.zohoBooks = { connected, lastTested };
          if (service === "paystack") connections.paystack = { connected, lastTested };
          return { ...t, connections };
        })
      );
    } catch (e) {
      alert(`Connection test failed: ${String(e?.message || e)}`);
    } finally {
      setTestingService("");
    }
  }

  return (
    <div className="tt-tenants">
      <style>{`
        .tt-tenants {
          color: #e5e7eb;
          font-family: 'Inter', 'Montserrat', system-ui, sans-serif;
          padding: 4px 4px 24px;
        }
        .tt-tenants-head {
          margin-bottom: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .tt-tenants-h1 {
          margin: 0 0 4px 0;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.3px;
          background: linear-gradient(135deg, #fff 0%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .tt-tenants-sub {
          margin: 0;
          font-size: 13px;
          color: rgba(148,163,184,.95);
        }
        .tt-tenants-actionsbar {
          display: flex;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }
        .tt-tenants-search {
          flex: 1 1 260px;
          max-width: 420px;
          position: relative;
        }
        .tt-tenants-search input {
          width: 100%;
          height: 40px;
          background: rgba(15, 23, 42, .70);
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 12px;
          padding: 0 14px;
          color: #e5e7eb;
          font-size: 14px;
          font-family: inherit;
          outline: none;
        }
        .tt-tenants-search input:focus {
          border-color: rgba(168,85,247,0.65);
          box-shadow: 0 0 0 3px rgba(124,58,237,.18);
        }
        .tt-tenants-filters {
          display: flex;
          gap: 8px;
        }
        .tt-tenants-filter {
          height: 36px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(15, 23, 42, .70);
          color: rgba(226,232,240,.9);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .tt-tenants-filter.is-active {
          background: linear-gradient(135deg, rgba(168,85,247,.95), rgba(124,58,237,.95));
          border-color: transparent;
          color: #fff;
          box-shadow: 0 6px 18px rgba(124,58,237,.30);
        }
        .tt-tenants-filter .count {
          background: rgba(255,255,255,.16);
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11px;
        }
        .tt-tenants-addbtn {
          height: 40px;
          padding: 0 18px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(168,85,247,.98), rgba(124,58,237,.98));
          color: #fff;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(124,58,237,.28);
        }
        .tt-tenants-card {
          background: rgba(15, 23, 42, .55);
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 16px;
          overflow: hidden;
        }
        .tt-tenants-cardhead {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .tt-tenants-cardhead h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
        }
        .tt-tenants-list .row {
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,.05);
          display: grid;
          grid-template-columns: 2fr 1fr 1.4fr 1fr 90px;
          gap: 14px;
          align-items: center;
          cursor: pointer;
          transition: background 120ms ease;
        }
        .tt-tenants-list .row:hover { background: rgba(255,255,255,.03); }
        .tt-tenants-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(168,85,247,.95), rgba(124,58,237,.95));
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #fff;
        }
        .tt-tenants-name {
          font-weight: 700;
          font-size: 14px;
        }
        .tt-tenants-meta {
          font-size: 12px;
          color: rgba(148,163,184,.85);
        }
        .tt-tenants-badge {
          display: inline-flex;
          padding: 3px 10px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 700;
          text-transform: capitalize;
        }
        .tt-tenants-badge.active {
          background: rgba(16,185,129,.12);
          color: #34d399;
          border: 1px solid rgba(16,185,129,.28);
        }
        .tt-tenants-badge.inactive {
          background: rgba(239,68,68,.10);
          color: #f87171;
          border: 1px solid rgba(239,68,68,.28);
        }
        .tt-tenants-badge.suspended {
          background: rgba(245,158,11,.10);
          color: #fbbf24;
          border: 1px solid rgba(245,158,11,.28);
        }
        .tt-tenants-connections {
          display: flex;
          gap: 8px;
        }
        .tt-tenants-dot {
          width: 24px;
          height: 24px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        }
        .tt-tenants-dot.connected {
          background: rgba(16,185,129,.12);
          color: #34d399;
          border: 1px solid rgba(16,185,129,.28);
        }
        .tt-tenants-dot.disconnected {
          background: rgba(239,68,68,.10);
          color: #f87171;
          border: 1px solid rgba(239,68,68,.28);
        }
        .tt-tenants-iconbtn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,.08);
          background: transparent;
          color: rgba(148,163,184,.9);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
        .tt-tenants-iconbtn:hover {
          border-color: rgba(168,85,247,.55);
          color: #ede9fe;
        }
        .tt-tenants-empty {
          padding: 48px 24px;
          text-align: center;
          color: rgba(148,163,184,.85);
        }

        /* Workspace Styles */
        .tt-workspace {
          animation: ttFadeIn 0.3s ease-out;
        }
        @keyframes ttFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tt-ws-nav {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .tt-ws-back {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          padding: 8px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }
        .tt-ws-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
        }
        @media (max-width: 1000px) {
          .tt-ws-grid { grid-template-columns: 1fr; }
        }
        .tt-ws-section {
          background: rgba(15, 23, 42, .40);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 20px;
        }
        .tt-ws-title {
          font-size: 16px;
          font-weight: 800;
          margin-bottom: 18px;
          color: #a855f7;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .tt-ws-kvgrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        .tt-ws-kv {
          background: rgba(255,255,255,0.03);
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .tt-ws-kv label {
          display: block;
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .tt-ws-kv .value {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
        }
        .tt-ws-stack {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        @media (max-width: 600px) {
          .tt-ws-stack { grid-template-columns: 1fr; }
        }
        .tt-ws-service {
          background: rgba(15, 23, 42, .6);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 16px;
          padding: 16px;
          text-align: center;
        }
        .tt-ws-service.connected { border-color: rgba(34,197,94,0.3); }
        .tt-ws-service .name { font-weight: 800; font-size: 14px; margin-bottom: 8px; }
        .tt-ws-service .status {
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 20px;
          display: inline-block;
          margin-bottom: 12px;
        }
        .tt-ws-service .status.good { background: rgba(34,197,94,0.15); color: #4ade80; }
        .tt-ws-service .status.bad { background: rgba(239,68,68,0.15); color: #f87171; }
        .tt-ws-service .status.loading { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); animation: ttPulse 1.5s infinite; }
        @keyframes ttPulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        .tt-ws-testbtn {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }
        .tt-ws-testbtn:disabled { opacity: 0.5; cursor: not-allowed; }

        .tt-tenants-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(2,6,23,.72);
          backdrop-filter: blur(6px);
          display: grid;
          place-items: center;
          z-index: 100;
          padding: 20px;
        }
        .tt-tenants-modal {
          width: 100%;
          max-width: 620px;
          max-height: 90vh;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(18,12,36,.98) 0%, rgba(11,10,22,.98) 100%);
          border: 1px solid rgba(168,85,247,.30);
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 30px 80px rgba(0,0,0,.5);
        }
        .tt-tenants-modal .head {
          padding: 18px 22px;
          border-bottom: 1px solid rgba(255,255,255,.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .tt-tenants-modal .body {
          padding: 18px 22px;
          overflow-y: auto;
          flex: 1;
        }
        .tt-tenants-modal .foot {
          padding: 14px 22px;
          border-top: 1px solid rgba(255,255,255,.06);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .tt-tenants-field { margin-bottom: 14px; }
        .tt-tenants-field label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: rgba(148,163,184,.95);
          margin-bottom: 6px;
        }
        .tt-tenants-field input,
        .tt-tenants-field select,
        .tt-tenants-field textarea {
          width: 100%;
          background: rgba(15,23,42,.70);
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 10px;
          padding: 10px 12px;
          color: #e5e7eb;
          font-size: 13px;
          font-family: inherit;
          outline: none;
        }
        .tt-tenants-field textarea { min-height: 72px; resize: vertical; }
        .tt-tenants-formgrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .tt-tenants-btn {
          height: 38px;
          padding: 0 18px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .tt-tenants-btn.primary {
          border: 0;
          background: linear-gradient(135deg, rgba(168,85,247,.98), rgba(124,58,237,.98));
          color: #fff;
        }
        .tt-tenants-btn.secondary {
          border: 1px solid rgba(255,255,255,.10);
          background: transparent;
          color: rgba(226,232,240,.9);
        }
      `}</style>

      {viewMode === "list" ? (
        <>
          <div className="tt-tenants-head">
            <div>
              <h2 className="tt-tenants-h1">Tenants</h2>
              <p className="tt-tenants-sub">Manage TabbyPay service tenants and their API connections.</p>
            </div>
            <button type="button" className="tt-tenants-addbtn" onClick={openAddModal}>
              + Add Tenant
            </button>
          </div>

          <div className="tt-tenants-actionsbar">
            <div className="tt-tenants-search">
              <input
                type="text"
                placeholder="Search by name, email, domain or tenant ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="tt-tenants-filters">
              {TENANT_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`tt-tenants-filter ${statusFilter === s.value ? "is-active" : ""}`}
                  onClick={() => setStatusFilter(s.value)}
                >
                  {s.label}
                  <span className="count">{counts[s.value] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="tt-tenants-card">
            <div className="tt-tenants-cardhead">
              <h3>Tenant List ({loading ? "Loading..." : filtered.length})</h3>
            </div>

            <div className="tt-tenants-list">
              {error ? (
                <div className="tt-tenants-empty">Failed to load tenants: {error}</div>
              ) : filtered.length === 0 ? (
                <div className="tt-tenants-empty">
                  {loading ? "Loading..." : "No tenants found. Use Add Tenant to create one."}
                </div>
              ) : (
                filtered.map((t) => (
                  <div
                    key={t.id}
                    className="row"
                    onClick={() => handleSelectTenant(t.id)}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div className="tt-tenants-avatar">{(t.name || "?")[0]}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="tt-tenants-name">{t.name}</div>
                        <div className="tt-tenants-meta">{t.id} • {t.domain || "no domain"}</div>
                      </div>
                    </div>

                    <div>
                      <span className={`tt-tenants-badge ${t.status}`}>{t.status}</span>
                    </div>

                    <div className="tt-tenants-connections">
                      <div className={`tt-tenants-dot ${t.connections.zohoCrm.connected ? "connected" : "disconnected"}`} title="Zoho CRM">C</div>
                      <div className={`tt-tenants-dot ${t.connections.zohoBooks.connected ? "connected" : "disconnected"}`} title="Zoho Books">B</div>
                      <div className={`tt-tenants-dot ${t.connections.paystack.connected ? "connected" : "disconnected"}`} title="Paystack">P</div>
                    </div>

                    <div className="tt-tenants-meta">{t.plan}</div>

                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="tt-tenants-iconbtn" title="Edit" onClick={() => openEditModal(t.id)}>✎</button>
                      <button type="button" className="tt-tenants-iconbtn" title="Delete" onClick={() => deleteTenant(t.id)}>🗑</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="tt-workspace">
          <div className="tt-ws-nav">
            <button className="tt-ws-back" onClick={handleBackToList}>← Back to list</button>
            <h2 className="tt-tenants-h1" style={{ margin: 0 }}>{selectedTenant?.name}</h2>
            <span className={`tt-tenants-badge ${selectedTenant?.status}`} style={{ height: 'fit-content' }}>{selectedTenant?.status}</span>
          </div>

          <div className="tt-ws-grid">
            <div className="tt-ws-main">
              <div className="tt-ws-section">
                <div className="tt-ws-title">🛡️ Connected Services</div>
                <div className="tt-ws-stack">
                  <ServiceBlock 
                    name="Zoho CRM" 
                    connected={selectedTenant?.connections.zohoCrm.connected} 
                    lastTested={selectedTenant?.connections.zohoCrm.lastTested}
                    onTest={() => testConnection(selectedTenant?.id, 'crm')}
                    loading={testingService === 'crm'}
                  />
                  <ServiceBlock 
                    name="Zoho Books" 
                    connected={selectedTenant?.connections.zohoBooks.connected} 
                    lastTested={selectedTenant?.connections.zohoBooks.lastTested}
                    onTest={() => testConnection(selectedTenant?.id, 'books')}
                    loading={testingService === 'books'}
                  />
                  <ServiceBlock 
                    name="Paystack" 
                    connected={selectedTenant?.connections.paystack.connected} 
                    lastTested={selectedTenant?.connections.paystack.lastTested}
                    onTest={() => testConnection(selectedTenant?.id, 'paystack')}
                    loading={testingService === 'paystack'}
                  />
                </div>
              </div>

              <div className="tt-ws-section">
                <div className="tt-ws-title">📑 Tenant Profile</div>
                <div className="tt-ws-kvgrid">
                  <KeyValue label="Full Name" value={selectedTenant?.name} />
                  <KeyValue label="Owner" value={selectedTenant?.owner} />
                  <KeyValue label="Email Address" value={selectedTenant?.email} />
                  <KeyValue label="Domain" value={selectedTenant?.domain} />
                  <KeyValue label="Subscription Plan" value={selectedTenant?.plan} />
                  <KeyValue label="Account Status" value={selectedTenant?.status} />
                  <KeyValue label="Created On" value={formatDate(selectedTenant?.created)} />
                  <KeyValue label="Last Updated" value={formatDate(selectedTenant?.updated)} />
                </div>
              </div>

              {selectedTenant?.notes && (
                <div className="tt-ws-section">
                  <div className="tt-ws-title">📝 Operational Notes</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: 1.6 }}>{selectedTenant?.notes}</div>
                </div>
              )}
            </div>

            <div className="tt-ws-sidebar">
              <div className="tt-ws-section">
                <div className="tt-ws-title">⚙️ Actions</div>
                <button 
                  className="tt-tenants-btn primary" 
                  style={{ width: '100%', marginBottom: 10 }}
                  onClick={() => openEditModal(selectedTenant?.id)}
                >
                  Edit Configuration
                </button>
                <button 
                  className="tt-tenants-btn secondary" 
                  style={{ width: '100%', color: '#f87171' }}
                  onClick={() => deleteTenant(selectedTenant?.id)}
                >
                  Delete Tenant
                </button>
              </div>

              <div className="tt-ws-section">
                <div className="tt-ws-title">💡 Quick Settings</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  Use the Edit button above to update API keys, Change plans, or modify preferred debit order amounts for this tenant.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editDraft ? (
        <div className="tt-tenants-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="tt-tenants-modal">
            <div className="head">
              <h2>{editDraft.id ? "Edit Configuration" : "Add New Tenant"}</h2>
              <button type="button" className="tt-tenants-iconbtn" onClick={closeModal}>×</button>
            </div>
            <div className="body">
              <div className="tt-tenants-formgrid">
                <div className="tt-tenants-field">
                  <label>Tenant name</label>
                  <input value={editDraft.name} onChange={(e) => updateDraftField("name", e.target.value)} />
                </div>
                <div className="tt-tenants-field">
                  <label>Owner</label>
                  <input value={editDraft.owner} onChange={(e) => updateDraftField("owner", e.target.value)} />
                </div>
                <div className="tt-tenants-field">
                  <label>Primary email</label>
                  <input value={editDraft.email} onChange={(e) => updateDraftField("email", e.target.value)} />
                </div>
                <div className="tt-tenants-field">
                  <label>Domain</label>
                  <input value={editDraft.domain} onChange={(e) => updateDraftField("domain", e.target.value)} />
                </div>
                <div className="tt-tenants-field">
                  <label>Login Password</label>
                  <input type="password" placeholder="Leave blank to keep current..." value={editDraft.password} onChange={(e) => updateDraftField("password", e.target.value)} />
                </div>
                <div className="tt-tenants-field">
                  <label>Status</label>
                  <select value={editDraft.status} onChange={(e) => updateDraftField("status", e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 20, padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#a855f7", marginBottom: 12 }}>API Keys (3 Stacks)</div>
                <div className="tt-tenants-formgrid">
                  <div className="tt-tenants-field">
                    <label>CRM Client ID</label>
                    <input type="password" placeholder={editDraft.keys.zohoCrmClientId ? "••••••••" : "Not set"} value={editDraft.keys.zohoCrmClientId} onChange={(e) => updateDraftKey("zohoCrmClientId", e.target.value)} />
                  </div>
                  <div className="tt-tenants-field">
                    <label>CRM Secret</label>
                    <input type="password" placeholder={editDraft.keys.zohoCrmClientSecret ? "••••••••" : "Not set"} value={editDraft.keys.zohoCrmClientSecret} onChange={(e) => updateDraftKey("zohoCrmClientSecret", e.target.value)} />
                  </div>
                  <div className="tt-tenants-field">
                    <label>CRM Refresh Token</label>
                    <input type="password" placeholder={editDraft.keys.zohoCrmRefreshToken ? "••••••••" : "Not set"} value={editDraft.keys.zohoCrmRefreshToken} onChange={(e) => updateDraftKey("zohoCrmRefreshToken", e.target.value)} />
                  </div>
                  <div className="tt-tenants-field">
                    <label>Books Org ID</label>
                    <input type="password" placeholder={editDraft.keys.zohoBooksOrgId ? "••••••••" : "Not set"} value={editDraft.keys.zohoBooksOrgId} onChange={(e) => updateDraftKey("zohoBooksOrgId", e.target.value)} />
                  </div>
                  <div className="tt-tenants-field">
                    <label>Books Client ID</label>
                    <input type="password" placeholder={editDraft.keys.zohoBooksClientId ? "••••••••" : "Not set"} value={editDraft.keys.zohoBooksClientId} onChange={(e) => updateDraftKey("zohoBooksClientId", e.target.value)} />
                  </div>
                  <div className="tt-tenants-field">
                    <label>Books Secret</label>
                    <input type="password" placeholder={editDraft.keys.zohoBooksClientSecret ? "••••••••" : "Not set"} value={editDraft.keys.zohoBooksClientSecret} onChange={(e) => updateDraftKey("zohoBooksClientSecret", e.target.value)} />
                  </div>
                  <div className="tt-tenants-field">
                    <label>Books Refresh Token</label>
                    <input type="password" placeholder={editDraft.keys.zohoBooksRefreshToken ? "••••••••" : "Not set"} value={editDraft.keys.zohoBooksRefreshToken} onChange={(e) => updateDraftKey("zohoBooksRefreshToken", e.target.value)} />
                  </div>
                  <div className="tt-tenants-field">
                    <label>Paystack Secret</label>
                    <input type="password" placeholder={editDraft.keys.paystackSecretKey ? "••••••••" : "Not set"} value={editDraft.keys.paystackSecretKey} onChange={(e) => updateDraftKey("paystackSecretKey", e.target.value)} />
                  </div>
                  <div className="tt-tenants-field">
                    <label>Paystack Public</label>
                    <input type="password" placeholder={editDraft.keys.paystackPublicKey ? "••••••••" : "Not set"} value={editDraft.keys.paystackPublicKey} onChange={(e) => updateDraftKey("paystackPublicKey", e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <div className="tt-tenants-field">
                  <label>Preferred Amounts (comma separated)</label>
                  <input placeholder="e.g. 50, 100, 200" value={(editDraft.config?.preferredAmounts || []).join(", ")} onChange={(e) => {
                    const val = e.target.value.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n));
                    updateDraftConfig("preferredAmounts", val);
                  }} />
                </div>
                <div className="tt-tenants-field">
                  <label>Notes</label>
                  <textarea value={editDraft.notes} onChange={(e) => updateDraftField("notes", e.target.value)} />
                </div>
              </div>
            </div>
            <div className="foot">
              <button type="button" className="tt-tenants-btn secondary" onClick={closeModal}>Cancel</button>
              <button type="button" className="tt-tenants-btn primary" onClick={saveTenantDraft}>Save changes</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function KeyValue({ label, value }) {
  return (
    <div className="tt-ws-kv">
      <label>{label}</label>
      <div className="value">{value || "—"}</div>
    </div>
  );
}

function ServiceBlock({ name, connected, lastTested, onTest, loading }) {
  return (
    <div className={`tt-ws-service ${connected ? 'connected' : ''}`}>
      <div className="name">{name}</div>
      <div className={`status ${loading ? 'loading' : (connected ? 'good' : 'bad')}`}>
        {loading ? 'TESTING...' : (connected ? 'CONNECTED' : 'DISCONNECTED')}
      </div>
      <button className="tt-ws-testbtn" onClick={onTest} disabled={loading}>
        {loading ? 'Wait...' : 'Test Sync'}
      </button>
      {lastTested && <div style={{ fontSize: '10px', marginTop: 8, opacity: 0.6 }}>Last: {formatDate(lastTested)}</div>}
    </div>
  );
}

