import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchZohoClients } from "../api/crm";
import { request } from "../api";
import { ShimmerTableRows, ShimmerPanel } from "../components/ShimmerSkeleton";

const CLIENTS_CACHE_TTL_MS = 10 * 60 * 1000;

let clientsScreenCache = {
  clients: [],
  selectedId: "",
  query: "",
  statusFilter: "All",
  perPage: 10,
  page: 1,
  zohoCrmStatus: "Loading",
  syncError: "",
  lastRequestUrl: "",
  lastLoadedAt: 0,
};

function hasFreshClientsCache() {
  return (
    Array.isArray(clientsScreenCache.clients) &&
    clientsScreenCache.clients.length > 0 &&
    Date.now() - Number(clientsScreenCache.lastLoadedAt || 0) < CLIENTS_CACHE_TTL_MS
  );
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getPrimaryCrmId(client) {
  return String(
    client?.zohoClientId ||
      client?.clientId ||
      client?.crmClientId ||
      client?.id ||
      ""
  ).trim();
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

function currencyZar(n) {
  const val = Number(n || 0);
  return val.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  });
}

function fmtDateShort(yyyyMmDd) {
  const d = new Date(`${yyyyMmDd}T00:00:00.000Z`);
  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function fmtDateTimeShort(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function fmtDateTimeLong(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeClass(status) {
  if (status === "Active") return "tt-badge tt-bActive";
  if (status === "Paused") return "tt-badge tt-bPaused";
  if (status === "Risk") return "tt-badge tt-bRisk";
  return "tt-badge tt-bNew";
}

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    function onDown(e) {
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;
      handler();
    }

    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [ref, handler]);
}

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

function RecordsDropdown({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useOnClickOutside(wrapRef, () => setOpen(false));

  const options = [
    { value: 10, label: "10 records" },
    { value: 20, label: "20 records" },
    { value: 50, label: "50 records" },
    { value: 100, label: "100 records" },
  ];

  const active = options.find((o) => o.value === value) || options[0];

  function select(v) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="tt-ddWrap">
      <span className="tt-ddLabel">Records</span>

      <div className="tt-ddRel">
        <button
          type="button"
          className={open ? "tt-ddBtn tt-ddBtnOpen" : "tt-ddBtn"}
          onClick={() => {
            if (disabled) return;
            setOpen((x) => !x);
          }}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span>{active.label}</span>
          <span className="tt-ddCaret">▾</span>
        </button>

        {open && (
          <div className="tt-ddMenu" role="listbox" aria-label="Records per page">
            {options.map((o, idx) => {
              const isActive = o.value === value;
              return (
                <div
                  key={o.value}
                  role="option"
                  aria-selected={isActive}
                  className={isActive ? "tt-ddItem tt-ddItemActive" : "tt-ddItem"}
                  style={{
                    borderBottom:
                      idx === options.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)",
                  }}
                  onClick={() => select(o.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") select(o.value);
                  }}
                  tabIndex={0}
                >
                  <span>{o.label}</span>
                  {isActive ? <span className="tt-ddTick">✓</span> : <span style={{ width: 18 }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PremiumSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Select option",
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useOnClickOutside(wrapRef, () => setOpen(false));

  const active =
    options.find((o) => String(o.value) === String(value)) ||
    null;

  function select(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div className="tt-formField">
      <label className="tt-label">{label}</label>

      <div ref={wrapRef} className="tt-pselectWrap">
        <button
          type="button"
          className={open ? "tt-pselectBtn tt-pselectBtnOpen" : "tt-pselectBtn"}
          onClick={() => setOpen((x) => !x)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={active ? "tt-pselectValue" : "tt-pselectPlaceholder"}>
            {active ? active.label : placeholder}
          </span>
          <span className="tt-pselectCaret">▾</span>
        </button>

        {open && (
          <div className="tt-pselectMenu" role="listbox" aria-label={label}>
            {options.map((option, idx) => {
              const isActive = String(option.value) === String(value);
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isActive}
                  className={isActive ? "tt-pselectItem tt-pselectItemActive" : "tt-pselectItem"}
                  style={{
                    borderBottom:
                      idx === options.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)",
                  }}
                  onClick={() => select(option.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") select(option.value);
                  }}
                  tabIndex={0}
                >
                  <span>{option.label}</span>
                  {isActive ? <span className="tt-pselectTick">✓</span> : <span style={{ width: 18 }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EditDrawer({ editDraft, onCloseEdit, updateDraft, onSaveEdit }) {
  if (!editDraft || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="tt-editOverlay" onClick={onCloseEdit} />
      <div className="tt-editDrawer" role="dialog" aria-modal="true" aria-label="Edit client">
        <div className="tt-editHead">
          <div>
            <h2 className="tt-editTitle">Edit client</h2>
            <p className="tt-editSub">
              Premium edit view for filling in missing client data. Changes are saved to Zoho CRM on Save.
            </p>
          </div>

          <button type="button" className="tt-btn tt-btnSecondary" onClick={onCloseEdit}>
            Close
          </button>
        </div>

        <div className="tt-editBody">
          <div className="tt-editSection">
            <p className="tt-editSectionTitle">Profile details</p>
            <div className="tt-formGrid2">
              <div className="tt-formField">
                <label className="tt-label">Client name</label>
                <input
                  className="tt-inputDark"
                  value={editDraft.name || ""}
                  onChange={(e) => updateDraft("name", e.target.value)}
                />
              </div>

              <div className="tt-formField">
                <label className="tt-label">Owner</label>
                <input
                  className="tt-inputDark"
                  value={editDraft.owner || ""}
                  onChange={(e) => updateDraft("owner", e.target.value)}
                />
              </div>

              <div className="tt-formField">
                <label className="tt-label">Primary email</label>
                <input
                  className="tt-inputDark"
                  value={editDraft.primaryEmail || ""}
                  onChange={(e) => updateDraft("primaryEmail", e.target.value)}
                />
              </div>

              <div className="tt-formField">
                <label className="tt-label">Secondary email</label>
                <input
                  className="tt-inputDark"
                  value={editDraft.secondaryEmail || ""}
                  onChange={(e) => updateDraft("secondaryEmail", e.target.value)}
                />
              </div>

              <div className="tt-formField">
                <label className="tt-label">Phone</label>
                <input
                  className="tt-inputDark"
                  value={editDraft.phone || ""}
                  onChange={(e) => updateDraft("phone", e.target.value)}
                />
              </div>

              <div className="tt-formField">
                <label className="tt-label">Industry</label>
                <input
                  className="tt-inputDark"
                  value={editDraft.industry || ""}
                  onChange={(e) => updateDraft("industry", e.target.value)}
                />
              </div>

              <PremiumSelect
                label="Risk"
                value={editDraft.risk || ""}
                placeholder="Select risk"
                options={[
                  { value: "", label: "Select risk" },
                  { value: "Low", label: "Low" },
                  { value: "Medium", label: "Medium" },
                  { value: "High", label: "High" },
                ]}
                onChange={(nextValue) => updateDraft("risk", nextValue)}
              />

              <PremiumSelect
                label="Client status"
                value={editDraft.status || ""}
                placeholder="Select status"
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Paused", label: "Paused" },
                  { value: "Risk", label: "Risk" },
                  { value: "New", label: "New" },
                ]}
                onChange={(nextValue) => updateDraft("status", nextValue)}
              />
            </div>
          </div>

          <div className="tt-editSection">
            <p className="tt-editSectionTitle">Debit details</p>
            <div className="tt-formGrid2">
              <div className="tt-formField">
                <label className="tt-label">Billing cycle</label>
                <input
                  className="tt-inputDark"
                  value={editDraft.debit?.billingCycle || ""}
                  onChange={(e) => updateDraft("debit.billingCycle", e.target.value)}
                />
              </div>

              <div className="tt-formField">
                <label className="tt-label">Debit status</label>
                <input
                  className="tt-inputDark"
                  value={editDraft.debit?.debitStatus || ""}
                  onChange={(e) => updateDraft("debit.debitStatus", e.target.value)}
                />
              </div>

              <div className="tt-formField">
                <label className="tt-label">Next charge date</label>
                <input
                  className="tt-inputDark"
                  value={editDraft.debit?.nextChargeDate || ""}
                  onChange={(e) => updateDraft("debit.nextChargeDate", e.target.value)}
                />
              </div>

              <div className="tt-formField">
                <label className="tt-label">Amount (ZAR)</label>
                <input
                  className="tt-inputDark"
                  type="number"
                  value={editDraft.debit?.amountZar ?? ""}
                  onChange={(e) => updateDraft("debit.amountZar", Number(e.target.value || 0))}
                />
              </div>

              <div className="tt-formField">
                <label className="tt-label">Books invoice id</label>
                <input
                  className="tt-inputDark"
                  value={editDraft.debit?.booksInvoiceId || ""}
                  onChange={(e) => updateDraft("debit.booksInvoiceId", e.target.value)}
                />
              </div>

              <div className="tt-formField">
                <label className="tt-label">Retry count</label>
                <input
                  className="tt-inputDark"
                  type="number"
                  value={editDraft.debit?.retryCount ?? 0}
                  onChange={(e) => updateDraft("debit.retryCount", Number(e.target.value || 0))}
                />
              </div>

              <div className="tt-formField">
                <label className="tt-label">Paystack customer code</label>
                <input
                  className="tt-inputDark"
                  value={editDraft.debit?.paystackCustomerCode || ""}
                  onChange={(e) => updateDraft("debit.paystackCustomerCode", e.target.value)}
                />
              </div>

              <div className="tt-formField">
                <label className="tt-label">Paystack authorization code</label>
                <input
                  className="tt-inputDark"
                  value={editDraft.debit?.paystackAuthorizationCode || ""}
                  onChange={(e) => updateDraft("debit.paystackAuthorizationCode", e.target.value)}
                />
              </div>

              <div className="tt-formField tt-formFieldFull">
                <label className="tt-label">Failure reason</label>
                <input
                  className="tt-inputDark"
                  value={editDraft.debit?.failureReason || ""}
                  onChange={(e) => updateDraft("debit.failureReason", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="tt-editSection">
            <p className="tt-editSectionTitle">Notes</p>
            <div className="tt-formField">
              <label className="tt-label">Internal notes</label>
              <textarea
                className="tt-textareaDark"
                value={editDraft.notes || ""}
                onChange={(e) => updateDraft("notes", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="tt-editFoot">
          <button type="button" className="tt-btn tt-btnSecondary" onClick={onCloseEdit}>
            Cancel
          </button>
          <button type="button" className="tt-btn tt-btnPrimary" onClick={onSaveEdit}>
            Save client
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

export default function Clients({ onOpenDebitOrders, onOpenBatches }) {
  useMemo(
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

  const [clients, setClients] = useState(() =>
    Array.isArray(clientsScreenCache.clients) ? clientsScreenCache.clients : []
  );
  const [selectedId, setSelectedId] = useState(() => String(clientsScreenCache.selectedId || ""));
  const [hoverId, setHoverId] = useState("");

  const [toast, setToast] = useState("");
  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 2200);
  }

  const [query, setQuery] = useState(() => String(clientsScreenCache.query || ""));
  const [statusFilter, setStatusFilter] = useState(() => String(clientsScreenCache.statusFilter || "All"));

  const [zohoCrmStatus, setZohoCrmStatus] = useState(() => String(clientsScreenCache.zohoCrmStatus || "Loading"));
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(() => String(clientsScreenCache.syncError || ""));
  const [lastRequestUrl, setLastRequestUrl] = useState(() => String(clientsScreenCache.lastRequestUrl || ""));
  const [initialLoading, setInitialLoading] = useState(() => !hasFreshClientsCache());

  const [perPage, setPerPage] = useState(() => {
    const v = Number(clientsScreenCache.perPage || 10);
    return Number.isFinite(v) && v > 0 ? v : 10;
  });
  const [page, setPage] = useState(() => {
    const v = Number(clientsScreenCache.page || 1);
    return Number.isFinite(v) && v > 0 ? v : 1;
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const selected = useMemo(() => clients.find((c) => c.id === selectedId) || null, [clients, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    
    // Fetch fresh details when selection changes to get latest notes & contact data
    const fetchLatestDetails = async () => {
      setDetailsLoading(true);
      try {
        const resp = await request(`/api/clients/${encodeURIComponent(selectedId)}`);
        if (resp.ok && resp.data) {
          setClients(prev => prev.map(c => c.id === resp.data.id ? { ...c, ...resp.data } : c));
        }
      } catch (e) {
        console.error("Failed to fetch client details on selection:", e);
      } finally {
        setDetailsLoading(false);
      }
    };
    
    fetchLatestDetails();
  }, [selectedId]);

  const counts = useMemo(() => {
    const base = { All: clients.length, Active: 0, Paused: 0, Risk: 0, New: 0 };
    for (const c of clients) base[c.status] = (base[c.status] || 0) + 1;
    return base;
  }, [clients]);

  const filteredAll = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => (statusFilter === "All" ? true : c.status === statusFilter))
      .filter((c) => {
        if (!q) return true;
        const crmId = getPrimaryCrmId(c).toLowerCase();
        return (
          (c.name || "").toLowerCase().includes(q) ||
          (c.id || "").toLowerCase().includes(q) ||
          crmId.includes(q) ||
          (c.primaryEmail || "").toLowerCase().includes(q) ||
          (c.secondaryEmail || "").toLowerCase().includes(q) ||
          (c.debit?.paystackCustomerCode || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [clients, query, statusFilter]);

  const pageCount = useMemo(() => {
    const n = Math.max(1, Math.ceil(filteredAll.length / perPage));
    return n;
  }, [filteredAll.length, perPage]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const filtered = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredAll.slice(start, start + perPage);
  }, [filteredAll, page, perPage]);

  useEffect(() => {
    clientsScreenCache = {
      ...clientsScreenCache,
      clients,
      selectedId,
      query,
      statusFilter,
      perPage,
      page,
      zohoCrmStatus,
      syncError,
      lastRequestUrl,
      lastLoadedAt: clientsScreenCache.lastLoadedAt,
    };
  }, [clients, selectedId, query, statusFilter, perPage, page, zohoCrmStatus, syncError, lastRequestUrl]);

  useEffect(() => {
    if (!editOpen) return;
    const htmlPrev = document.documentElement.style.overflow;
    const bodyPrev = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = htmlPrev;
      document.body.style.overflow = bodyPrev;
    };
  }, [editOpen]);

  async function syncFromZoho({ silent = false, force = false } = {}) {
    if (!force && hasFreshClientsCache()) {
      const cachedClients = Array.isArray(clientsScreenCache.clients) ? clientsScreenCache.clients : [];

      setClients(cachedClients);
      setLastRequestUrl(clientsScreenCache.lastRequestUrl || "");
      setSyncError(clientsScreenCache.syncError || "");
      setZohoCrmStatus(clientsScreenCache.zohoCrmStatus || "Connected");

      const cachedSelectedStillExists = cachedClients.some((c) => c.id === clientsScreenCache.selectedId);
      if (cachedSelectedStillExists) {
        setSelectedId(clientsScreenCache.selectedId || "");
      } else if (cachedClients[0]?.id) {
        setSelectedId(cachedClients[0].id);
      }

      setInitialLoading(false);
      return;
    }

    try {
      setSyncError("");
      setSyncing(true);
      setZohoCrmStatus("Loading");

      const resp = await fetchZohoClients({ page: 1, perPage: 200 });
      const nextRequestUrl = resp.requestUrl || "";
      setLastRequestUrl(nextRequestUrl);

      if (!resp.ok) {
        const msg = resp?.raw?.error || resp?.raw?.message || "Zoho sync failed.";
        throw new Error(msg);
      }

      const zohoClients = Array.isArray(resp.clients) ? resp.clients : [];

      let nextSelectedId = selectedId;
      const stillExists = zohoClients.some((c) => c.id === nextSelectedId);

      if (!stillExists) {
        nextSelectedId = zohoClients[0]?.id || "";
      }

      if (!nextSelectedId && zohoClients[0]?.id) {
        nextSelectedId = zohoClients[0].id;
      }

      setClients(zohoClients);
      setSelectedId(nextSelectedId);
      setZohoCrmStatus("Connected");

      clientsScreenCache = {
        ...clientsScreenCache,
        clients: zohoClients,
        selectedId: nextSelectedId,
        query,
        statusFilter,
        perPage,
        page,
        zohoCrmStatus: "Connected",
        syncError: "",
        lastRequestUrl: nextRequestUrl,
        lastLoadedAt: Date.now(),
      };

      if (!silent) showToast(`Synced ${zohoClients.length} client(s) from Zoho.`);
    } catch (e) {
      const msg = e?.message || String(e);
      const requestUrlForNote = lastRequestUrl || clientsScreenCache.lastRequestUrl || "";
      const urlNote = requestUrlForNote ? ` Request: ${requestUrlForNote}` : "";
      const nextError = `${msg}${urlNote}`.trim();

      setSyncError(nextError);
      setZohoCrmStatus("Error");

      clientsScreenCache = {
        ...clientsScreenCache,
        syncError: nextError,
        zohoCrmStatus: "Error",
      };

      if (!silent) showToast(`Sync failed: ${msg}`);
    } finally {
      setSyncing(false);
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    syncFromZoho({ silent: true, force: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onExportExcel() {
    const exportRows = filteredAll.length ? filteredAll : clients;

    const header = [
      "Client ID",
      "CRM Client ID",
      "Client Name",
      "Primary Email",
      "Secondary Email",
      "Phone",
      "Status",
      "Zoho Client ID",
      "Zoho Debit Order ID",
      "Billing Cycle",
      "Next Charge Date",
      "Debit Status",
      "Amount",
      "Paystack Customer Code",
      "Paystack Authorization Code",
      "Updated At",
    ];

    const body = exportRows.map((c) => [
      c.id || "",
      getPrimaryCrmId(c),
      c.name || "",
      c.primaryEmail || "",
      c.secondaryEmail || "",
      c.phone || "",
      c.status || "",
      c.zohoClientId || "",
      c.zohoDebitOrderId || "",
      c.debit?.billingCycle || "",
      c.debit?.nextChargeDate || "",
      c.debit?.debitStatus || "",
      c.debit?.amountZar ?? "",
      c.debit?.paystackCustomerCode || "",
      c.debit?.paystackAuthorizationCode || "",
      c.updatedAt || "",
    ]);

    downloadCsv(`tabbytech-clients-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body]);
    showToast("Exported clients to CSV.");
  }

  function goPrev() {
    setPage((p) => Math.max(1, p - 1));
  }

  function goNext() {
    setPage((p) => Math.min(pageCount, p + 1));
  }

  function onViewDebitOrders() {
    if (!selected) return;

    const clientId = getPrimaryCrmId(selected);

    if (!clientId) {
      showToast("CRM client id not available.");
      return;
    }

    if (typeof onOpenDebitOrders === "function") {
      onOpenDebitOrders({ clientId });
      return;
    }

    showToast("Debit Orders navigation not wired in AppShell yet.");
  }

  function onViewBatches() {
    if (!selected) return;

    const clientId = getPrimaryCrmId(selected);
    const batchId = String(selected?.debit?.debitRunBatchId || "").trim();

    if (!clientId) {
      showToast("CRM client id not available.");
      return;
    }

    if (typeof onOpenBatches === "function") {
      onOpenBatches({ clientId, batchId });
      return;
    }

    showToast("Batches navigation not wired in AppShell yet.");
  }

  function onOpenZoho() {
    if (!selected) {
      showToast("Select a client first.");
      return;
    }

    const recordId = getPrimaryCrmId(selected);

    if (!recordId) {
      showToast("Zoho CRM record id is not available for this client.");
      return;
    }

    const url = `https://one.zoho.com/zohoone/emarketingconcepts/home/cxapp/crm/org851960402/tab/CustomModule5/${encodeURIComponent(recordId)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function onOpenEdit() {
    if (!selected) {
      showToast("Select a client first.");
      return;
    }

    try {
      // Fetch fresh details from API to get latest notes from Related List
      const resp = await request(`/api/clients/${encodeURIComponent(selected.id)}`);
      if (resp.ok && resp.data) {
        setEditDraft(deepClone(resp.data));
        
        // Also update the client in the list so the main panel updates
        setClients(prev => prev.map(c => c.id === resp.data.id ? { ...c, notes: resp.data.notes } : c));
      } else {
        setEditDraft(deepClone(selected));
      }
      setEditOpen(true);
    } catch (e) {
      console.error("Failed to fetch client details for edit:", e);
      setEditDraft(deepClone(selected));
      setEditOpen(true);
    }
  }

  function onCloseEdit() {
    setEditOpen(false);
    setEditDraft(null);
  }

  function updateDraft(path, value) {
    setEditDraft((prev) => {
      if (!prev) return prev;
      const next = deepClone(prev);
      const parts = path.split(".");
      let cur = next;
      for (let i = 0; i < parts.length - 1; i += 1) {
        const key = parts[i];
        if (!cur[key] || typeof cur[key] !== "object") cur[key] = {};
        cur = cur[key];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  }

  async function onSaveEdit() {
    if (!editDraft?.id) return;

    const clientPayload = {
      name: editDraft.name,
      primaryEmail: editDraft.primaryEmail,
      secondaryEmail: editDraft.secondaryEmail,
      phone: editDraft.phone,
      industry: editDraft.industry,
      risk: editDraft.risk,
      status: editDraft.status,
      notes: editDraft.notes,
      emailOptOut: !!editDraft.emailOptOut,
    };

    const debitOrderId = safeText(editDraft.zohoDebitOrderId);
    const hasDebitChanges =
      editDraft.debit &&
      (editDraft.debit.billingCycle !== undefined ||
        editDraft.debit.debitStatus !== undefined ||
        editDraft.debit.nextChargeDate !== undefined ||
        editDraft.debit.amountZar !== undefined ||
        editDraft.debit.booksInvoiceId !== undefined ||
        editDraft.debit.retryCount !== undefined ||
        editDraft.debit.paystackCustomerCode !== undefined ||
        editDraft.debit.paystackAuthorizationCode !== undefined ||
        editDraft.debit.failureReason !== undefined);

    try {
      const clientResp = await request(
        `/api/clients/${encodeURIComponent(editDraft.id)}`,
        {
          method: "PUT",
          body: JSON.stringify(clientPayload),
        }
      );
      const serverClient = clientResp?.data || null;

      let serverDebit = null;
      if (debitOrderId && hasDebitChanges) {
        const debitResp = await request(
          `/api/debit-orders/${encodeURIComponent(debitOrderId)}`,
          {
            method: "PUT",
            body: JSON.stringify({
              debit: {
                billingCycle: editDraft.debit?.billingCycle,
                debitStatus: editDraft.debit?.debitStatus,
                nextChargeDate: editDraft.debit?.nextChargeDate,
                amountZar: editDraft.debit?.amountZar,
                booksInvoiceId: editDraft.debit?.booksInvoiceId,
                retryCount: editDraft.debit?.retryCount,
                paystackCustomerCode: editDraft.debit?.paystackCustomerCode,
                paystackAuthorizationCode:
                  editDraft.debit?.paystackAuthorizationCode,
                failureReason: editDraft.debit?.failureReason,
              },
            }),
          }
        );
        serverDebit = debitResp?.data || null;
      }

      const nextUpdated = {
        ...editDraft,
        ...(serverClient || {}),
        debit: serverDebit
          ? {
              ...editDraft.debit,
              billingCycle: serverDebit.billingCycle,
              debitStatus: serverDebit.status || serverDebit.debitStatus,
              nextChargeDate: serverDebit.nextChargeDate,
              amountZar: Number(serverDebit.amount ?? editDraft.debit?.amountZar ?? 0),
              booksInvoiceId: serverDebit.booksInvoiceId,
              retryCount: serverDebit.retryCount,
              paystackCustomerCode: serverDebit.paystackCustomerCode,
              paystackAuthorizationCode: serverDebit.paystackAuthorizationCode,
              failureReason: serverDebit.failureReason,
            }
          : editDraft.debit,
        updatedAt:
          serverClient?.updatedAt ||
          serverDebit?.updatedAt ||
          new Date().toISOString(),
      };

      setClients((prev) =>
        prev.map((item) => (item.id === nextUpdated.id ? nextUpdated : item))
      );
      setSelectedId(nextUpdated.id);
      onCloseEdit();
      showToast("Client details saved.");
    } catch (e) {
      showToast(`Failed to save client: ${String(e?.message || e)}`);
    }
  }

  const css = `
  .tt-clients {
    width: 100%;
    height: 100%;
    color: rgba(255,255,255,0.92);
    --tt-purple: rgba(124,58,237,0.98);
    --tt-purple2: rgba(168,85,247,0.98);
    --tt-purple3: rgba(99,36,206,0.98);
  }

  .tt-clientsWrap {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
  }

  .tt-clientsHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .tt-clientsTitleWrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tt-clientsH1 {
    margin: 0;
    font-size: 26px;
    letter-spacing: 0.2px;
    color: rgba(255,255,255,0.96);
    font-weight: 900;
  }

  .tt-clientsSub {
    margin: 0;
    font-size: 13px;
    color: rgba(255,255,255,0.62);
    line-height: 1.4;
    max-width: 980px;
  }

  .tt-actionsRow {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .tt-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(420px, 1fr);
    gap: 16px;
    min-height: 0;
    flex: 1;
  }

  .tt-glass {
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.10);
    background:
      linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
    box-shadow:
      0 18px 50px rgba(0,0,0,0.35),
      inset 0 1px 0 rgba(255,255,255,0.04);
    backdrop-filter: blur(14px);
    overflow: hidden;
    min-height: 0;
  }

  .tt-panelHeader {
    padding: 16px 16px 12px 16px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.10);
  }

  .tt-phLeft {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .tt-phTitle {
    margin: 0;
    font-size: 14px;
    font-weight: 800;
    color: rgba(255,255,255,0.90);
  }

  .tt-phMeta {
    margin: 0;
    font-size: 12px;
    color: rgba(255,255,255,0.56);
    line-height: 1.45;
  }

  .tt-panelHeaderActions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
    flex: 0 0 auto;
  }

  .tt-toolbar {
    padding: 14px 16px;
    display: grid;
    grid-template-columns: minmax(320px, 1fr) auto;
    gap: 14px 16px;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background:
      linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.06) 100%);
  }

  .tt-toolbarSearch {
    min-width: 0;
  }

  .tt-toolbarChips {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tt-inputWrap {
    position: relative;
    width: 100%;
    max-width: 560px;
  }

  .tt-inputIcon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.75;
  }

  .tt-input {
    width: 100%;
    height: 40px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.12);
    background:
      linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(255,255,255,0.03) 100%);
    color: rgba(255,255,255,0.90);
    outline: none;
    padding: 0 14px 0 40px;
    font-size: 13px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
  }

  .tt-input:focus {
    border-color: rgba(124,58,237,0.45);
    box-shadow: 0 0 0 6px rgba(124,58,237,0.16);
  }

  .tt-chipRow {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  .tt-chip {
    height: 34px;
    padding: 0 12px;
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
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      background 160ms ease,
      border-color 160ms ease;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
  }

  .tt-chip:hover {
    transform: translateY(-1px);
    background: rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.16);
    box-shadow: 0 10px 24px rgba(0,0,0,0.24);
  }

  .tt-chipActive {
    border-color: rgba(124,58,237,0.55);
    background:
      linear-gradient(135deg, rgba(168,85,247,0.22), rgba(124,58,237,0.12));
    color: rgba(255,255,255,0.94);
    box-shadow:
      0 10px 26px rgba(124,58,237,0.16),
      inset 0 1px 0 rgba(255,255,255,0.03);
  }

  .tt-tableWrap {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .tt-tableScroll {
    overflow: auto;
    height: 100%;
  }

  .tt-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
    table-layout: fixed;
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
    background: rgba(10,10,14,0.80);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(10px);
  }

  .tt-td {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.78);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tt-tr {
    cursor: pointer;
    transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease;
  }

  .tt-trHover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(0,0,0,0.22);
    background: rgba(255,255,255,0.04);
  }

  .tt-trActive {
    background: rgba(124,58,237,0.14);
  }

  .tt-nameCell {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }

  .tt-nameRow {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .tt-name {
    font-weight: 900;
    color: rgba(255,255,255,0.92);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tt-subId {
    font-size: 12px;
    color: rgba(255,255,255,0.55);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

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

  .tt-pillZoho {
    border-color: rgba(124,58,237,0.38);
    background: rgba(124,58,237,0.16);
  }

  .tt-badge {
    height: 22px;
    padding: 0 10px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.2px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    flex: 0 0 auto;
  }

  .tt-bActive {
    border-color: rgba(34,197,94,0.30);
    background: rgba(34,197,94,0.14);
    color: rgba(255,255,255,0.86);
  }

  .tt-bPaused {
    border-color: rgba(245,158,11,0.32);
    background: rgba(245,158,11,0.16);
    color: rgba(255,255,255,0.86);
  }

  .tt-bRisk {
    border-color: rgba(239,68,68,0.32);
    background: rgba(239,68,68,0.16);
    color: rgba(255,255,255,0.86);
  }

  .tt-bNew {
    border-color: rgba(124,58,237,0.32);
    background: rgba(124,58,237,0.16);
    color: rgba(255,255,255,0.90);
  }

  .tt-right {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    overflow: auto;
  }

  .tt-split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .tt-stat {
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.10);
    background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%);
    padding: 12px;
  }

  .tt-statLabel {
    margin: 0;
    font-size: 12px;
    color: rgba(255,255,255,0.55);
  }

  .tt-statValue {
    margin: 6px 0 0 0;
    font-size: 18px;
    font-weight: 900;
    color: rgba(255,255,255,0.92);
    letter-spacing: 0.2px;
  }

  .tt-section {
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.10);
    background:
      radial-gradient(circle at top right, rgba(124,58,237,0.08), transparent 26%),
      rgba(0,0,0,0.16);
    padding: 14px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
  }

  .tt-sectionTitle {
    margin: 0;
    font-size: 12px;
    font-weight: 900;
    color: rgba(255,255,255,0.82);
    letter-spacing: 0.2px;
    text-transform: uppercase;
  }

  .tt-kv {
    display: grid;
    grid-template-columns: 170px 1fr;
    gap: 10px;
    margin-top: 10px;
  }

  .tt-k {
    font-size: 12px;
    color: rgba(255,255,255,0.55);
  }

  .tt-v {
    font-size: 13px;
    color: rgba(255,255,255,0.84);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tt-divider {
    height: 1px;
    background: rgba(255,255,255,0.08);
    margin: 10px 0;
  }

  .tt-btn {
    height: 34px;
    padding: 0 14px;
    border-radius: 11px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.88);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
    transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease, filter 160ms ease;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.15px;
    white-space: nowrap;
    box-sizing: border-box;
  }

  .tt-btn:hover {
    transform: translateY(-1px);
  }

  .tt-btn:active {
    transform: translateY(0px);
  }

  .tt-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    filter: none;
  }

  .tt-btnPrimary {
    background: linear-gradient(135deg, var(--tt-purple2), var(--tt-purple));
    border-color: rgba(168,85,247,0.55);
    color: #fff;
    box-shadow: 0 0 18px rgba(168,85,247,0.18), 0 10px 24px rgba(124,58,237,0.22);
  }

  .tt-btnPrimary:hover {
    filter: brightness(1.05);
    box-shadow: 0 0 22px rgba(168,85,247,0.22), 0 12px 28px rgba(124,58,237,0.26);
  }

  .tt-btnSecondary {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.14);
    color: rgba(255,255,255,0.88);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
  }

  .tt-btnSecondary:hover {
    background: rgba(255,255,255,0.10);
    border-color: rgba(255,255,255,0.18);
    box-shadow: 0 10px 24px rgba(0,0,0,0.24);
  }

  .tt-toastWrap {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 90;
  }

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

  .tt-ddWrap {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }

  .tt-ddLabel {
    font-size: 12px;
    color: rgba(255,255,255,0.55);
    font-weight: 800;
  }

  .tt-ddRel {
    position: relative;
    display: inline-block;
  }

  .tt-ddBtn {
    height: 34px;
    padding: 0 12px;
    border-radius: 11px;
    border: 1px solid rgba(168,85,247,0.40);
    background: rgba(0,0,0,0.42);
    color: rgba(255,255,255,0.92);
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.15px;
    min-width: 130px;
    box-sizing: border-box;
  }

  .tt-ddBtnOpen {
    background: rgba(168,85,247,0.16);
  }

  .tt-ddCaret {
    opacity: 0.95;
  }

  .tt-ddMenu {
    position: absolute;
    top: 40px;
    left: 0;
    min-width: 190px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(10,10,14,0.92);
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

  .tt-pselectWrap {
    position: relative;
    width: 100%;
  }

  .tt-pselectBtn {
    width: 100%;
    height: 40px;
    padding: 0 12px;
    border-radius: 14px;
    border: 1px solid rgba(168,85,247,0.18);
    background:
      linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
      rgba(3,4,12,0.72);
    color: rgba(255,255,255,0.94);
    outline: none;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.15px;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      border-color 160ms ease,
      background 160ms ease;
  }

  .tt-pselectBtn:hover {
    transform: translateY(-1px);
  }

  .tt-pselectBtnOpen {
    border-color: rgba(168,85,247,0.48);
    box-shadow:
      0 0 0 5px rgba(124,58,237,0.16),
      inset 0 1px 0 rgba(255,255,255,0.03);
    background:
      linear-gradient(180deg, rgba(168,85,247,0.10), rgba(255,255,255,0.02)),
      rgba(3,4,12,0.72);
  }

  .tt-pselectValue {
    color: rgba(255,255,255,0.94);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tt-pselectPlaceholder {
    color: rgba(255,255,255,0.46);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tt-pselectCaret {
    opacity: 0.95;
    flex: 0 0 auto;
  }

  .tt-pselectMenu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    border-radius: 14px;
    border: 1px solid rgba(168,85,247,0.24);
    background: rgba(10,10,14,0.96);
    box-shadow:
      0 18px 50px rgba(0,0,0,0.45),
      0 0 0 1px rgba(168,85,247,0.08);
    backdrop-filter: blur(14px);
    overflow: hidden;
    z-index: 1400;
  }

  .tt-pselectItem {
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

  .tt-pselectItem:hover {
    background: rgba(168,85,247,0.12);
  }

  .tt-pselectItemActive {
    background: linear-gradient(135deg, rgba(168,85,247,0.24), rgba(124,58,237,0.14));
    color: rgba(255,255,255,0.96);
  }

  .tt-pselectTick {
    width: 18px;
    height: 18px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(168,85,247,0.25);
    border: 1px solid rgba(168,85,247,0.35);
    font-weight: 900;
    flex: 0 0 auto;
  }

  .tt-editOverlay {
    position: fixed;
    inset: 0;
    background: rgba(3, 6, 18, 0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 1100;
    animation: ttFadeIn 180ms ease;
  }

  .tt-editDrawer {
    position: fixed;
    top: 16px;
    right: 16px;
    bottom: 16px;
    width: min(560px, calc(100vw - 32px));
    border-radius: 24px;
    border: 1px solid rgba(161, 110, 255, 0.22);
    background:
      linear-gradient(180deg, rgba(12,16,40,0.96) 0%, rgba(14,10,34,0.97) 100%);
    box-shadow:
      0 20px 80px rgba(0,0,0,0.45),
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 0 0 1px rgba(140,90,255,0.08);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 1101;
    animation: ttSlideIn 220ms ease-out;
  }

  .tt-editHead {
    padding: 16px 16px 14px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex: 0 0 auto;
    background:
      radial-gradient(circle at top right, rgba(140,90,255,0.12), transparent 45%);
  }

  .tt-editTitle {
    margin: 0;
    font-size: 18px;
    font-weight: 900;
    color: rgba(255,255,255,0.96);
    letter-spacing: 0.2px;
  }

  .tt-editSub {
    margin: 6px 0 0 0;
    font-size: 12px;
    color: rgba(255,255,255,0.62);
    line-height: 1.4;
  }

  .tt-editBody {
    padding: 14px;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1 1 auto;
    min-height: 0;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  .tt-editSection {
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.10);
    background:
      linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
    padding: 12px;
  }

  .tt-editSectionTitle {
    margin: 0 0 10px 0;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.2px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.82);
  }

  .tt-formGrid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .tt-formField {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .tt-formFieldFull {
    grid-column: 1 / -1;
  }

  .tt-label {
    font-size: 12px;
    color: rgba(255,255,255,0.62);
    font-weight: 800;
  }

  .tt-inputDark,
  .tt-textareaDark,
  .tt-selectDark {
    width: 100%;
    border-radius: 14px;
    border: 1px solid rgba(168,85,247,0.18);
    background:
      linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
      rgba(3,4,12,0.72);
    color: rgba(255,255,255,0.94);
    outline: none;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
    box-sizing: border-box;
  }

  .tt-inputDark,
  .tt-selectDark {
    height: 40px;
    padding: 0 12px;
    font-size: 13px;
  }

  .tt-textareaDark {
    min-height: 88px;
    padding: 12px;
    font-size: 13px;
    resize: vertical;
  }

  .tt-inputDark:focus,
  .tt-textareaDark:focus,
  .tt-selectDark:focus {
    border-color: rgba(168,85,247,0.48);
    box-shadow:
      0 0 0 5px rgba(124,58,237,0.16),
      inset 0 1px 0 rgba(255,255,255,0.03);
  }

  .tt-editFoot {
    padding: 14px 16px;
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: rgba(0,0,0,0.18);
    flex: 0 0 auto;
  }

  @keyframes ttSlideIn {
    from { transform: translateX(110%); opacity: 0.8; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes ttFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }


  @media (max-width: 1380px) {
    .tt-toolbar {
      grid-template-columns: 1fr;
      align-items: stretch;
    }

    .tt-toolbarChips {
      justify-content: flex-start;
    }
  }

  @media (max-width: 1100px) {
    .tt-grid { grid-template-columns: 1fr; }
    .tt-kv { grid-template-columns: 1fr; }
    .tt-split { grid-template-columns: 1fr; }
    .tt-panelHeader {
      flex-direction: column;
      align-items: stretch;
    }
    .tt-panelHeaderActions {
      justify-content: flex-start;
    }
  }

  @media (max-width: 760px) {
    .tt-formGrid2 { grid-template-columns: 1fr; }
    .tt-editDrawer {
      top: 12px;
      right: 12px;
      bottom: 12px;
      width: calc(100vw - 24px);
      border-radius: 20px;
    }
    .tt-actionsRow { width: 100%; justify-content: flex-start; }
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
                  {filteredAll.length} total · Showing page {page} of {pageCount} · Zoho CRM: <b style={{ color: zohoCrmStatus === "Error" ? "#ef4444" : "inherit" }}>{zohoCrmStatus}</b>
                </p>
              </div>

              <div className="tt-panelHeaderActions">
                <RecordsDropdown
                  value={perPage}
                  disabled={false}
                  onChange={(n) => {
                    const v = Number(n);
                    setPerPage(Number.isFinite(v) ? v : 10);
                    setPage(1);
                  }}
                />

                <button type="button" className="tt-btn tt-btnPrimary" onClick={goPrev} disabled={page <= 1}>
                  Back
                </button>

                <button type="button" className="tt-btn tt-btnPrimary" onClick={goNext} disabled={page >= pageCount}>
                  Next
                </button>

                <button
                  type="button"
                  className="tt-btn tt-btnPrimary"
                  onClick={() => syncFromZoho({ force: true })}
                  disabled={syncing}
                >
                  {syncing ? "Syncing..." : "Sync now"}
                </button>
              </div>
            </div>

            {syncError && (
              <div style={{
                background: "rgba(239,68,68,0.12)",
                borderBottom: "1px solid rgba(239,68,68,0.25)",
                padding: "12px 16px",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
                fontWeight: "600",
                flexShrink: 0
              }}>
                <span style={{ fontSize: "18px" }}>⚠️</span>
                <span>{syncError}</span>
              </div>
            )}

            <div className="tt-toolbar">
              <div className="tt-toolbarSearch">
                <div className="tt-inputWrap">
                  <span className="tt-inputIcon">
                    <IconSearch />
                  </span>
                  <input
                    className="tt-input"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by name, CRM id, email, local id, or customer code"
                    aria-label="Search clients"
                  />
                </div>
              </div>

              <div className="tt-toolbarChips">
                <div className="tt-chipRow">
                  {["All", "Active", "Paused", "Risk", "New"].map((k) => {
                    const active = statusFilter === k;
                    return (
                      <div
                        key={k}
                        className={active ? "tt-chip tt-chipActive" : "tt-chip"}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setStatusFilter(k);
                          setPage(1);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setStatusFilter(k);
                            setPage(1);
                          }
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
            </div>

            <div className="tt-tableScroll">
              <table className="tt-table">
                <thead>
                  <tr>
                    <th className="tt-th" style={{ width: "36%" }}>Client</th>
                    <th className="tt-th" style={{ width: "14%" }}>Source</th>
                    <th className="tt-th" style={{ width: "14%" }}>Debit status</th>
                    <th className="tt-th" style={{ width: "14%" }}>Next charge</th>
                    <th className="tt-th" style={{ width: "10%" }}>Amount</th>
                    <th className="tt-th" style={{ width: "12%" }}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {initialLoading && (
                    <ShimmerTableRows rows={8} cols={6} />
                  )}

                  {!initialLoading &&
                    filtered.map((c) => {
                      const isActive = c.id === selectedId;
                      const isHover = hoverId === c.id;
                      const crmId = getPrimaryCrmId(c);
                      const trClass = ["tt-tr", isActive ? "tt-trActive" : "", isHover ? "tt-trHover" : ""].join(" ").trim();

                      return (
                        <tr
                          key={c.id}
                          className={trClass}
                          onMouseEnter={() => setHoverId(c.id)}
                          onMouseLeave={() => setHoverId("")}
                          onClick={() => setSelectedId(c.id)}
                        >
                          <td className="tt-td">
                            <div className="tt-nameCell">
                              <div className="tt-nameRow">
                                <span className="tt-name">{c.name}</span>
                                <span className={statusBadgeClass(c.status)}>{c.status}</span>
                              </div>
                              <span className="tt-subId" title={crmId || c.id}>
                                CRM ID: {crmId || "Not set"}
                              </span>
                            </div>
                          </td>

                          <td className="tt-td">
                            <span className="tt-pill tt-pillZoho">
                              <Dot />
                              Zoho
                            </span>
                          </td>

                          <td className="tt-td">{c.debit?.debitStatus || "None"}</td>
                          <td className="tt-td">{c.debit?.nextChargeDate ? fmtDateShort(c.debit.nextChargeDate) : "Not set"}</td>
                          <td className="tt-td">{currencyZar(c.debit?.amountZar || 0)}</td>
                          <td className="tt-td">{fmtDateTimeShort(c.updatedAt)}</td>
                        </tr>
                      );
                    })}

                  {!initialLoading && filteredAll.length === 0 && (
                    <tr>
                      <td className="tt-td" colSpan={6} style={{ padding: 20, whiteSpace: "normal" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.90)" }}>No clients found</div>
                          <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, lineHeight: 1.4 }}>
                            Try a different search term or adjust the filters.
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="tt-glass" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="tt-panelHeader">
              <div className="tt-phLeft">
                <p className="tt-phTitle">Client details</p>
                <p className="tt-phMeta">Selection updates this panel</p>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button type="button" className="tt-btn tt-btnPrimary" onClick={onOpenEdit} disabled={!selected}>
                  Edit
                </button>
              </div>
            </div>

            <div className="tt-right">
              {!selected ? (
                <div className="tt-section" style={{ color: "rgba(255,255,255,0.70)" }}>
                  Select a client to view details.
                </div>
              ) : detailsLoading ? (
                <div className="tt-section">
                  <ShimmerPanel rows={10} />
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

                      <div className="tt-k">CRM client id</div>
                      <div className="tt-v">{getPrimaryCrmId(selected) || "Not set"}</div>

                      <div className="tt-k">Local client id</div>
                      <div className="tt-v">{selected.id || "Not set"}</div>

                      <div className="tt-k">Source</div>
                      <div className="tt-v">Zoho CRM sync</div>

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
                      <button type="button" className="tt-btn tt-btnPrimary" onClick={onViewDebitOrders}>
                        View debit orders
                      </button>
                      <button type="button" className="tt-btn tt-btnPrimary" onClick={onOpenZoho}>
                        Open in Zoho CRM
                      </button>
                    </div>
                  </div>

                  <div className="tt-section">
                    <p className="tt-sectionTitle">Debit profile</p>

                    <div className="tt-kv">
                      <div className="tt-k">Billing cycle</div>
                      <div className="tt-v">{selected.debit?.billingCycle || "Not set"}</div>

                      <div className="tt-k">Next charge date</div>
                      <div className="tt-v">
                        {selected.debit?.nextChargeDate
                          ? fmtDateShort(selected.debit.nextChargeDate)
                          : "Not set"}
                      </div>

                      <div className="tt-k">Last attempt date</div>
                      <div className="tt-v">
                        {selected.debit?.lastAttemptDate
                          ? fmtDateTimeLong(selected.debit.lastAttemptDate)
                          : "Not set"}
                      </div>

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

                    <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>
                      Actions like onboarding will be added later once backend workflows are ready.
                    </div>
                  </div>

                  <div className="tt-section">
                    <p className="tt-sectionTitle">Notes</p>
                    <p
                      style={{
                        margin: "10px 0 0 0",
                        color: "rgba(255,255,255,0.70)",
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
                      {selected.notes || "No notes yet."}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {editOpen && editDraft ? (
          <EditDrawer
            editDraft={editDraft}
            onCloseEdit={onCloseEdit}
            updateDraft={updateDraft}
            onSaveEdit={onSaveEdit}
          />
        ) : null}

        {toast ? (
          <div className="tt-toastWrap">
            <div className="tt-toast">{toast}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
