import { useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login";
import AppShell from "./shell/AppShell";

import InvoiceHtml from "./pages/InvoiceHtml";
import ClientInvoices from "./pages/ClientInvoices";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const location = useLocation();

  const isPortalRoute = useMemo(() => {
    const p = location.pathname || "/";
    return p.startsWith("/portal") || p.startsWith("/invoices-html");
  }, [location.pathname]);

  // Client portal pages must bypass Login + AppShell
  if (isPortalRoute) {
    return (
      <Routes>
        <Route path="/portal/:invoiceId" element={<ClientInvoices />} />
        <Route path="/invoices-html/:invoiceId" element={<InvoiceHtml />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Admin side
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return <AppShell onLogout={() => setAuthed(false)} />;
}
