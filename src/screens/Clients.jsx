// src/screens/Clients.jsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchZohoClients } from "../api/crm";

/**
 * Generates a simple incrementing ID for manual clients.
 */
function nextClientId(currentClients) {
  const manualCount = currentClients.filter(c => c.source === "manual").length;
  return `MAN-${1000 + manualCount + 1}`;
}

export default function Clients() {
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

  // Memoized Selections and Filtering
  const selected = useMemo(
    () => clients.find((c) => c.id === selectedId) || null,
    [clients, selectedId]
  );

  const counts = useMemo(() => {
    const base = { All: clients.length, Active: 0, Paused: 0, Risk: 0, New: 0 };
    for (const c of clients) {
      if (base[c.status] !== undefined) base[c.status]++;
    }
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
          (c.zohoClientId || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [clients, query, statusFilter, sourceFilter]);

  /**
   * Main Sync Logic: Connects to the /crm_api/api/clients endpoint
   */
  async function syncFromZoho({ silent = false } = {}) {
    try {
      setSyncError("");
      setSyncing(true);
      setZohoCrmStatus("Loading");

      const resp = await fetchZohoClients({ page: 1, perPage: 200 });
      setLastRequestUrl(resp.requestUrl || "");

      if (!resp.ok) {
        throw new Error(resp?.raw?.error || "Zoho sync failed.");
      }

      const zohoClients = Array.isArray(resp.clients) ? resp.clients : [];

      setClients((prev) => {
        const manual = prev.filter((c) => c.source === "manual");
        const next = [...zohoClients, ...manual];

        // Maintain selection if it still exists
        if (!selectedId && next[0]?.id) {
          setSelectedId(next[0].id);
        }
        return next;
      });

      setZohoCrmStatus("Connected");
      if (!silent) showToast(`Synced ${zohoClients.length} client(s) from Zoho.`);
    } catch (e) {
      const msg = e?.message || String(e);
      setSyncError(msg);
      setZohoCrmStatus("Error");
      if (!silent) showToast(`Sync failed: ${msg}`);
    } finally {
      setSyncing(false);
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    syncFromZoho({ silent: true });
  }, []);

  // Manual Create Logic
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", email: "", phone: "", industry: "", notes: "",
  });

  const createDuplicate = useMemo(() => {
    const email = (createForm.email || "").trim().toLowerCase();
    if (!email) return null;
    return clients.find((c) => (c.primaryEmail || "").trim().toLowerCase() === email);
  }, [createForm.email, clients]);

  function createClient() {
    const name = createForm.name.trim();
    const email = createForm.email.trim();

    if (!name || !email) return showToast("Name and Email are required.");
    if (createDuplicate) return showToast("A client with this email already exists.");

    const next = {
      id: nextClientId(clients),
      source: "manual",
      name,
      primaryEmail: email,
      phone: createForm.phone.trim(),
      industry: createForm.industry.trim(),
      status: "New",
      debit: { amountZar: 0, debitStatus: "None" },
      updatedAt: new Date().toISOString(),
      notes: createForm.notes.trim(),
    };

    setClients((prev) => [next, ...prev]);
    setSelectedId(next.id);
    setCreateOpen(false);
    setCreateForm({ name: "", email: "", phone: "", industry: "", notes: "" });
    showToast("Client created locally.");
  }

  // Edit Logic
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);

  function openEdit() {
    if (!selected) return;
    setEditForm({ ...selected });
    setEditOpen(true);
  }

  function saveEdit() {
    if (!editForm) return;
    if (!editForm.name.trim() || !editForm.primaryEmail.trim()) {
      return showToast("Name and Email are required.");
    }

    setClients((prev) =>
      prev.map((c) => (c.id === editForm.id ? { ...editForm, updatedAt: new Date().toISOString() } : c))
    );
    setEditOpen(false);
    showToast("Changes saved.");
  }

  return (
    <div className="p-6">
      {/* Header & Sync Status */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <div className="flex items-center gap-4">
          {syncError && <span className="text-red-500 text-sm">Error: {syncError}</span>}
          <button 
            onClick={() => syncFromZoho()} 
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync Zoho CRM"}
          </button>
        </div>
      </div>

      {/* Main UI would go here (Filters, List, Detail View) */}
      {initialLoading ? (
        <p>Loading clients...</p>
      ) : (
        <div className="grid grid-cols-12 gap-6">
           {/* Example of how to map the list */}
           <div className="col-span-4 border rounded p-4">
             {filtered.map(client => (
               <div 
                 key={client.id}
                 onClick={() => setSelectedId(client.id)}
                 className={`p-2 cursor-pointer ${selectedId === client.id ? 'bg-blue-100' : ''}`}
               >
                 {client.name}
               </div>
             ))}
           </div>
           
           {/* Example detail view */}
           <div className="col-span-8 border rounded p-4">
             {selected ? (
               <div>
                 <h2 className="text-xl font-bold">{selected.name}</h2>
                 <p>{selected.primaryEmail}</p>
                 <button onClick={openEdit} className="mt-4 text-blue-600 underline">Edit Client</button>
               </div>
             ) : (
               <p>Select a client to view details</p>
             )}
           </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
