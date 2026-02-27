// src/App.jsx
import { useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login";
import AppShell from "./shell/AppShell";

import ClientPortal from "./pages/ClientPortal";
import InvoiceHtml from "./pages/InvoiceHtml";

// NEW: TabbyDen public page (you will create this file next)
import TabbyDen from "./pages/TabbyDen";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const location = useLocation();

  // Anything under /portal or /invoice or /tabbyden is PUBLIC.
  const isPublicRoute = useMemo(() => {
    const p = location.pathname || "/";
    return p.startsWith("/portal") || p.startsWith("/invoice") || p.startsWith("/tabbyden");
  }, [location.pathname]);

  // Public client routes render WITHOUT AppShell and WITHOUT login.
  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/portal/:customerKey" element={<ClientPortal />} />
        <Route path="/invoice/:invoiceId" element={<InvoiceHtml />} />

        {/* NEW: TabbyDen entry route. Token will be passed as ?token=... */}
        <Route path="/tabbyden" element={<TabbyDen />} />

        {/* keep fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Admin app (requires login)
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return <AppShell onLogout={() => setAuthed(false)} />;
}
