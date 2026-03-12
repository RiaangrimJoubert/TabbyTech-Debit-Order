// src/shell/AppShell.jsx
import { useMemo, useState } from "react";
import Sidebar from "./Sidebar";

import Dashboard from "./Dashboard";
import DebitOrderMonitor from "./DebitOrderMonitor";
import NotificationMonitoring from "../screens/NotificationMonitoring";
import Clients from "../screens/Clients";
import DebitOrders from "../screens/DebitOrders";
import Batches from "./Batches";
import Invoices from "../screens/Invoices";
import Reports from "./Reports";
import Settings from "../screens/Settings";

const TITLES = {
  dashboard: "Dashboard",
  clients: "Clients",
  debitorders: "Debit Orders",
  debitordermonitor: "Debit Order Monitor",
  notificationmonitoring: "Notification Monitoring",
  batches: "Batches",
  invoices: "Invoices",
  reports: "Reports",
  settings: "Settings",
};

const MODULE_ALIASES = [
  { key: "dashboard", terms: ["dashboard", "home", "overview"] },
  { key: "clients", terms: ["client", "clients", "customer", "customers"] },
  { key: "debitorders", terms: ["debit order", "debit orders", "orders", "debits"] },
  { key: "debitordermonitor", terms: ["debit monitor", "order monitor", "debit order monitor", "monitor"] },
  { key: "notificationmonitoring", terms: ["notification", "notifications", "notification monitoring", "alerts", "alert"] },
  { key: "batches", terms: ["batch", "batches", "batching"] },
  { key: "invoices", terms: ["invoice", "invoices", "billing"] },
  { key: "reports", terms: ["report", "reports", "reporting"] },
  { key: "settings", terms: ["setting", "settings", "config", "configuration"] },
];

function normalizeQuery(value) {
  return String(value || "").trim().toLowerCase();
}

function extractPrefixedValue(query, prefix) {
  const raw = String(query || "").trim();
  const lower = raw.toLowerCase();
  if (!lower.startsWith(prefix)) return "";
  return raw.slice(prefix.length).trim();
}

function resolveModuleFromQuery(query) {
  const q = normalizeQuery(query);
  if (!q) return "";

  for (const item of MODULE_ALIASES) {
    if (item.terms.some((term) => q === term || q.includes(term))) {
      return item.key;
    }
  }

  return "";
}

