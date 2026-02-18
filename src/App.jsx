import { useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import AppShell from "./shell/AppShell";

// TODO: Point this at your real invoices page/component
function InvoicesPage() {
  return (
    <div style={{ padding: 24, color: "#fff" }}>
      Invoices page placeholder. Wire your InvoiceHtml component here.
    </div>
  );
}

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
      {/* Public routes */}
      <Route path="/login" element={<Login onLogin={onLogin} />} />
      <Route path="/invoices/*" element={<InvoicesPage />} />

      {/* Protected app routes */}
      <Route
        path="/app/*"
        element={
          <RequireAuth authed={authed}>
            <AppShell onLogout={onLogout} />
          </RequireAuth>
        }
      />

      {/* Default */}
      <Route path="/" element={<Navigate to={authed ? "/app" : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
