import { useEffect, useState } from "react";
import Login from "./pages/Login";
import AppShell from "./shell/AppShell";

const AUTH_KEY = "tt_authed_v1";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      setAuthed(saved === "true");
    } catch (e) {
      setAuthed(false);
    } finally {
      setReady(true);
    }
  }, []);

  const handleLogin = () => {
    setAuthed(true);
    try {
      localStorage.setItem(AUTH_KEY, "true");
    } catch (e) {}
  };

  const handleLogout = () => {
    setAuthed(false);
    try {
      localStorage.setItem(AUTH_KEY, "false");
    } catch (e) {}
  };

  // If you ever get stuck, run this in the browser console:
  // localStorage.removeItem("tt_authed_v1"); location.reload();

  if (!ready) return null;

  if (!authed) return <Login onLogin={handleLogin} />;

  return <AppShell onLogout={handleLogout} />;
}
