// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Login from "./pages/Login";
import AppShell from "./shell/AppShell";

import ClientPortal from "./pages/ClientPortal";
import InvoiceHtml from "./pages/InvoiceHtml";
import TabbyDen from "./pages/TabbyDen";
import ResetPassword from "./pages/ResetPassword";

function PublicNotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0e1a",
        color: "#e2e8f0",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          background: "#111827",
          border: "1px solid #1f2937",
          borderRadius: 18,
          padding: 24,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
          Link not found
        </div>
        <div style={{ color: "#94a3b8", lineHeight: 1.6 }}>
          The link you opened is invalid or expired. Please request a new link
          from TabbyTech.
        </div>
      </div>
    </div>
  );
}

function hasStoredAdminSession() {
  try {
    const raw = localStorage.getItem("tt_user");
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    return !!parsed;
  } catch {
    return false;
  }
}

export default function App() {
  const location = useLocation();

  const [authed, setAuthed] = useState(() => hasStoredAdminSession());
  const [bootChecked, setBootChecked] = useState(false);

  // Anything under /portal or /invoice or /tabbyden or /reset-password is PUBLIC.
  const isPublicRoute = useMemo(() => {
    const p = String(location.pathname || "/").toLowerCase();
    return (
      p.startsWith("/portal") ||
      p.startsWith("/invoice") ||
      p.startsWith("/tabbyden") ||
      p.startsWith("/reset-password")
    );
  }, [location.pathname]);

  useEffect(() => {
    setAuthed(hasStoredAdminSession());
    setBootChecked(true);
  }, []);

  function handleLogin() {
    setAuthed(true);
  }

  function handleLogout() {
    try {
      localStorage.removeItem("tt_user");
    } catch {
      // ignore storage cleanup failure
    }
    setAuthed(false);
  }

  // Public client routes render WITHOUT AppShell and WITHOUT login.
  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/portal/:customerKey" element={<ClientPortal />} />
        <Route path="/invoice/:invoiceId" element={<InvoiceHtml />} />
        <Route path="/tabbyden" element={<TabbyDen />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* IMPORTANT: Never send public users to "/" because that is your admin login */}
        <Route path="*" element={<PublicNotFound />} />
      </Routes>
    );
  }

  // Prevent flashing login before localStorage auth is checked.
  if (!bootChecked) {
    return null;
  }

  // Admin app (requires login)
  if (!authed) return <Login onLogin={handleLogin} />;

  return <AppShell onLogout={handleLogout} />;
}
