const nav = [
  { key: "dashboard", label: "Dashboard", icon: "▦" },
  { key: "clients", label: "Clients", icon: "👥", forceWhite: true },
  { key: "debitorders", label: "Debit Orders", icon: "↻" },
  { key: "batches", label: "Batches", icon: "⧉" },
  { key: "invoices", label: "Invoices", icon: "🧾" },
  { key: "reports", label: "Reports", icon: "📈" },
  { key: "settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar({ activeKey, onNavigate, onLogout }) {
  return (
    <aside className="tt-sidebar">
      <div className="tt-sidebar-inner">
        <div className="tt-sidebrand">
          <div className="tt-sidebrand-mark">TT</div>
          <div className="tt-sidebrand-text">
            <div className="tt-sidebrand-name">TabbyTech</div>
            <div className="tt-sidebrand-sub">Debit Orders</div>
          </div>
        </div>

        <div className="tt-sidedivider" />

        <nav className="tt-sidenav" aria-label="Sidebar navigation">
          {nav.map((item) => {
            const isActive = item.key === activeKey;

            return (
              <button
                key={item.key}
                type="button"
                className={`tt-sidenav-item ${isActive ? "is-active" : ""}`}
                onClick={() => onNavigate?.(item.key)}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className="tt-sidenav-icon"
                  aria-hidden="true"
                  style={
                    item.forceWhite
                      ? { color: "#ffffff" }
                      : undefined
                  }
                >
                  {item.icon}
                </span>

                <span className="tt-sidenav-label">{item.label}</span>
                <span className="tt-sidenav-pill" aria-hidden="true" />
              </button>
            );
          })}
        </nav>

        <div className="tt-sidespacer" />

        <div className="tt-sidepanel">
          <div className="tt-sidepanel-title">Tip</div>
          <div className="tt-sidepanel-text">
            Validate bank fields before creating a batch to avoid exceptions.
          </div>
          <button type="button" className="tt-sidepanel-btn">
            View checklist
          </button>
        </div>

        <div className="tt-sidedivider" />

        <button
          type="button"
          className="tt-sidenav-item tt-sidenav-item-muted"
          onClick={() => onLogout?.()}
        >
          <span className="tt-sidenav-icon" aria-hidden="true">
            ⎋
          </span>
          <span className="tt-sidenav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
