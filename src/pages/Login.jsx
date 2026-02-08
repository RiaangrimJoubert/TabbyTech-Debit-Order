import { useState } from "react";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

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

        {/* Card */}
        <div className="tt-login-card">
          <div className="tt-login-form-inner">
            <div className="tt-login-form">

              <input
                className="tt-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Username"
                autoComplete="username"
              />

              <input
                className="tt-input"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
              />

              <button
                type="button"
                className="tt-btn tt-btn-primary"
                onClick={() => onLogin?.()}
              >
                LOG IN
              </button>

              <div className="tt-login-foot">
                <a href="#" className="tt-link">
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
    </div>
  );
}
