// src/shell/AppShell.jsx
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Dashboard from "./Dashboard";
import Invoices from "../pages/Invoices";

function titleForPath(pathname) {
  if (pathname.startsWith("/invoices")) return "Invoices";
  if (pathname.startsWith("/clients")) return "Clients";
  if (pathname.startsWith("/debitorders")) return "Debit Orders";
  if (pathname.startsWith("/batches")) return "Batches";
  if (pathname.startsWith("/reports")) return "Reports";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Dashboard";
}

export default function AppShell({ onLogout }) {
  const location = useLocation();
  const pageTitle = titleForPath(location.pathname);

  return (
    <div className="tt-appshell">
      <Sidebar onLogout={onLogout} />

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
              />
            </div>

            <button className="tt-shell-iconbtn" type="button">
              🔔
            </button>

            <div className="tt-shell-user">
              <div className="tt-shell-avatar">T</div>
              <div>
                <div className="tt-shell-username">TabbyTech</div>
                <div className="tt-shell-userrole">Ops</div>
              </div>
            </div>
          </div>
        </header>

        <section className="tt-shell-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/invoices" element={<Invoices />} />

            <Route
              path="/clients"
              element={
                <div style={{ padding: 18, color: "rgba(255,255,255,0.72)" }}>
                  Clients UI coming next.
                </div>
              }
            />
            <Route
              path="/debitorders"
              element={
                <div style={{ padding: 18, color: "rgba(255,255,255,0.72)" }}>
                  Debit Orders UI coming next.
                </div>
              }
            />
            <Route
              path="/batches"
              element={
                <div style={{ padding: 18, color: "rgba(255,255,255,0.72)" }}>
                  Batches UI coming next.
                </div>
              }
            />
            <Route
              path="/reports"
              element={
                <div style={{ padding: 18, color: "rgba(255,255,255,0.72)" }}>
                  Reports UI coming next.
                </div>
              }
            />
            <Route
              path="/settings"
              element={
                <div style={{ padding: 18, color: "rgba(255,255,255,0.72)" }}>
                  Settings UI coming next.
                </div>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </section>
      </main>
    </div>
  );
}
