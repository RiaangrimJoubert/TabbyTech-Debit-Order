import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import AppShell from "./shell/AppShell";
import InvoiceHtml from "./pages/InvoiceHtml";

function AdminGate() {
  const [authed, setAuthed] = useState(false);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return <AppShell onLogout={() => setAuthed(false)} />;
}

export default function App() {
  return (
    <Routes>
      {/* Public client portal invoice link */}
      <Route path="/invoices-html/:invoiceId" element={<InvoiceHtml />} />

      {/* Admin app */}
      <Route path="/" element={<AdminGate />} />

      {/* Optional: block these from showing the wrong thing */}
      <Route path="/invoices" element={<Navigate to="/" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
