// src/shell/Sidebar.jsx
import React from "react";

const nav = [
  { key: "dashboard", label: "Dashboard", icon: "▦" },
  { key: "clients", label: "Clients", icon: "CLIENTS_SVG" },
  { key: "debitorders", label: "Debit Orders", icon: "↻" },
  { key: "batches", label: "Batches", icon: "⧉" },
  { key: "invoices", label: "Invoices", icon: "🧾" },
  { key: "reports", label: "Reports", icon: "📈" },
  { key: "settings", label: "Settings", icon: "⚙" },
];

function ClientsIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 11c1.656 0 3-1.567 3-3.5S17.656 4 16 4s-3 1.567-3 3.5S14.344 11 16 11Z"
        fill="#ffffff"
        opacity="0.92"
      />
      <path
        d="M8 11c1.656 0 3-1.567 3-3.5S9.656 4 8 4 5 5.567 5 7.5 6.344 11 8 11Z"
        fill="#ffffff"
        opacity="0.92"
      />
      <path
        d="M16 13c-1.86 0-3.33.61-4.09 1.24.67.93 1.09 2.08 1.09 3.36V20h8v-1.6c0-3.02-2.35-5.4-5-5.4Z"
        fill="#ffffff"
        opacity="0.92"
      />
      <path
        d="M8 13c-2.76 0-5 2.38-5 5.4V20h10v-1.6c0-3.02-2.24-5.4-5-5.4Z"
        fill="#ffffff"
        opacity="0.92"
      />
    </svg>
  );
}

export default function Sidebar({ activeKey, onNavigate, onLogout }) {
  return (
    <aside className="tt-sidebar">
      <div className="tt-sidebar-inner">
        <div className="tt-sidebrand">
          {/* Brand mark (uses TabbyTech logo from /public/tabbytech-logo.png) */}
          <div className="tt-sidebrand-mark" aria-hidden="true">
            <img
              src="/tabbytech-logo.png"
              alt="TabbyTech"
              className="tt-sidebrand-logo"
              draggable={false}
            />
          </div>

          {/* Brand text */}
          <div className="tt-sidebrand-text">
            <div className="tt-sidebrand-name">TabbyPay</div>
            <div className="tt-sidebrand-sub">by TabbyTech</div>
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
                <span className="tt-sidenav-icon" aria-hidden="true">
                  {item.icon === "CLIENTS_SVG" ? <ClientsIcon /> : item.icon}
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
