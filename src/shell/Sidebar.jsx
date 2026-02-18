// src/shell/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: "▦" },
  { to: "/clients", label: "Clients", icon: "👥" },
  { to: "/debitorders", label: "Debit Orders", icon: "↻" },
  { to: "/invoices", label: "Invoices", icon: "🧾" },
  { to: "/batches", label: "Batches", icon: "⧉" },
  { to: "/reports", label: "Reports", icon: "📈" }
];

export default function Sidebar({ onLogout }) {
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
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `tt-sidenav-item ${isActive ? "is-active" : ""}`
                }
                aria-current={({ isActive }) => (isActive ? "page" : undefined)}
              >
                <span className="tt-sidenav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="tt-sidenav-label">{item.label}</span>
                <span className="tt-sidenav-pill" aria-hidden="true" />
              </NavLink>
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

        <NavLink to="/settings" className="tt-sidenav-item tt-sidenav-item-muted">
          <span className="tt-sidenav-icon" aria-hidden="true">
            ⚙
          </span>
          <span className="tt-sidenav-label">Settings</span>
        </NavLink>

        <button
          type="button"
          className="tt-sidenav-item tt-sidenav-item-muted"
          onClick={onLogout}
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
