import { useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login";
import AppShell from "./shell/AppShell";

import Invoices from "./screens/Invoices"; // if your admin invoices is here, keep it
// If your admin invoices lives in src/pages/Invoices.jsx then change import to:
// import Invoices from "./pages/Invoices";

import InvoiceHtml from "./pages/InvoiceHtml";
import ClientInvoices from "./pages/ClientInvoices";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const location = useLocation();

  const isPortalRoute = useMemo(() => {
    const p = location.pathname || "/";
    return p.startsWith("/portal") || p.startsWith("/invoices-html");
  }, [location.pathname]);

  // Client portal routes must bypass admin login and admin shell
  if (isPortalRoute) {
    return (
      <Routes>
        {/* Client portal list page: shows all invoices for that client */}
        <Route path="/portal/:invoiceId" element={<ClientInvoices />} />

        {/* Client portal detail page: printable invoice */}
        <Route path="/invoices-html/:invoiceId" element={<InvoiceHtml />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Admin side
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return <AppShell onLogout={() => setAuthed(false)} />;
}
