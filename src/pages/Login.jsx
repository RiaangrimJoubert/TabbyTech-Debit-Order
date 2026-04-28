import { useState } from "react";
import { API_BASE } from "../api";

const AUTH_API_BASE = String(
  import.meta.env.VITE_SERVERLESS_API_BASE ||
    API_BASE ||
    ""
).trim();

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");

  async function handleForgotPassword() {
    setForgotMessage("");
    const target = String(email || "").trim();
    if (!target) {
      setError("Enter your username/email above, then click Forgot password?");
      return;
    }

    setForgotBusy(true);
    setError("");

    try {
      const resp = await fetch(`${AUTH_API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ email: target }),
      });

      let data = null;
      try {
        data = await resp.json();
      } catch {
        data = null;
      }

      if (!resp.ok || !data || data.ok !== true) {
        setForgotMessage(
          (data && (data.message || data.error)) ||
            "If this email is registered, a reset link has been sent."
        );
        return;
      }

      setForgotMessage(
        data.message ||
          `A password reset link has been sent to ${target}. Please check your inbox.`
      );
    } catch {
      setForgotMessage(
        "If this email is registered, a reset link has been sent. Please check your inbox."
      );
    } finally {
      setForgotBusy(false);
    }
  }

  async function handleLogin() {
    setError("");

    if (!email.trim() || !pass) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${AUTH_API_BASE}/api/auth/login`, {
  method: "POST",
  headers: {
    "Content-Type": "text/plain"
  },
  body: JSON.stringify({
    username: email.trim(),
    password: pass
  })
});

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || !data || !data.ok) {
        const msg =
          (data && data.message) ||
          `Login failed. Please try again.`;
        setError(msg);
        return;
      }

      localStorage.setItem("tt_user", JSON.stringify(data.user));
      onLogin?.(data.user);
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  }

  return (
    <div className="tt-login">
      <div className="tt-login-wrap">
        <div className="tt-login-brand">
          <img
            src="/tabbytech-logo.png"
            alt="TabbyTech"
            className="tt-login-logo"
          />
          <div className="tt-login-title">WELCOME TO TABBYPAY</div>
        </div>

        <div className="tt-login-card">
          <div className="tt-login-form-inner">
            <input
              className="tt-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              onKeyDown={onKeyDown}
              disabled={loading}
            />

            <input
              className="tt-input"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              onKeyDown={onKeyDown}
              disabled={loading}
            />

            {error ? (
              <div
                style={{
                  marginTop: 10,
                  marginBottom: 2,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.85)"
                }}
              >
                {error}
              </div>
            ) : null}

            <button
              type="button"
              className="tt-btn tt-btn-primary"
              onClick={handleLogin}
              disabled={loading}
              style={{
                opacity: loading ? 0.75 : 1,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "LOGGING IN..." : "LOG IN"}
            </button>

            {forgotMessage ? (
              <div
                style={{
                  marginTop: 10,
                  marginBottom: 2,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                {forgotMessage}
              </div>
            ) : null}

            <div className="tt-login-foot">
              <a
                href="#"
                className="tt-link"
                onClick={(e) => {
                  e.preventDefault();
                  if (!forgotBusy) handleForgotPassword();
                }}
                style={{ opacity: forgotBusy ? 0.6 : 1, cursor: forgotBusy ? "not-allowed" : "pointer" }}
              >
                {forgotBusy ? "Sending reset link..." : "Forgot password?"}
              </a>

              <div className="tt-login-tag">TabbyTech Debit Orders</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
