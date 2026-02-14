import { useState } from "react";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    if (!email.trim() || !pass) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: email.trim(),
          password: pass
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data?.message || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // Basic session storage for now (we will upgrade to JWT next)
      localStorage.setItem("tt_user", JSON.stringify(data.user));

      // Notify parent to switch screens
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

        {/* Brand */}
        <div className="tt-login-brand">
          <img
            src="/tabbytech-logo.png"
            alt="TabbyTech"
            className="tt-login-logo"
          />
          <div className="tt-login-title">
            WELCOME TO TABBYTECH
          </div>
        </div>

        {/* Login Card */}
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

            <div className="tt-login-foot">
              <a
                href="#"
                className="tt-link"
                onClick={(e) => e.preventDefault()}
              >
                Forgot password?
              </a>

              <div className="tt-login-tag">
                TabbyTech Debit Orders
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