export default function AppShell({ onLogout }) {
  const [activeKey, setActiveKey] = useState("dashboard");

  // Presets for cross-module navigation
  const [debitOrdersPresetSearch, setDebitOrdersPresetSearch] = useState("");
  const [debitOrdersPresetFocusClientId, setDebitOrdersPresetFocusClientId] = useState("");
  const [batchesPresetClientId, setBatchesPresetClientId] = useState("");
  const [batchesPresetBatchId, setBatchesPresetBatchId] = useState("");

  // Topbar search
  const [topbarSearch, setTopbarSearch] = useState("");

  const pageTitle = useMemo(() => TITLES[activeKey] || "Dashboard", [activeKey]);

  function clearDebitOrderPresets() {
    setDebitOrdersPresetSearch("");
    setDebitOrdersPresetFocusClientId("");
  }

  function clearBatchPresets() {
    setBatchesPresetClientId("");
    setBatchesPresetBatchId("");
  }

  function navigateTo(key, payload = {}) {
    const nextKey = String(key || "").trim();
    if (!nextKey) return;

    setActiveKey(nextKey);

    if (nextKey !== "debitorders") {
      clearDebitOrderPresets();
    }

    if (nextKey !== "batches") {
      clearBatchPresets();
    }

    if (nextKey === "batches") {
      const nextClientId = String(payload.clientId || "").trim();
      const nextBatchId = String(payload.batchId || payload.batch || "").trim();

      setBatchesPresetClientId(nextClientId);
      setBatchesPresetBatchId(nextBatchId);
    }

    if (nextKey === "debitorders") {
      const nextSearch = String(payload.search || "").trim();
      const nextClientId = String(payload.clientId || payload.focusClientId || "").trim();

      setDebitOrdersPresetSearch(nextSearch);
      setDebitOrdersPresetFocusClientId(nextClientId);
    }
  }

  function onSidebarNavigate(key) {
    navigateTo(key);
  }

  function handleBellClick() {
    navigateTo("notificationmonitoring");
  }

  function handleTopbarSearchSubmit() {
    const raw = String(topbarSearch || "").trim();
    const q = normalizeQuery(raw);

    if (!q) return;

    const batchPrefixed = extractPrefixedValue(raw, "batch:");
    if (batchPrefixed) {
      navigateTo("batches", { batchId: batchPrefixed });
      return;
    }

    const clientPrefixed = extractPrefixedValue(raw, "client:");
    if (clientPrefixed) {
      navigateTo("batches", { clientId: clientPrefixed });
      return;
    }

    const reportPrefixed = extractPrefixedValue(raw, "report:");
    if (reportPrefixed || q === "report" || q === "reports") {
      navigateTo("reports");
      return;
    }

    const matchedModule = resolveModuleFromQuery(raw);
    if (matchedModule) {
      navigateTo(matchedModule);
      return;
    }

    // Safe fallback:
    // If it looks like a batch-style lookup, send it to Batches.
    // Otherwise send it to Clients for a broader operational search context.
    const looksLikeBatchLookup =
      /batch/i.test(raw) ||
      /^[a-z]{2,}-?\d+/i.test(raw) ||
      raw.includes("-");

    if (looksLikeBatchLookup) {
      navigateTo("batches", { batchId: raw });
      return;
    }

    navigateTo("clients");
  }

  const content = useMemo(() => {
    if (activeKey === "clients") {
      return (
        <Clients
          onOpenDebitOrders={({ clientId }) => {
            const id = String(clientId || "").trim();
            if (!id) return;

            setDebitOrdersPresetSearch(id);
            setDebitOrdersPresetFocusClientId(id);
            setActiveKey("debitorders");
          }}
          onOpenBatches={({ clientId, batchId }) => {
            const nextClientId = String(clientId || "").trim();
            const nextBatchId = String(batchId || "").trim();

            setBatchesPresetClientId(nextClientId);
            setBatchesPresetBatchId(nextBatchId);
            setActiveKey("batches");
          }}
        />
      );
    }

    if (activeKey === "debitorders") {
      return (
        <DebitOrders
          presetSearch={debitOrdersPresetSearch}
          presetFocusClientId={debitOrdersPresetFocusClientId}
        />
      );
    }

    if (activeKey === "debitordermonitor") return <DebitOrderMonitor />;
    if (activeKey === "notificationmonitoring") return <NotificationMonitoring />;
    if (activeKey === "batches") {
      return (
        <Batches
          presetClientId={batchesPresetClientId}
          presetBatchId={batchesPresetBatchId}
        />
      );
    }
    if (activeKey === "invoices") return <Invoices />;
    if (activeKey === "reports") return <Reports />;
    if (activeKey === "settings") return <Settings />;

    return (
      <Dashboard
        onNavigate={(key, payload = {}) => {
          navigateTo(key, payload);
        }}
      />
    );
  }, [
    activeKey,
    debitOrdersPresetSearch,
    debitOrdersPresetFocusClientId,
    batchesPresetClientId,
    batchesPresetBatchId,
  ]);

  return (
    <div className="tt-appshell">
      <Sidebar
        activeKey={activeKey}
        onNavigate={(key) => onSidebarNavigate(key)}
        onLogout={() => onLogout?.()}
      />

      <main className="tt-shell-main">
        <header className="tt-shell-topbar">
          <div>
            <div className="tt-shell-kicker">TabbyTech</div>
            <div className="tt-shell-h1">{pageTitle}</div>
          </div>

          <div className="tt-shell-actions">
            <div className="tt-shell-search">
              <span
                className="tt-shell-searchicon"
                role="button"
                tabIndex={0}
                aria-label="Run search"
                onClick={handleTopbarSearchSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleTopbarSearchSubmit();
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                ⌕
              </span>
              <input
                className="tt-shell-searchinput"
                placeholder="Search clients, batches, reports"
                aria-label="Search"
                value={topbarSearch}
                onChange={(e) => setTopbarSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleTopbarSearchSubmit();
                  }
                }}
              />
            </div>

            <button
              className="tt-shell-iconbtn"
              type="button"
              aria-label="Notifications"
              title="Open Notification Monitoring"
              onClick={handleBellClick}
            >
              🔔
            </button>

            <div className="tt-shell-user" role="button" tabIndex={0} aria-label="User menu">
              <div className="tt-shell-avatar">T</div>
              <div>
                <div className="tt-shell-username">TabbyPay</div>
                <div className="tt-shell-userrole">PurAgent</div>
              </div>
            </div>
          </div>
        </header>

        <section className="tt-shell-content">{content}</section>
      </main>
    </div>
  );
}
