import { useMemo, useState } from "react";
import Sidebar from "./Sidebar";

import Dashboard from "./Dashboard";
import Clients from "../screens/Clients";
import DebitOrders from "../screens/DebitOrders";
import Batches from "../screens/Batches";
import Invoices from "../screens/Invoices";
import Reports from "./Reports";
import Settings from "../screens/Settings";

const TITLES = {
  dashboard: "Dashboard",
  clients: "Clients",
  debitorders: "Debit Orders",
  batches: "Batches",
  invoices: "Invoices",
  reports: "Reports",
  settings: "Settings",
};

export default function AppShell({ onLogout }) {
  const [activeKey, setActiveKey] = useState("dashboard");

  // Presets for cross-module navigation
  const [debitOrdersPresetSearch, setDebitOrdersPresetSearch] = useState("");
  const [debitOrdersPresetFocusClientId, setDebitOrdersPresetFocusClientId] = useState("");

  const pageTitle = useMemo(() => TITLES[activeKey] || "Dashboard", [activeKey]);

  function onNavigate(key) {
    setActiveKey(key);

    // Clear presets when user manually navigates away
    if (key !== "debitorders") {
      setDebitOrdersPresetSearch("");
      setDebitOrdersPresetFocusClientId("");
    }
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

    if (activeKey === "batches") return <Batches />;
    if (activeKey === "invoices") return <Invoices />;
    if (activeKey === "reports") return <Reports />;
    if (activeKey === "settings") return <Settings />;
    return <Dashboard />;
  }, [activeKey, debitOrdersPresetSearch, debitOrdersPresetFocusClientId]);

  return (
    <div className="tt-appshell">
      <Sidebar
        activeKey={activeKey}
        onNavigate={(key) => onNavigate(key)}
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
              <span className="tt-shell-searchicon">⌕</span>
              <input
                className="tt-shell-searchinput"
                placeholder="Search clients, batches, reports"
                aria-label="Search"
              />
            </div>

            <button className="tt-shell-iconbtn" type="button" aria-label="Notifications">
              🔔
            </button>

            <div className="tt-shell-user" role="button" tabIndex={0} aria-label="User menu">
              <div className="tt-shell-avatar">T</div>
              <div>
                <div className="tt-shell-username">TabbyTech</div>
                <div className="tt-shell-userrole">Ops</div>
              </div>
            </div>
          </div>
        </header>

        <section className="tt-shell-content">{content}</section>
      </main>
    </div>
  );
}
