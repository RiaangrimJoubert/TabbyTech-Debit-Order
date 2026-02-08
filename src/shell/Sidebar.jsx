const nav = [
  { label: "Dashboard", icon: "▦" },
  { label: "Clients", icon: "👥" },
  { label: "Debit Orders", icon: "↻" },
  { label: "Batches", icon: "⧉" },
  { label: "Reports", icon: "📈" },
];

export default function Sidebar() {
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
          {nav.map((item) => (
            <button key={item.label} type="button" className="tt-sidenav-item">
              <span className="tt-sidenav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="tt-sidenav-label">{item.label}</span>
              <span className="tt-sidenav-pill" aria-hidden="true" />
            </button>
          ))}
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

        <button type="button" className="tt-sidenav-item tt-sidenav-item-muted">
          <span className="tt-sidenav-icon" aria-hidden="true">
            ⚙
          </span>
          <span className="tt-sidenav-label">Settings</span>
        </button>

        <button type="button" className="tt-sidenav-item tt-sidenav-item-muted">
          <span className="tt-sidenav-icon" aria-hidden="true">
            ⎋
          </span>
          <span className="tt-sidenav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
