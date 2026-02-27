// src/App.jsx
import { useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login";
import AppShell from "./shell/AppShell";

import ClientPortal from "./pages/ClientPortal";
import InvoiceHtml from "./pages/InvoiceHtml";
import TabbyDen from "./pages/TabbyDen";

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

export default function App() {
  const [authed, setAuthed] = useState(false);
  const location = useLocation();

  // Anything under /portal or /invoice or /tabbyden is PUBLIC.
  const isPublicRoute = useMemo(() => {
    const p = String(location.pathname || "/").toLowerCase();
    return (
      p.startsWith("/portal") ||
      p.startsWith("/invoice") ||
      p.startsWith("/tabbyden")
    );
  }, [location.pathname]);

  // Public client routes render WITHOUT AppShell and WITHOUT login.
  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/portal/:customerKey" element={<ClientPortal />} />
        <Route path="/invoice/:invoiceId" element={<InvoiceHtml />} />
        <Route path="/tabbyden" element={<TabbyDen />} />

        {/* IMPORTANT: Never send public users to "/" because that is your admin login */}
        <Route path="*" element={<PublicNotFound />} />
      </Routes>
    );
  }

  // Admin app (requires login)
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return <AppShell onLogout={() => setAuthed(false)} />;
}
