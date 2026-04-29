import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE } from "../api";

const AUTH_API_BASE = API_BASE;

function useQuery() {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search), [location.search]);
}

function safeStr(v) {
  return String(v == null ? "" : v).trim();
}

export default function ForgotPassword() {
  const query = useQuery();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => safeStr(query.get("email")));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    setMessage("");
    setError("");

    const target = safeStr(email).toLowerCase();
    if (!target || !target.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      const resp = await fetch(`${AUTH_API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });

      let data = null;
      try {
        data = await resp.json();
      } catch {
        data = null;
      }

      if (!resp.ok || !data || data.ok !== true) {
        setError(
          (data && (data.error || data.message)) ||
            "If this email is registered, a reset link has been sent."
        );
        return;
      }

      setMessage(
        data.message ||
          `If ${target} is registered, a reset link has been sent. Please check your inbox.`
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0e1a",
        color: "#e2e8f0",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "linear-gradient(180deg, rgba(18,12,36,0.96) 0%, rgba(11,10,22,0.96) 100%)",
          border: "1px solid rgba(168,85,247,0.30)",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
          Forgot password
        </div>
        <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 18 }}>
          Enter your account email and we will send you a password reset link.
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "rgba(148,163,184,.95)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              autoComplete="email"
              placeholder="you@example.com"
              style={{
                width: "100%",
                background: "rgba(15,23,42,.70)",
                border: "1px solid rgba(255,255,255,.10)",
                borderRadius: 12,
                padding: "12px 14px",
                color: "#e5e7eb",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          {error ? (
            <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>
          ) : null}
          {message ? (
            <div style={{ color: "#34d399", fontSize: 13, marginBottom: 12 }}>{message}</div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 12,
              border: 0,
              background: "linear-gradient(135deg, rgba(168,85,247,.98), rgba(124,58,237,.98))",
              color: "#fff",
              fontWeight: 800,
              fontSize: 14,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
              boxShadow: "0 10px 24px rgba(124,58,237,.28)",
            }}
          >
            {busy ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            marginTop: 12,
            width: "100%",
            height: 42,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.16)",
            background: "transparent",
            color: "#cbd5e1",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Back to login
        </button>
      </div>
    </div>
  );
}
