import { useMemo, useState } from "react";
import Sidebar from "./Sidebar";

import Dashboard from "./Dashboard";
import Clients from "../screens/Clients";
import DebitOrders from "../screens/DebitOrders";
import Batches from "../screens/Batches";
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

  const pageTitle = useMemo(() => TITLES[activeKey] || "Dashboard", [activeKey]);

  const content = useMemo(() => {
    if (activeKey === "clients") return <Clients />;
    if (activeKey === "debitorders") return <DebitOrders />;
    if (activeKey === "batches") return <Batches />;
    if (activeKey === "invoices") return <InvoicesPlaceholder />;
    if (activeKey === "reports") return <Reports />;
    if (activeKey === "settings") return <Settings />;
    return <Dashboard />;
  }, [activeKey]);

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

function InvoicesPlaceholder() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
        backdropFilter: "blur(14px)",
        padding: 18,
        color: "rgba(255,255,255,0.86)",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>Invoices</div>
      <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, lineHeight: 1.5 }}>
        This is the placeholder screen. Next step we will add the full invoices list with filters and
        a status pill on the far right for Paid, Unpaid, Failed, Pending.
      </div>
    </div>
  );
}
