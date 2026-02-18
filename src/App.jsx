import { useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import AppShell from "./shell/AppShell";
import InvoiceHtml from "./pages/InvoiceHtml"; // adjust path if yours differs

function RequireAuth({ authed, children }) {
  const location = useLocation();
  if (!authed) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export default function App() {
  const [authed, setAuthed] = useState(false);

  const onLogin = useMemo(() => () => setAuthed(true), []);
  const onLogout = useMemo(() => () => setAuthed(false), []);

  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/login" element={<Login onLogin={onLogin} />} />
      <Route path="/invoices/*" element={<InvoiceHtml />} />

      {/* PROTECTED */}
      <Route
        path="/app/*"
        element={
          <RequireAuth authed={authed}>
            <AppShell onLogout={onLogout} />
          </RequireAuth>
        }
      />

      {/* DEFAULT */}
      <Route path="/" element={<Navigate to={authed ? "/app" : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
