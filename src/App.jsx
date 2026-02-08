import { useState } from "react";
import Login from "./pages/Login";

export default function App() {
  const [authed, setAuthed] = useState(false);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      AppShell coming next
    </div>
  );
}
