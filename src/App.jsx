import { useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login";
import AppShell from "./shell/AppShell";
import InvoiceHtml from "./pages/InvoiceHtml";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const location = useLocation();

  // Client portal routes should never be blocked by admin login
  const isClientPortal = useMemo(() => {
    return location.pathname.startsWith("/invoices");
  }, [location.pathname]);

  // 1) Client portal: always accessible
  if (isClientPortal) {
    return (
      <Routes>
        <Route path="/invoices" element={<InvoiceHtml />} />
        <Route path="/invoices/:invoiceId" element={<InvoiceHtml />} />
        <Route path="*" element={<Navigate to="/invoices" replace />} />
      </Routes>
    );
  }

  // 2) Admin app: must login first
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  // If you are logged in, show your full webapp (AppShell)
  return <AppShell onLogout={() => setAuthed(false)} />;
}
