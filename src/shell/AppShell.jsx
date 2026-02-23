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

  // Presets used when we jump from Clients -> Debit Orders
  const [debitOrdersPreset, setDebitOrdersPreset] = useState({
    presetSearch: "",
    presetFocusCustomerCode: "",
  });

  const pageTitle = useMemo(() => TITLES[activeKey] || "Dashboard", [activeKey]);

  function openDebitOrdersFromClients(payload) {
    let search = "";
    let focusCustomerCode = "";

    // Supports BOTH:
    // onOpenDebitOrders("CUS_xxx")
    // onOpenDebitOrders({ search: "CUS_xxx", focusCustomerCode: "CUS_xxx" })
    if (typeof payload === "string") {
      search = payload;
      focusCustomerCode = payload;
    } else if (payload && typeof payload === "object") {
      search = String(payload.search || payload.presetSearch || "").trim();
      focusCustomerCode = String(payload.focusCustomerCode || payload.presetFocusCustomerCode || "").trim();
    }

    const finalSearch = (focusCustomerCode || search || "").trim();

    setDebitOrdersPreset({
      presetSearch: finalSearch,
      presetFocusCustomerCode: (focusCustomerCode || finalSearch || "").trim(),
    });

    // Switch view safely with existing AppShell navigation
    setActiveKey("debitorders");
  }

  const content = useMemo(() => {
    if (activeKey === "clients") {
      return <Clients onOpenDebitOrders={(payload) => openDebitOrdersFromClients(payload)} />;
    }

    if (activeKey === "debitorders") {
      return (
        <DebitOrders
          presetSearch={debitOrdersPreset.presetSearch}
          presetFocusCustomerCode={debitOrdersPreset.presetFocusCustomerCode}
        />
      );
    }

    if (activeKey === "batches") return <Batches />;
    if (activeKey === "invoices") return <Invoices />;
    if (activeKey === "reports") return <Reports />;
    if (activeKey === "settings") return <Settings />;
    return <Dashboard />;
  }, [activeKey, debitOrdersPreset.presetSearch, debitOrdersPreset.presetFocusCustomerCode]);

  return (
    <div className="tt-appshell">
      <Sidebar activeKey={activeKey} onNavigate={(key) => setActiveKey(key)} onLogout={() => onLogout?.()} />

      <main className="tt-shell-main">
        <header className="tt-shell-topbar">
          <div>
            <div className="tt-shell-kicker">TabbyTech</div>
            <div className="tt-shell-h1">{pageTitle}</div>
          </div>

          <div className="tt-shell-actions">
            <div className="tt-shell-search">
              <span className="tt-shell-searchicon">⌕</span>
              <input className="tt-shell-searchinput" placeholder="Search clients, batches, reports" aria-label="Search" />
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
