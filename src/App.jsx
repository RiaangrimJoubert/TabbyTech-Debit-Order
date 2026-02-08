import { useState } from "react";
import Login from "./pages/Login";
import AppShell from "./shell/AppShell";

export default function App() {
  const [authed, setAuthed] = useState(false);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return <AppShell />;
}
