// src/shell/Sidebar.jsx
import React from "react";

const nav = [
  { key: "dashboard", label: "Dashboard", icon: "▦" },
  { key: "clients", label: "Clients", icon: "CLIENTS_SVG" },
  { key: "debitorders", label: "Debit Orders", icon: "↻" },
  { key: "debitordermonitor", label: "Debit Order Monitor", icon: "◔" },
  { key: "notificationmonitoring", label: "Notification Monitoring", icon: "✉" },
  { key: "batches", label: "Batches", icon: "⧉" },
  { key: "invoices", label: "Invoices", icon: "🧾" },
  { key: "reports", label: "Reports", icon: "📈" },
  { key: "tenants", label: "Tenants", icon: "🏢", adminOnly: true },
];

function getCurrentUserRole() {
  if (typeof window === "undefined") return "admin";
  try {
    const raw = window.localStorage.getItem("tt_user");
    if (!raw) return "admin";
    const parsed = JSON.parse(raw);
    const role = String(
      parsed?.role ||
      parsed?.role_name ||
      parsed?.role_details?.role_name ||
      ""
    ).trim().toLowerCase();
    return role === "tenant" ? "tenant" : "admin";
  } catch {
    return "admin";
  }
}

const SIDEBAR_LOGO_URL =
  "https://raw.githubusercontent.com/RiaangrimJoubert/TabbyTech-Debit-Order/refs/heads/main/public/WP%20LOGO%20(1).png";

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
  const role = getCurrentUserRole();
  const visibleNav = nav.filter((item) => !(item.adminOnly && role !== "admin"));
  const showSettings = role === "admin";

  return (
    <aside className="tt-sidebar">
      <div className="tt-sidebar-inner">
        <div
          className="tt-sidebrand"
          style={{
            alignItems: "center",
            gap: "14px",
            padding: "6px 2px 2px",
          }}
        >
          <div
            className="tt-sidebrand-mark"
            aria-hidden="true"
            style={{
              width: "72px",
              height: "72px",
              minWidth: "72px",
              borderRadius: "20px",
              display: "grid",
              placeItems: "center",
              padding: "10px",
              background:
                "radial-gradient(circle at 30% 20%, rgba(168,85,247,0.30), rgba(124,58,237,0.14) 42%, rgba(15,23,42,0.94) 100%)",
              border: "1px solid rgba(168,85,247,0.28)",
              boxShadow:
                "0 18px 40px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <img
              src={SIDEBAR_LOGO_URL}
              alt="TabbyTech"
              className="tt-sidebrand-logo"
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.28))",
                transform: "scale(1.08)",
              }}
            />
          </div>

          <div className="tt-sidebrand-text" style={{ minWidth: 0 }}>
            <div
              className="tt-sidebrand-name"
              style={{
                fontSize: "22px",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              TabbyPay
            </div>
            <div
              className="tt-sidebrand-sub"
              style={{
                marginTop: "4px",
                fontSize: "13px",
                opacity: 0.9,
              }}
            >
              by TabbyTech
            </div>
          </div>
        </div>

        <div className="tt-sidedivider" />

        <nav className="tt-sidenav" aria-label="Sidebar navigation">
          {visibleNav.map((item) => {
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

        <div className="tt-sidedivider" />

        {showSettings && (
          <button
            type="button"
            className={`tt-sidenav-item ${activeKey === "settings" ? "is-active" : ""}`}
            onClick={() => onNavigate?.("settings")}
            aria-current={activeKey === "settings" ? "page" : undefined}
          >
            <span className="tt-sidenav-icon" aria-hidden="true">
              ⚙
            </span>
            <span className="tt-sidenav-label">Settings</span>
            <span className="tt-sidenav-pill" aria-hidden="true" />
          </button>
        )}

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
