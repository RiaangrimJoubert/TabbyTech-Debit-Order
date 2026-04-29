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

  return {
    id: safeStr(safe.id) || `tnt_${index}`,
    name: safeStr(safe.name) || "Unnamed tenant",
    owner: safeStr(safe.owner),
    email: safeStr(safe.email),
    domain: safeStr(safe.domain),
    status: safeStr(safe.status) || "active",
    plan: safeStr(safe.plan) || "Starter",
    notes: safeStr(safe.notes),
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
      paystackSecretKey: safeStr(keys.paystackSecretKey),
      paystackPublicKey: safeStr(keys.paystackPublicKey),
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

  function openAddModal() {
    setEditDraft(emptyTenantDraft());
  }

  function openEditModal(id) {
    const t = tenants.find((x) => x.id === id);
    if (!t) return;
    setEditDraft({
      id: t.id,
      name: t.name,
      owner: t.owner,
      email: t.email,
      domain: t.domain,
      status: t.status,
      plan: t.plan,
      notes: t.notes,
      password: t.password || "",
      keys: { ...t.keys },
      config: { ...t.config },
    });
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
    } catch (e) {
      alert(`Failed to delete tenant: ${String(e?.message || e)}`);
    }
  }

  async function testConnection(tenantId, service) {
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
        .tt-tenants-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 1200px) {
          .tt-tenants-grid { grid-template-columns: 1fr; }
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
        .tt-tenants-cardhead .sub {
          margin: 2px 0 0 0;
          font-size: 12px;
          color: rgba(148,163,184,.85);
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
        .tt-tenants-list .row.is-selected {
          background: linear-gradient(90deg, rgba(139,92,246,.10), transparent);
          border-left: 3px solid rgba(168,85,247,.85);
        }
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
        .tt-tenants-details .section {
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .tt-tenants-details .section:last-child { border-bottom: 0; }
        .tt-tenants-details .sectiontitle {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgba(148,163,184,.9);
          margin-bottom: 10px;
        }
        .tt-tenants-details .row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,.05);
          font-size: 13px;
        }
        .tt-tenants-details .row:last-child { border-bottom: 0; }
        .tt-tenants-details .label { color: rgba(148,163,184,.9); }
        .tt-tenants-details .value { font-weight: 700; }
        .tt-tenants-conncard {
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 10px;
          background: rgba(15,23,42,.50);
        }
        .tt-tenants-conncard:last-child { margin-bottom: 0; }
        .tt-tenants-conncard .head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .tt-tenants-conncard .title {
          font-weight: 700;
          font-size: 13px;
        }
        .tt-tenants-conncard .status {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .tt-tenants-conncard .status.connected {
          background: rgba(16,185,129,.12);
          color: #34d399;
        }
        .tt-tenants-conncard .status.disconnected {
          background: rgba(239,68,68,.10);
          color: #f87171;
        }
        .tt-tenants-conncard .detail {
          font-size: 11px;
          color: rgba(148,163,184,.85);
          line-height: 1.5;
        }
        .tt-tenants-testbtn {
          margin-top: 10px;
          width: 100%;
          height: 32px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(2,6,23,.55);
          color: rgba(226,232,240,.9);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .tt-tenants-testbtn:hover {
          border-color: rgba(168,85,247,.55);
          color: #ede9fe;
        }
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
        .tt-tenants-modal .head h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
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
        .tt-tenants-field {
          margin-bottom: 14px;
        }
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
        @media (max-width: 640px) {
          .tt-tenants-formgrid { grid-template-columns: 1fr; }
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

      <div className="tt-tenants-head">
        <h2 className="tt-tenants-h1">Tenants</h2>
        <p className="tt-tenants-sub">Manage TabbyPay service tenants and their API connections.</p>
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

        <button type="button" className="tt-tenants-addbtn" onClick={openAddModal}>
          + Add Tenant
        </button>
      </div>

      <div className="tt-tenants-grid">
        <div className="tt-tenants-card">
          <div className="tt-tenants-cardhead">
            <div>
              <h3>Tenant List</h3>
              <div className="sub">
                {loading ? "Loading tenants..." : `${filtered.length} total`}
              </div>
            </div>
          </div>

          <div className="tt-tenants-list">
            {error ? (
              <div className="tt-tenants-empty">Failed to load tenants: {error}</div>
            ) : filtered.length === 0 ? (
              <div className="tt-tenants-empty">
                {loading ? "Loading..." : "No tenants found. Use Add Tenant to create one."}
              </div>
            ) : (
              filtered.map((t) => {
                const isSelected = selectedId === t.id;
                return (
                  <div
                    key={t.id}
                    className={`row ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div className="tt-tenants-avatar">{(t.name || "?")[0]}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="tt-tenants-name">{t.name}</div>
                        <div className="tt-tenants-meta">
                          {t.id} • {t.domain || "no domain"}
                        </div>
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
                );
              })
            )}
          </div>
        </div>

        <div className="tt-tenants-card tt-tenants-details">
          <div className="tt-tenants-cardhead">
            <div>
              <h3>Tenant Details</h3>
              <div className="sub">
                {selectedTenant ? selectedTenant.name : "Select a tenant to view details"}
              </div>
            </div>
          </div>

          {!selectedTenant ? (
            <div className="tt-tenants-empty">No tenant selected.</div>
          ) : (
            <>
              <div className="section">
                <div className="sectiontitle">Profile</div>
                <div className="row">
                  <span className="label">Tenant</span>
                  <span className="value">{selectedTenant.name}</span>
                </div>
                <div className="row">
                  <span className="label">Owner</span>
                  <span className="value">{selectedTenant.owner || "Not set"}</span>
                </div>
                <div className="row">
                  <span className="label">Email</span>
                  <span className="value">{selectedTenant.email || "Not set"}</span>
                </div>
                <div className="row">
                  <span className="label">Domain</span>
                  <span className="value">{selectedTenant.domain || "Not set"}</span>
                </div>
                <div className="row">
                  <span className="label">Password</span>
                  <span className="value">{selectedTenant.password ? "••••••••" : "Not set"}</span>
                </div>
                <div className="row">
                  <span className="label">Plan</span>
                  <span className="value">{selectedTenant.plan}</span>
                </div>
                <div className="row">
                  <span className="label">Created</span>
                  <span className="value">{formatDate(selectedTenant.created)}</span>
                </div>
              </div>

              <div className="section">
                <div className="sectiontitle">Control Center</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    type="button" 
                    className="tt-tenants-btn secondary"
                    style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onClick={() => openEditModal(selectedTenant.id)}
                  >
                    ⚙️ Settings
                  </button>
                  <button 
                    type="button" 
                    className="tt-tenants-btn primary"
                    style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onClick={() => openEditModal(selectedTenant.id)}
                  >
                    💳 Configure
                  </button>
                </div>
              </div>

              <div className="section">
                <div className="sectiontitle">Connections (Live Status)</div>
                
                <div className="tt-tenants-conncard">
                  <div className="head">
                    <span className="title">Zoho CRM</span>
                    <span className={`status ${selectedTenant.connections.zohoCrm.connected ? 'connected' : 'disconnected'}`}>
                      {selectedTenant.connections.zohoCrm.connected ? 'ACTIVE' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="detail">
                    {selectedTenant.connections.zohoCrm.lastTested ? `Last check: ${formatDate(selectedTenant.connections.zohoCrm.lastTested)}` : 'Never tested'}
                  </div>
                  <button className="tt-tenants-testbtn" onClick={() => testConnection(selectedTenant.id, 'crm')}>Verify CRM Sync</button>
                </div>

                <div className="tt-tenants-conncard">
                  <div className="head">
                    <span className="title">Zoho Books</span>
                    <span className={`status ${selectedTenant.connections.zohoBooks.connected ? 'connected' : 'disconnected'}`}>
                      {selectedTenant.connections.zohoBooks.connected ? 'ACTIVE' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="detail">
                    {selectedTenant.connections.zohoBooks.lastTested ? `Last check: ${formatDate(selectedTenant.connections.zohoBooks.lastTested)}` : 'Never tested'}
                  </div>
                  <button className="tt-tenants-testbtn" onClick={() => testConnection(selectedTenant.id, 'books')}>Verify Books Sync</button>
                </div>

                <div className="tt-tenants-conncard">
                  <div className="head">
                    <span className="title">Paystack Gateway</span>
                    <span className={`status ${selectedTenant.connections.paystack.connected ? 'connected' : 'disconnected'}`}>
                      {selectedTenant.connections.paystack.connected ? 'ACTIVE' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="detail">
                    {selectedTenant.connections.paystack.lastTested ? `Last check: ${formatDate(selectedTenant.connections.paystack.lastTested)}` : 'Never tested'}
                  </div>
                  <button className="tt-tenants-testbtn" onClick={() => testConnection(selectedTenant.id, 'paystack')}>Verify Payment Flow</button>
                </div>
              </div>

              {selectedTenant.notes ? (
                <div className="section">
                  <div className="sectiontitle">Notes</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(226,232,240,.85)" }}>
                    {selectedTenant.notes}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {editDraft ? (
        <div className="tt-tenants-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="tt-tenants-modal" role="dialog" aria-modal="true">
            <div className="head">
              <h2>{editDraft.id ? "Edit Tenant" : "Add Tenant"}</h2>
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
                  <input type="password" placeholder="Set password for tenant login..." value={editDraft.password} onChange={(e) => updateDraftField("password", e.target.value)} />
                </div>
                <div className="tt-tenants-field">
                  <label>Status</label>
                  <select value={editDraft.status} onChange={(e) => updateDraftField("status", e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="tt-tenants-field">
                  <label>Plan</label>
                  <select value={editDraft.plan} onChange={(e) => updateDraftField("plan", e.target.value)}>
                    {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(148,163,184,.9)", marginBottom: 10 }}>
                  API Connections
                </div>

                <div className="tt-tenants-formgrid">
                  <div className="tt-tenants-field">
                    <label>Zoho CRM Client ID</label>
                    <input type="password" value={editDraft.keys.zohoCrmClientId} onChange={(e) => updateDraftKey("zohoCrmClientId", e.target.value)} />
                  </div>
                  <div className="tt-tenants-field">
                    <label>Zoho CRM Client Secret</label>
                    <input type="password" value={editDraft.keys.zohoCrmClientSecret} onChange={(e) => updateDraftKey("zohoCrmClientSecret", e.target.value)} />
                  </div>
                  <div className="tt-tenants-field">
                    <label>Zoho CRM Refresh Token</label>
                    <input type="password" value={editDraft.keys.zohoCrmRefreshToken} onChange={(e) => updateDraftKey("zohoCrmRefreshToken", e.target.value)} />
                  </div>
                  <div className="tt-tenants-field">
                    <label>Zoho Books Org ID</label>
                    <input type="password" value={editDraft.keys.zohoBooksOrgId} onChange={(e) => updateDraftKey("zohoBooksOrgId", e.target.value)} />
                  </div>
                  <div className="tt-tenants-field">
                    <label>Zoho Books Client ID</label>
                    <input type="password" value={editDraft.keys.zohoBooksClientId} onChange={(e) => updateDraftKey("zohoBooksClientId", e.target.value)} />
                  </div>
                  <div className="tt-tenants-field">
                    <label>Zoho Books Client Secret</label>
                    <input type="password" value={editDraft.keys.zohoBooksClientSecret} onChange={(e) => updateDraftKey("zohoBooksClientSecret", e.target.value)} />
                  </div>
                  <div className="tt-tenants-field">
                    <label>Paystack Secret Key</label>
                    <input type="password" value={editDraft.keys.paystackSecretKey} onChange={(e) => updateDraftKey("paystackSecretKey", e.target.value)} />
                  </div>
                  <div className="tt-tenants-field">
                    <label>Paystack Public Key</label>
                    <input type="password" value={editDraft.keys.paystackPublicKey} onChange={(e) => updateDraftKey("paystackPublicKey", e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(148,163,184,.9)", marginBottom: 10 }}>
                  Debit Order Configuration
                </div>
                <div className="tt-tenants-field">
                  <label>Preferred Amounts (comma separated)</label>
                  <input 
                    placeholder="e.g. 50, 100, 200, 500" 
                    value={(editDraft.config?.preferredAmounts || []).join(", ")} 
                    onChange={(e) => {
                      const val = e.target.value.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n));
                      updateDraftConfig("preferredAmounts", val);
                    }} 
                  />
                </div>
              </div>

              <div className="tt-tenants-field" style={{ marginTop: 10 }}>
                <label>Internal notes</label>
                <textarea value={editDraft.notes} onChange={(e) => updateDraftField("notes", e.target.value)} />
              </div>
            </div>
            <div className="foot">
              <button type="button" className="tt-tenants-btn secondary" onClick={closeModal}>Cancel</button>
              <button type="button" className="tt-tenants-btn primary" onClick={saveTenantDraft}>Save tenant</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
