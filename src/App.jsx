import { useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login";
import AppShell from "./shell/AppShell";
import InvoiceHtml from "./pages/InvoiceHtml";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const location = useLocation();

  const isClientPortal = useMemo(() => {
    return location.pathname.startsWith("/invoices");
  }, [location.pathname]);

  // Client portal (public)
  if (isClientPortal) {
    return (
      <Routes>
        <Route path="/invoices" element={<InvoiceHtml />} />
        <Route path="/invoices/:invoiceId" element={<InvoiceHtml />} />
        <Route path="*" element={<Navigate to="/invoices" replace />} />
      </Routes>
    );
  }

  // Admin app (login protected)
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return <AppShell onLogout={() => setAuthed(false)} />;
}
