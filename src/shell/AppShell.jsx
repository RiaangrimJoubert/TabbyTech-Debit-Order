import { useMemo, useEffect, useState } from "react";
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

  // NEW: payload for DebitOrders focus behaviour
  const [debitOrdersPreset, setDebitOrdersPreset] = useState({
    presetSearch: "",
    presetFocusClientId: "",
  });

  // NEW: listen for cross-module navigation requests (Clients -> Debit Orders)
  useEffect(() => {
    function onNav(e) {
      const detail = e?.detail || {};
      const key = String(detail.key || "").trim();
      if (!key) return;

      if (key === "debitorders") {
        setDebitOrdersPreset({
          presetSearch: String(detail.presetSearch || ""),
          presetFocusClientId: String(detail.presetFocusClientId || ""),
        });
        setActiveKey("debitorders");
        return;
      }

      // Default module nav
      setActiveKey(key);
    }

    window.addEventListener("tt:navigate", onNav);
    return () => window.removeEventListener("tt:navigate", onNav);
  }, []);

  const pageTitle = useMemo(() => TITLES[activeKey] || "Dashboard", [activeKey]);

  const content = useMemo(() => {
    if (activeKey === "clients") return <Clients />;
    if (activeKey === "debitorders")
      return (
        <DebitOrders
          presetSearch={debitOrdersPreset.presetSearch}
          presetFocusClientId={debitOrdersPreset.presetFocusClientId}
        />
      );
    if (activeKey === "batches") return <Batches />;
    if (activeKey === "invoices") return <Invoices />;
    if (activeKey === "reports") return <Reports />;
    if (activeKey === "settings") return <Settings />;
    return <Dashboard />;
  }, [activeKey, debitOrdersPreset.presetSearch, debitOrdersPreset.presetFocusClientId]);

  return (
    <div className="tt-appshell">
      <Sidebar
        activeKey={activeKey}
        onNavigate={(key) => setActiveKey(key)}
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
