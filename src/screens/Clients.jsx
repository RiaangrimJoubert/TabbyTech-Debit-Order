// src/screens/Clients.jsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchZohoClients } from "../api/crm";

export default function Clients() {
  // Keep seed only for manual add patterns and shape reference, but do not mount UI with it.
  const seed = useMemo(
    () => [
      {
        id: "CL-10021",
        source: "zoho",
        zohoClientId: "642901000001234567",
        zohoDebitOrderId: "642901000009876543",
        name: "Mkhize Holdings",
        primaryEmail: "finance@mkhize.co.za",
        secondaryEmail: "",
        emailOptOut: false,
        owner: "Ops",
        phone: "010 446 5754",
        industry: "Commercial",
        risk: "Low",
        status: "Active",
        debit: {
          billingCycle: "Monthly - 25th",
          nextChargeDate: "2026-02-25",
          amountZar: 245000,
          debitStatus: "Scheduled",
          paystackCustomerCode: "CUS_f4v3u1n0b7",
          paystackAuthorizationCode: "AUTH_9q8w7e6r5t",
          booksInvoiceId: "INV-000184",
          retryCount: 0,
          debitRunBatchId: "BATCH-2401",
          lastAttemptDate: "2026-02-06T22:00:00.000Z",
          lastTransactionReference: "PAY-DO-778122",
          failureReason: "",
        },
        updatedAt: "2026-02-08T20:26:00.000Z",
        notes: "High volume accounts. Prefers batch notifications by email.",
      },
    ],
    []
  );

  // Live data only
  const [clients, setClients] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [hoverId, setHoverId] = useState("");

  const [toast, setToast] = useState("");
  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 2200);
  }

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All"); // All | Zoho | Manual

  const [zohoCrmStatus, setZohoCrmStatus] = useState("Loading");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [lastRequestUrl, setLastRequestUrl] = useState("");

  const [initialLoading, setInitialLoading] = useState(true);

  const selected = useMemo(() => clients.find((c) => c.id === selectedId) || null, [clients, selectedId]);

  const counts = useMemo(() => {
    const base = { All: clients.length, Active: 0, Paused: 0, Risk: 0, New: 0 };
    for (const c of clients) base[c.status] = (base[c.status] || 0) + 1;
    return base;
  }, [clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => (statusFilter === "All" ? true : c.status === statusFilter))
      .filter((c) => {
        if (sourceFilter === "All") return true;
        if (sourceFilter === "Zoho") return c.source === "zoho";
        if (sourceFilter === "Manual") return c.source === "manual";
        return true;
      })
      .filter((c) => {
        if (!q) return true;
        return (
          (c.name || "").toLowerCase().includes(q) ||
          (c.id || "").toLowerCase().includes(q) ||
          (c.primaryEmail || "").toLowerCase().includes(q) ||
          (c.secondaryEmail || "").toLowerCase().includes(q) ||
          (c.zohoClientId || "").toLowerCase().includes(q) ||
          (c.debit?.paystackCustomerCode || "").toLowerCase().includes(q) ||
          (c.debit?.paystackAuthorizationCode || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [clients, query, statusFilter, sourceFilter]);

  async function syncFromZoho({ silent = false } = {}) {
    try {
      setSyncError("");
      setSyncing(true);
      setZohoCrmStatus("Loading");

      const resp = await fetchZohoClients({ page: 1, perPage: 200 });
      setLastRequestUrl(resp.requestUrl || "");

      if (!resp.ok) {
        const msg = resp?.raw?.error || resp?.raw?.message || "Zoho sync failed.";
        throw new Error(msg);
      }

      const zohoClients = Array.isArray(resp.clients) ? resp.clients : [];

      setClients((prev) => {
        const manual = prev.filter((c) => c.source === "manual");
        const next = [...zohoClients, ...manual];

        const stillExists = next.some((c) => c.id === selectedId);
        if (!stillExists) {
          const first = next[0]?.id || "";
          setSelectedId(first);
        }

        if (!selectedId && next[0]?.id) {
          setSelectedId(next[0].id);
        }

        return next;
      });

      setZohoCrmStatus("Connected");
      if (!silent) showToast(`Synced ${zohoClients.length} client(s) from Zoho.`);
    } catch (e) {
      const msg = e?.message || String(e);

      // Attach URL if available for instant diagnosis
      const urlNote = lastRequestUrl ? ` Request: ${lastRequestUrl}` : "";
      setSyncError(`${msg}${urlNote}`.trim());

      setZohoCrmStatus("Error");
      if (!silent) showToast(`Sync failed: ${msg}`);
    } finally {
      setSyncing(false);
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    syncFromZoho({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual create modal (kept in code, UI entry button removed to reduce risk)
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    industry: "",
    notes: "",
  });

  const createDuplicate = useMemo(() => {
    const email = (createForm.email || "").trim().toLowerCase();
    if (!email) return null;
    const hit = clients.find((c) => (c.primaryEmail || "").trim().toLowerCase() === email);
    return hit || null;
  }, [createForm.email, clients]);

  function resetCreate() {
    setCreateForm({ name: "", email: "", phone: "", industry: "", notes: "" });
  }

  function createClient() {
    const name = createForm.name.trim();
    const email = createForm.email.trim();

    if (!name) return showToast("Client name is required.");
    if (!email) return showToast("Email is required.");
    if (createDuplicate) return showToast("Duplicate detected. Use the existing client or link to Zoho.");

    const id = nextClientId(clients.length ? clients : seed);
    const nowIso = new Date().toISOString();

    const next = {
      id,
      source: "manual",
      zohoClientId: "",
      zohoDebitOrderId: "",
      name,
      primaryEmail: email,
      secondaryEmail: "",
      emailOptOut: false,
      owner: "Ops",
      phone: createForm.phone.trim(),
      industry: createForm.industry.trim(),
      risk: "Low",
      status: "New",
      debit: {
        billingCycle: "Monthly - 25th",
        nextChargeDate: "",
        amountZar: 0,
        debitStatus: "None",
        paystackCustomerCode: "",
        paystackAuthorizationCode: "",
        booksInvoiceId: "",
        retryCount: 0,
        debitRunBatchId: "",
        lastAttemptDate: "",
        lastTransactionReference: "",
        failureReason: "",
      },
      updatedAt: nowIso,
      notes: createForm.notes.trim(),
    };

    setClients((prev) => [next, ...prev]);
    setSelectedId(next.id);
    setCreateOpen(false);
    resetCreate();
    showToast("Client created (manual).");
  }

  // Edit modal (UI-only)
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);

  function openEdit() {
    if (!selected) return;
    setEditForm({
      id: selected.id,
      name: selected.name || "",
      primaryEmail: selected.primaryEmail || "",
      secondaryEmail: selected.secondaryEmail || "",
      phone: selected.phone || "",
      industry: selected.industry || "",
      notes: selected.notes || "",
      emailOptOut: !!selected.emailOptOut,
    });
    setEditOpen(true);
  }

  function saveEdit() {
    if (!editForm) return;

    const name = (editForm.name || "").trim();
    const primaryEmail = (editForm.primaryEmail || "").trim();

    if (!name) return showToast("Client name is required.");
    if (!primaryEmail) return showToast("Email is required.");

    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== editForm.id) return c;
        return {
          ...c,
          name,
          primaryEmail,
          secondaryEmail: (editForm.secondaryEmail || "").trim(),
          phone: (editForm.phone || "").trim(),
          industry: (editForm.industry || "").trim(),
          notes: (editForm.notes || "").trim(),
          emailOptOut: !!editForm.emailOptOut,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    setEditOpen(false);
    setEditForm(null);
    showToast("Client updated (UI-only).");
  }

  function linkToZoho() {
    if (!selected) return;
    if (selected.source === "zoho") return showToast("Already linked to Zoho CRM.");
    showToast("Linking manual to Zoho will come next. For now, manual stays manual.");
  }

  function disableClient() {
    if (!selected) return;
    setClients((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, status: "Paused", updatedAt: new Date().toISOString() } : c))
    );
    showToast("Client disabled (UI-only).");
  }

  function downloadCsv(filename, rows) {
    const csvEscape = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
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

  function onExportExcel() {
    const exportRows = filtered.length > 0 ? filtered : clients;

    const header = [
      "Client ID",
      "Client Name",
      "Primary Email",
      "Secondary Email",
      "Phone",
      "Owner",
      "Industry",
      "Risk",
      "Status",
      "Source",
      "Zoho Client ID",
      "Zoho Debit Order ID",
      "Debit Status",
      "Billing Cycle",
      "Next Charge Date",
      "Amount (ZAR)",
      "Paystack Customer Code",
      "Paystack Authorization Code",
      "Retry Count",
      "Last Transaction Reference",
      "Failure Reason",
      "Updated At",
      "Notes",
    ];

    const body = exportRows.map((c) => [
      c.id || "",
      c.name || "",
      c.primaryEmail || "",
      c.secondaryEmail || "",
      c.phone || "",
      c.owner || "",
      c.industry || "",
      c.risk || "",
      c.status || "",
      c.source || "",
      c.zohoClientId || "",
      c.zohoDebitOrderId || "",
      c.debit?.debitStatus || "",
      c.debit?.billingCycle || "",
      c.debit?.nextChargeDate || "",
      c.debit?.amountZar ?? "",
      c.debit?.paystackCustomerCode || "",
      c.debit?.paystackAuthorizationCode || "",
      c.debit?.retryCount ?? 0,
      c.debit?.lastTransactionReference || "",
      c.debit?.failureReason || "",
      c.updatedAt || "",
      c.notes || "",
    ]);

    downloadCsv(`tabbytech-clients-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body]);
  }

  const css = `
  .tt-clients {
    width: 100%;
    height: 100%;
    color: rgba(255,255,255,0.92);
    --tt-purple: rgba(124,58,237,0.95);
    --tt-purple2: rgba(168,85,247,0.95);
    --tt-black: rgba(0,0,0,0.55);
    --tt-black2: rgba(0,0,0,0.35);
  }

  .tt-clientsWrap { height: 100%; display: flex; flex-direction: column; gap: 16px; }

  .tt-clientsHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .tt-clientsTitleWrap { display: flex; flex-direction: column; gap: 6px; }
  .tt-clientsH1 { margin: 0; font-size: 26px; letter-spacing: 0.2px; color: rgba(255,255,255,0.92); }
  .tt-clientsSub { margin: 0; font-size: 13px; color: rgba(255,255,255,0.62); line-height: 1.4; max-width: 980px; }

  .tt-actionsRow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }

  .tt-grid { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; min-height: 0; flex: 1; }
  .tt-glass {
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.10);
    background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
    box-shadow: 0 18px 50px rgba(0,0,0,0.35);
    backdrop-filter: blur(14px);
    overflow: hidden;
    min-height: 0;
  }

  .tt-panelHeader {
    padding: 14px 14px 12px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.10);
  }

  .tt-phLeft { display: flex; flex-direction: column; gap: 2px; }
  .tt-phTitle { margin: 0; font-size: 14px; font-weight: 800; color: rgba(255,255,255,0.86); }
  .tt-phMeta { margin: 0; font-size: 12px; color: rgba(255,255,255,0.55); }

  .tt-controls {
    padding: 14px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }

  .tt-inputWrap { position: relative; flex: 1 1 320px; max-width: 560px; }
  .tt-inputIcon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); opacity: 0.75; }
  .tt-input {
    width: 100%;
    height: 38px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.18);
    color: rgba(255,255,255,0.88);
    outline: none;
    padding: 0 12px 0 38px;
    font-size: 13px;
  }
  .tt-input:focus { border-color: rgba(124,58,237,0.45); box-shadow: 0 0 0 6px rgba(124,58,237,0.18); }

  .tt-chipRow { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
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
  .tt-chip:hover { transform: translateY(-1px); background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.14); box-shadow: 0 10px 24px rgba(0,0,0,0.28); }
  .tt-chipActive { border-color: rgba(124,58,237,0.55); background: rgba(124,58,237,0.16); color: rgba(255,255,255,0.92); }

  /* Records-dropdown style (matches your purple dropdown look) */
  .tt-dd {
    height: 34px;
    border-radius: 10px;
    border: 1px solid rgba(168,85,247,0.55);
    background: rgba(0,0,0,0.22);
    color: rgba(255,255,255,0.90);
    padding: 0 40px 0 12px;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.2px;
    outline: none;
    cursor: pointer;

    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;

    background-image:
      linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M7 10l5 5 5-5' stroke='%23A855F7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat, no-repeat;
    background-position: 0 0, right 12px center;
    background-size: auto, 18px 18px;
  }
  .tt-dd:hover { box-shadow: 0 10px 26px rgba(0,0,0,0.32); }
  .tt-dd:focus { border-color: rgba(168,85,247,0.75); box-shadow: 0 0 0 6px rgba(124,58,237,0.18); }
  .tt-dd option { background: rgba(10,10,14,0.98); color: rgba(255,255,255,0.92); }

  .tt-tableWrap { height: 100%; display: flex; flex-direction: column; min-height: 0; }
  .tt-tableScroll { overflow: auto; height: 100%; }
  .tt-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
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
  }
  .tt-td {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.78);
    white-space: nowrap;
  }
  .tt-tr { cursor: pointer; transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease; }
  .tt-trHover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(0,0,0,0.28); background: rgba(255,255,255,0.04); }
  .tt-trActive { background: rgba(124,58,237,0.14); }

  .tt-nameRow { display: flex; align-items: center; gap: 10px; }
  .tt-name { font-weight: 900; color: rgba(255,255,255,0.90); }
  .tt-subId { font-size: 12px; color: rgba(255,255,255,0.55); }

  .tt-pill {
    height: 22px;
    padding: 0 10px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.80);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.2px;
    gap: 6px;
  }
  .tt-pillZoho { border-color: rgba(124,58,237,0.38); background: rgba(124,58,237,0.16); }
  .tt-pillManual { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); }

  .tt-badge { height: 22px; padding: 0 10px; border-radius: 999px; display: inline-flex; align-items: center; font-size: 11px; font-weight: 900; letter-spacing: 0.2px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); }
  .tt-bActive { border-color: rgba(34,197,94,0.30); background: rgba(34,197,94,0.14); color: rgba(255,255,255,0.86); }
  .tt-bPaused { border-color: rgba(245,158,11,0.32); background: rgba(245,158,11,0.16); color: rgba(255,255,255,0.86); }
  .tt-bRisk { border-color: rgba(239,68,68,0.32); background: rgba(239,68,68,0.16); color: rgba(255,255,255,0.86); }
  .tt-bNew { border-color: rgba(124,58,237,0.32); background: rgba(124,58,237,0.16); color: rgba(255,255,255,0.90); }

  .tt-right { padding: 14px; display: flex; flex-direction: column; gap: 12px; min-height: 0; }
  .tt-split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  .tt-stat {
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.10);
    background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%);
    padding: 12px;
  }
  .tt-statLabel { margin: 0; font-size: 12px; color: rgba(255,255,255,0.55); }
  .tt-statValue { margin: 6px 0 0 0; font-size: 18px; font-weight: 900; color: rgba(255,255,255,0.90); letter-spacing: 0.2px; }

  .tt-section {
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.14);
    padding: 12px;
  }
  .tt-sectionTitle {
    margin: 0;
    font-size: 12px;
    font-weight: 900;
    color: rgba(255,255,255,0.78);
    letter-spacing: 0.2px;
    text-transform: uppercase;
  }
  .tt-kv { display: grid; grid-template-columns: 170px 1fr; gap: 10px; margin-top: 10px; }
  .tt-k { font-size: 12px; color: rgba(255,255,255,0.55); }
  .tt-v { font-size: 13px; color: rgba(255,255,255,0.84); overflow: hidden; text-overflow: ellipsis; }

  .tt-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 10px 0; }

  .tt-btn {
    height: 38px;
    padding: 0 12px;
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
  .tt-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(0,0,0,0.28); background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.14); }
  .tt-btn:active { transform: translateY(0px); }
  .tt-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }

  .tt-btnPrimary {
    background: linear-gradient(135deg, var(--tt-purple2), var(--tt-purple));
    border-color: rgba(124,58,237,0.55);
    box-shadow: 0 14px 34px rgba(124,58,237,0.28);
    color: #fff;
  }
  .tt-btnPrimary:hover { filter: brightness(1.06); }

  .tt-btnDanger {
    background: rgba(239,68,68,0.14);
    border-color: rgba(239,68,68,0.35);
  }

  .tt-toastWrap { position: fixed; bottom: 24px; right: 24px; z-index: 90; }
  .tt-toast {
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.70);
    backdrop-filter: blur(14px);
    padding: 10px 12px;
    color: rgba(255,255,255,0.92);
    font-size: 13px;
    box-shadow: 0 22px 70px rgba(0,0,0,0.45);
    max-width: 420px;
  }

  @media (max-width: 1100px) {
    .tt-grid { grid-template-columns: 1fr; }
    .tt-kv { grid-template-columns: 1fr; }
    .tt-split { grid-template-columns: 1fr; }
  }
  `;

  return (
    <div className="tt-clients">
      <style>{css}</style>

      <div className="tt-clientsWrap">
        <div className="tt-clientsHeader">
          <div className="tt-clientsTitleWrap">
            <h1 className="tt-clientsH1">Clients</h1>
            <p className="tt-clientsSub">Live data from Zoho CRM.</p>
          </div>

          <div className="tt-actionsRow">
            <button type="button" className="tt-btn tt-btnPrimary" onClick={onExportExcel}>
              Export to Excel
            </button>
          </div>
        </div>

        <div className="tt-grid">
          <div className="tt-glass tt-tableWrap">
            <div className="tt-panelHeader">
              <div className="tt-phLeft">
                <p className="tt-phTitle">Client list</p>
                <p className="tt-phMeta">
                  {filtered.length} shown · Zoho CRM: <b>{zohoCrmStatus}</b>
                  {syncError ? <span style={{ marginLeft: 8, color: "rgba(239,68,68,0.9)" }}>({syncError})</span> : null}
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <select className="tt-dd" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} aria-label="Source filter">
                  <option value="All">All sync</option>
                  <option value="Zoho">Zoho CRM</option>
                  <option value="Manual">Manual</option>
                </select>

                <button type="button" className="tt-btn" onClick={() => syncFromZoho()} disabled={syncing}>
                  {syncing ? "Syncing..." : "Sync now"}
                </button>
              </div>
            </div>

            <div className="tt-controls">
              <div className="tt-inputWrap">
                <span className="tt-inputIcon">
                  <IconSearch />
                </span>
                <input
                  className="tt-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, id, email, Zoho id, or Paystack codes"
                  aria-label="Search clients"
                />
              </div>

              <div className="tt-chipRow">
                {["All", "Active", "Paused", "Risk", "New"].map((k) => {
                  const active = statusFilter === k;
                  return (
                    <div
                      key={k}
                      className={active ? "tt-chip tt-chipActive" : "tt-chip"}
                      role="button"
                      tabIndex={0}
                      onClick={() => setStatusFilter(k)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setStatusFilter(k);
                      }}
                      title={`Filter: ${k}`}
                    >
                      <span>{k}</span>
                      <span style={{ opacity: 0.85 }}>{counts[k] ?? 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="tt-tableScroll">
              <table className="tt-table">
                <thead>
                  <tr>
                    <th className="tt-th">Client</th>
                    <th className="tt-th">Source</th>
                    <th className="tt-th">Debit status</th>
                    <th className="tt-th">Next charge</th>
                    <th className="tt-th">Amount</th>
                    <th className="tt-th">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {initialLoading && (
                    <tr>
                      <td className="tt-td" colSpan={6} style={{ padding: 20, whiteSpace: "normal" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.90)" }}>Loading clients</div>
                          <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, lineHeight: 1.4 }}>Syncing from Zoho CRM API.</div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!initialLoading &&
                    filtered.map((c) => {
                      const isActive = c.id === selectedId;
                      const isHover = hoverId === c.id;

                      const trClass = ["tt-tr", isActive ? "tt-trActive" : "", isHover ? "tt-trHover" : ""].join(" ").trim();

                      return (
                        <tr
                          key={c.id}
                          className={trClass}
                          onMouseEnter={() => setHoverId(c.id)}
                          onMouseLeave={() => setHoverId("")}
                          onClick={() => setSelectedId(c.id)}
                        >
                          <td className="tt-td" style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <div className="tt-nameRow">
                                <span className="tt-name">{c.name}</span>
                                <span className="tt-subId">{c.id}</span>
                                <span className={statusBadgeClass(c.status)}>{c.status}</span>
                              </div>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.60)" }}>{c.primaryEmail}</span>
                            </div>
                          </td>

                          <td className="tt-td">
                            {c.source === "zoho" ? (
                              <span className="tt-pill tt-pillZoho">
                                <Dot />
                                Zoho
                              </span>
                            ) : (
                              <span className="tt-pill tt-pillManual">
                                <Dot />
                                Manual
                              </span>
                            )}
                          </td>

                          <td className="tt-td">{c.debit?.debitStatus || "None"}</td>
                          <td className="tt-td">{c.debit?.nextChargeDate ? fmtDateShort(c.debit.nextChargeDate) : "Not set"}</td>
                          <td className="tt-td">{currencyZar(c.debit?.amountZar || 0)}</td>
                          <td className="tt-td">{fmtDateTimeShort(c.updatedAt)}</td>
                        </tr>
                      );
                    })}

                  {!initialLoading && filtered.length === 0 && (
                    <tr>
                      <td className="tt-td" colSpan={6} style={{ padding: 20, whiteSpace: "normal" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.90)" }}>No clients found</div>
                          <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, lineHeight: 1.4 }}>
                            Try a different search term, adjust filters, or switch source.
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="tt-glass" style={{ display: "flex", flexDirection: "column" }}>
            <div className="tt-panelHeader">
              <div className="tt-phLeft">
                <p className="tt-phTitle">Client details</p>
                <p className="tt-phMeta">Selection updates this panel</p>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button type="button" className="tt-btn" onClick={openEdit} disabled={!selected}>
                  Edit
                </button>
                <button type="button" className="tt-btn tt-btnDanger" onClick={disableClient} disabled={!selected}>
                  Disable
                </button>
              </div>
            </div>

            <div className="tt-right">
              {!selected ? (
                <div className="tt-section" style={{ color: "rgba(255,255,255,0.70)" }}>
                  Select a client to view details.
                </div>
              ) : (
                <>
                  <div className="tt-split">
                    <div className="tt-stat">
                      <p className="tt-statLabel">Debit status</p>
                      <p className="tt-statValue">{selected.debit?.debitStatus || "None"}</p>
                    </div>
                    <div className="tt-stat">
                      <p className="tt-statLabel">Amount</p>
                      <p className="tt-statValue">{currencyZar(selected.debit?.amountZar || 0)}</p>
                    </div>
                  </div>

                  <div className="tt-section">
                    <p className="tt-sectionTitle">Profile</p>

                    <div className="tt-kv">
                      <div className="tt-k">Client</div>
                      <div className="tt-v">{selected.name}</div>

                      <div className="tt-k">Client id</div>
                      <div className="tt-v">{selected.id}</div>

                      <div className="tt-k">Source</div>
                      <div className="tt-v">{selected.source === "zoho" ? "Zoho CRM sync" : "Manual"}</div>

                      <div className="tt-k">Primary email</div>
                      <div className="tt-v">{selected.primaryEmail || "Not set"}</div>

                      <div className="tt-k">Secondary email</div>
                      <div className="tt-v">{selected.secondaryEmail || "Not set"}</div>

                      <div className="tt-k">Email opt out</div>
                      <div className="tt-v">{selected.emailOptOut ? "Yes" : "No"}</div>

                      <div className="tt-k">Owner</div>
                      <div className="tt-v">{selected.owner || "Not set"}</div>

                      <div className="tt-k">Phone</div>
                      <div className="tt-v">{selected.phone || "Not set"}</div>

                      <div className="tt-k">Industry</div>
                      <div className="tt-v">{selected.industry || "Not set"}</div>

                      <div className="tt-k">Risk</div>
                      <div className="tt-v">{selected.risk || "Not set"}</div>

                      <div className="tt-k">Updated</div>
                      <div className="tt-v">{fmtDateTimeLong(selected.updatedAt)}</div>
                    </div>

                    <div className="tt-divider" />

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button type="button" className="tt-btn" onClick={() => showToast("View debit orders will come next.")}>
                        View debit orders
                      </button>
                      <button type="button" className="tt-btn" onClick={() => showToast("View batches will come next.")}>
                        View batches
                      </button>

                      {selected.source !== "zoho" ? (
                        <button type="button" className="tt-btn tt-btnPrimary" onClick={linkToZoho}>
                          Link to Zoho
                        </button>
                      ) : (
                        <button type="button" className="tt-btn" onClick={() => showToast("Open in Zoho will come next.")}>
                          Open in Zoho
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="tt-section">
                    <p className="tt-sectionTitle">Debit profile</p>

                    <div className="tt-kv">
                      <div className="tt-k">Billing cycle</div>
                      <div className="tt-v">{selected.debit?.billingCycle || "Not set"}</div>

                      <div className="tt-k">Next charge date</div>
                      <div className="tt-v">{selected.debit?.nextChargeDate ? fmtDateShort(selected.debit.nextChargeDate) : "Not set"}</div>

                      <div className="tt-k">Last attempt date</div>
                      <div className="tt-v">{selected.debit?.lastAttemptDate ? fmtDateTimeLong(selected.debit.lastAttemptDate) : "Not set"}</div>

                      <div className="tt-k">Last transaction reference</div>
                      <div className="tt-v">{selected.debit?.lastTransactionReference || "Not set"}</div>

                      <div className="tt-k">Failure reason</div>
                      <div className="tt-v">{selected.debit?.failureReason || "None"}</div>

                      <div className="tt-k">Status</div>
                      <div className="tt-v">{selected.debit?.debitStatus || "None"}</div>

                      <div className="tt-k">Books invoice id</div>
                      <div className="tt-v">{selected.debit?.booksInvoiceId || "Not set"}</div>

                      <div className="tt-k">Retry count</div>
                      <div className="tt-v">{String(selected.debit?.retryCount ?? 0)}</div>

                      <div className="tt-k">Debit run batch id</div>
                      <div className="tt-v">{selected.debit?.debitRunBatchId || "Not set"}</div>

                      <div className="tt-k">Paystack customer code</div>
                      <div className="tt-v">{selected.debit?.paystackCustomerCode || "Not set"}</div>

                      <div className="tt-k">Paystack authorization code</div>
                      <div className="tt-v">{selected.debit?.paystackAuthorizationCode || "Not set"}</div>
                    </div>

                    <div className="tt-divider" />

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button type="button" className="tt-btn" onClick={() => showToast("Update status will come next.")}>
                        Update status
                      </button>
                      <button type="button" className="tt-btn" onClick={() => showToast("Schedule retry will come next.")}>
                        Schedule retry
                      </button>
                      <button type="button" className="tt-btn tt-btnPrimary" onClick={() => showToast("Start onboarding will come next.")}>
                        Start onboarding
                      </button>
                    </div>
                  </div>

                  <div className="tt-section">
                    <p className="tt-sectionTitle">Notes</p>
                    <p style={{ margin: "10px 0 0 0", color: "rgba(255,255,255,0.70)", fontSize: 13, lineHeight: 1.5 }}>
                      {selected.notes || "No notes yet."}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {createOpen && (
          <div className="tt-modalOverlay" role="dialog" aria-modal="true" aria-label="Add client manually">
            <div className="tt-modal">
              <div className="tt-modalHead">
                <div>
                  <h2 className="tt-modalTitle">Add client manually</h2>
                  <div className="tt-modalHint">
                    Manual creation is the exception. If a matching Zoho CRM record exists, linking later reduces risk and prevents duplicates.
                  </div>
                </div>

                <div className="tt-modalActions">
                  <button
                    type="button"
                    className="tt-btn"
                    onClick={() => {
                      setCreateOpen(false);
                      resetCreate();
                    }}
                  >
                    Close
                  </button>
                  <button type="button" className="tt-btn tt-btnPrimary" onClick={createClient}>
                    Create
                  </button>
                </div>
              </div>

              <div className="tt-modalBody">
                {createDuplicate ? (
                  <div className="tt-warn">
                    Duplicate detected: <b>{createDuplicate.name}</b> already uses <b>{createDuplicate.primaryEmail}</b>. Create manually only when CRM does not have the
                    record.
                  </div>
                ) : null}

                <div className="tt-formGrid2">
                  <div className="tt-field">
                    <div className="tt-label">Client name</div>
                    <input
                      className="tt-text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Example: Mokoena Interiors"
                    />
                  </div>

                  <div className="tt-field">
                    <div className="tt-label">Email</div>
                    <input
                      className="tt-text"
                      value={createForm.email}
                      onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="Example: accounts@example.co.za"
                    />
                  </div>

                  <div className="tt-field">
                    <div className="tt-label">Phone (optional)</div>
                    <input
                      className="tt-text"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="Example: 010 446 5754"
                    />
                  </div>

                  <div className="tt-field">
                    <div className="tt-label">Industry (optional)</div>
                    <input
                      className="tt-text"
                      value={createForm.industry}
                      onChange={(e) => setCreateForm((p) => ({ ...p, industry: e.target.value }))}
                      placeholder="Example: Property"
                    />
                  </div>
                </div>

                <div className="tt-field">
                  <div className="tt-label">Notes (optional)</div>
                  <textarea
                    className="tt-area"
                    value={createForm.notes}
                    onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Add any operational notes for onboarding and risk context."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {toast ? (
          <div className="tt-toastWrap">
            <div className="tt-toast">{toast}</div>
          </div>
        ) : null}

        {editOpen ? (
          <div className="tt-toastWrap">
            <div className="tt-toast">
              Edit modal is still UI-only in this file. If you want it next, tell me and I will convert it to the same glass modal style used elsewhere.
              <div style={{ marginTop: 10, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="tt-btn" onClick={() => setEditOpen(false)}>
                  Close
                </button>
                <button type="button" className="tt-btn tt-btnPrimary" onClick={saveEdit}>
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------------------
   Small UI bits
---------------------------- */

function Dot() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: "rgba(255,255,255,0.85)",
        boxShadow: "0 0 0 6px rgba(124,58,237,0.12)",
        opacity: 0.9,
      }}
    />
  );
}

function IconSearch({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
      <path d="M16.2 16.2 21 21" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------
   Helpers
---------------------------- */

function currencyZar(n) {
  const val = Number(n || 0);
  return val.toLocaleString("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 });
}

function fmtDateShort(yyyyMmDd) {
  const d = new Date(yyyyMmDd + "T00:00:00.000Z");
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "2-digit" });
}

function fmtDateTimeShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "2-digit" });
}

function fmtDateTimeLong(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-ZA", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function nextClientId(existing) {
  const nums = existing
    .map((c) => String(c.id || "").replace(/[^\d]/g, ""))
    .map((s) => parseInt(s || "0", 10))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 10000;
  return "CL-" + String(max + 1);
}

function statusBadgeClass(status) {
  if (status === "Active") return "tt-badge tt-bActive";
  if (status === "Paused") return "tt-badge tt-bPaused";
  if (status === "Risk") return "tt-badge tt-bRisk";
  return "tt-badge tt-bNew";
}
