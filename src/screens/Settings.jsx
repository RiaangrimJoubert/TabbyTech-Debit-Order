import React, { useMemo, useState } from "react";

export default function Settings() {
  const TABS = useMemo(
    () => [
      { key: "integrations", label: "Integrations" },
      { key: "branding", label: "Profile and Branding" },
      { key: "email", label: "Email Rules" },
    ],
    []
  );

  const [activeTab, setActiveTab] = useState("integrations");

  const [toast, setToast] = useState(null);
  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  }

  const [integrations, setIntegrations] = useState({
    zohoCrm: {
      enabled: true,
      status: "not_connected",
      connectMode: "oauth",
      orgId: "",
      clientId: "",
      clientSecret: "",
      apiKey: "",
      lastChecked: "",
    },
    zohoBooks: {
      enabled: true,
      status: "not_connected",
      connectMode: "oauth",
      orgId: "",
      clientId: "",
      clientSecret: "",
      apiKey: "",
      lastChecked: "",
    },
    paystack: {
      enabled: true,
      status: "not_connected",
      connectMode: "apiKey",
      publicKey: "",
      secretKey: "",
      webhookSecret: "",
      lastChecked: "",
    },
  });

  const [branding, setBranding] = useState({
    businessName: "TabbyTech",
    supportEmail: "support@tabbytech.co.za",
    supportPhone: "010 446 5754",
    senderName: "TabbyTech Debit Orders",
    senderEmail: "no-reply@tabbytech.co.za",
    replyToEmail: "support@tabbytech.co.za",
    logoUrl: "",
  });

  const [emailRules, setEmailRules] = useState({
    reminder: {
      enabled: true,
      daysBefore: 2,
      sendTime: "09:00",
      recipients: {
        client: true,
        merchant: false,
        ops: true,
      },
      subject: "Reminder: upcoming debit order for {clientName}",
      body:
        "Hi {clientName},\n\nJust a quick reminder that your debit order is scheduled for {runDate}.\n\nAmount: {amount}\nReference: {reference}\n\nIf anything looks incorrect, please contact us before the run date.\n\nThanks,\n{senderName}",
    },
    failure: {
      enabled: true,
      throttleHours: 24,
      recipients: {
        client: true,
        merchant: true,
        ops: true,
      },
      subject: "Debit order failed for {clientName} - action required",
      body:
        "Hi {recipientName},\n\nA debit order failed for {clientName}.\n\nRun date: {runDate}\nAmount: {amount}\nReason: {failureReason}\nReference: {reference}\n\nNext steps:\n- Verify account details\n- Confirm available funds\n- Retry or reschedule if needed\n\nRegards,\n{senderName}",
    },
    ops: {
      opsEmail: "ops@tabbytech.co.za",
      ccEmail: "",
    },
  });

  const [templateFocus, setTemplateFocus] = useState("reminder"); // reminder | failure

  function updateIntegration(key, patch) {
    setIntegrations((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  }

  function updateBranding(patch) {
    setBranding((prev) => ({ ...prev, ...patch }));
  }

  function updateEmailRule(path, value) {
    setEmailRules((prev) => {
      const next = typeof structuredClone === "function" ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  }

  const variables = useMemo(
    () => ["{clientName}", "{recipientName}", "{runDate}", "{amount}", "{reference}", "{senderName}", "{failureReason}"],
    []
  );

  const preview = useMemo(() => {
    const sample = {
      clientName: "Mokoena Interiors",
      recipientName: "Thandiwe",
      runDate: "12 Feb 2026",
      amount: "R 2,450.00",
      reference: "TAB-DO-18492",
      senderName: branding.senderName || "TabbyTech Debit Orders",
      failureReason: "Insufficient funds",
    };

    const rule = templateFocus === "failure" ? emailRules.failure : emailRules.reminder;
    return {
      subject: interpolate(rule.subject, sample),
      body: interpolate(rule.body, sample),
    };
  }, [emailRules, templateFocus, branding.senderName]);

  return (
    <div className="tt-settings">
      <style>{css}</style>

      <div className="tt-wrap">
        <div className="tt-hero">
          <div className="tt-heroTop">
            <div>
              <div className="tt-title">Settings</div>
              <div className="tt-subtitle">
                Control integrations, identity, and email behaviour. Everything here is UI-only until backend wiring resumes.
              </div>
            </div>
          </div>

          <div className="tt-tabs">
            {TABS.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  className={active ? "tt-tab tt-tabActive" : "tt-tab"}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "integrations" && (
          <div className="tt-stack">
            <div className="tt-card">
              <div className="tt-cardHead">
                <div>
                  <div className="tt-cardTitle">Integrations</div>
                  <div className="tt-cardHint">
                    Connect the tools your team already uses. Status-first controls keep this clean today and scalable later.
                  </div>
                </div>
                <div className="tt-note">Tip: keep credentials in a password manager</div>
              </div>

              <div className="tt-grid3 tt-mt">
                <IntegrationTile
                  name="Zoho CRM"
                  description="Sync clients and account records."
                  status={integrations.zohoCrm.status}
                  onOpen={() => showToast("Integration opened (UI-only placeholder).")}
                />
                <IntegrationTile
                  name="Zoho Books"
                  description="Invoices and reconciliation support."
                  status={integrations.zohoBooks.status}
                  onOpen={() => showToast("Integration opened (UI-only placeholder).")}
                />
                <IntegrationTile
                  name="Paystack"
                  description="Payments and webhooks."
                  status={integrations.paystack.status}
                  onOpen={() => showToast("Integration opened (UI-only placeholder).")}
                />
              </div>
            </div>

            <IntegrationCard
              title="Zoho CRM"
              hint="Ideal for client sync and account management."
              data={integrations.zohoCrm}
              onToggleEnabled={(v) => updateIntegration("zohoCrm", { enabled: v })}
              onChangeMode={(v) => updateIntegration("zohoCrm", { connectMode: v })}
              onChangeField={(patch) => updateIntegration("zohoCrm", patch)}
              onConnect={() => {
                updateIntegration("zohoCrm", { status: "connected", lastChecked: new Date().toLocaleString() });
                showToast("Zoho CRM marked as connected (UI only).");
              }}
              onDisconnect={() => {
                updateIntegration("zohoCrm", { status: "not_connected" });
                showToast("Zoho CRM disconnected (UI only).");
              }}
              onTest={() => {
                updateIntegration("zohoCrm", { lastChecked: new Date().toLocaleString() });
                showToast("Connection test simulated (UI only).");
              }}
              fields={[
                { key: "orgId", label: "Organisation ID", secret: false },
                { key: "clientId", label: "Client ID", secret: false },
                { key: "clientSecret", label: "Client Secret", secret: true },
                { key: "apiKey", label: "API Key (optional)", secret: true },
              ]}
            />

            <IntegrationCard
              title="Zoho Books"
              hint="Useful for finance workflows and reconciliation."
              data={integrations.zohoBooks}
              onToggleEnabled={(v) => updateIntegration("zohoBooks", { enabled: v })}
              onChangeMode={(v) => updateIntegration("zohoBooks", { connectMode: v })}
              onChangeField={(patch) => updateIntegration("zohoBooks", patch)}
              onConnect={() => {
                updateIntegration("zohoBooks", { status: "connected", lastChecked: new Date().toLocaleString() });
                showToast("Zoho Books marked as connected (UI only).");
              }}
              onDisconnect={() => {
                updateIntegration("zohoBooks", { status: "not_connected" });
                showToast("Zoho Books disconnected (UI only).");
              }}
              onTest={() => {
                updateIntegration("zohoBooks", { lastChecked: new Date().toLocaleString() });
                showToast("Connection test simulated (UI only).");
              }}
              fields={[
                { key: "orgId", label: "Organisation ID", secret: false },
                { key: "clientId", label: "Client ID", secret: false },
                { key: "clientSecret", label: "Client Secret", secret: true },
                { key: "apiKey", label: "API Key (optional)", secret: true },
              ]}
            />

            <IntegrationCard
              title="Paystack"
              hint="Payment processing and event webhooks."
              data={integrations.paystack}
              onToggleEnabled={(v) => updateIntegration("paystack", { enabled: v })}
              onChangeMode={(v) => updateIntegration("paystack", { connectMode: v })}
              onChangeField={(patch) => updateIntegration("paystack", patch)}
              onConnect={() => {
                updateIntegration("paystack", { status: "connected", lastChecked: new Date().toLocaleString() });
                showToast("Paystack marked as connected (UI only).");
              }}
              onDisconnect={() => {
                updateIntegration("paystack", { status: "not_connected" });
                showToast("Paystack disconnected (UI only).");
              }}
              onTest={() => {
                updateIntegration("paystack", { lastChecked: new Date().toLocaleString() });
                showToast("Connection test simulated (UI only).");
              }}
              fields={[
                { key: "publicKey", label: "Public key", secret: false },
                { key: "secretKey", label: "Secret key", secret: true },
                { key: "webhookSecret", label: "Webhook secret (optional)", secret: true },
              ]}
            />
          </div>
        )}

        {activeTab === "branding" && (
          <div className="tt-stack">
            <div className="tt-card">
              <div className="tt-cardHead">
                <div>
                  <div className="tt-cardTitle">Profile and Branding</div>
                  <div className="tt-cardHint">
                    Make emails and exports feel consistent. Keep sender details stable so clients always recognise you.
                  </div>
                </div>
                <button type="button" className="tt-btn tt-btnPrimary" onClick={() => showToast("Branding saved (UI only).")}>
                  Save changes
                </button>
              </div>

              <div className="tt-divider" />

              <div className="tt-grid2">
                <Field label="Business name" value={branding.businessName} onChange={(v) => updateBranding({ businessName: v })} />
                <Field label="Sender name" value={branding.senderName} onChange={(v) => updateBranding({ senderName: v })} />
                <Field label="Sender email" value={branding.senderEmail} onChange={(v) => updateBranding({ senderEmail: v })} />
                <Field label="Reply-to email" value={branding.replyToEmail} onChange={(v) => updateBranding({ replyToEmail: v })} />
              </div>

              <div className="tt-divider" />

              <div className="tt-grid2">
                <Field label="Support email" value={branding.supportEmail} onChange={(v) => updateBranding({ supportEmail: v })} />
                <Field label="Support phone" value={branding.supportPhone} onChange={(v) => updateBranding({ supportPhone: v })} />
              </div>

              <div className="tt-divider" />

              <Field
                label="Logo URL (optional)"
                value={branding.logoUrl}
                onChange={(v) => updateBranding({ logoUrl: v })}
                helper="Used in email headers and future PDFs. Square logos look best."
              />
            </div>
          </div>
        )}

        {activeTab === "email" && (
          <div className="tt-stack">
            <div className="tt-card">
              <div className="tt-cardHead">
                <div>
                  <div className="tt-cardTitle">Email Rules</div>
                  <div className="tt-cardHint">Rules read like logic: when something happens, who gets notified, and what they receive.</div>
                </div>
              </div>

              <div className="tt-divider" />

              <div className="tt-cardHead" style={{ padding: 0, marginBottom: 8 }}>
                <div>
                  <div className="tt-sectionTitle">Operational recipients</div>
                  <div className="tt-cardHint">Safe defaults. Ops should always receive failures.</div>
                </div>
                <button type="button" className="tt-btn tt-btnPrimary" onClick={() => showToast("Recipients saved (UI only).")}>
                  Save
                </button>
              </div>

              <div className="tt-grid2 tt-mt">
                <Field label="Ops email" value={emailRules.ops.opsEmail} onChange={(v) => updateEmailRule("ops.opsEmail", v)} />
                <Field label="CC email (optional)" value={emailRules.ops.ccEmail} onChange={(v) => updateEmailRule("ops.ccEmail", v)} />
              </div>
            </div>

            <RuleCard title="Rule 1: Debit reminder" subtitle="Two days before the run date, reduce surprises and failures.">
              <div className="tt-grid3">
                <ToggleRow
                  label="Enabled"
                  checked={emailRules.reminder.enabled}
                  onChange={(v) => updateEmailRule("reminder.enabled", v)}
                  hint="Turn off if you do not want reminder emails."
                />
                <Field
                  label="Send"
                  value={String(emailRules.reminder.daysBefore)}
                  onChange={(v) => updateEmailRule("reminder.daysBefore", clampInt(v, 0, 30))}
                  rightAddon="days before"
                />
                <Field
                  label="Time"
                  value={emailRules.reminder.sendTime}
                  onChange={(v) => updateEmailRule("reminder.sendTime", v)}
                  helper="Local time, for example 09:00"
                />
              </div>

              <div className="tt-mt">
                <RecipientsPicker
                  value={emailRules.reminder.recipients}
                  onChange={(next) => updateEmailRule("reminder.recipients", next)}
                  note="Ops is recommended for traceability."
                  forceOps={false}
                />
              </div>

              <div className="tt-row tt-mt">
                <div className="tt-vars">
                  Variables available: <span className="tt-varsList">{variables.join("  ")}</span>
                </div>
                <div className="tt-row">
                  <button
                    type="button"
                    className={templateFocus === "reminder" ? "tt-btn tt-btnGhost tt-btnActive" : "tt-btn tt-btnGhost"}
                    onClick={() => {
                      setTemplateFocus("reminder");
                      showToast("Editing reminder template");
                    }}
                  >
                    Edit template
                  </button>
                  <button type="button" className="tt-btn tt-btnPrimary" onClick={() => showToast("Reminder rule saved (UI only).")}>
                    Save
                  </button>
                </div>
              </div>
            </RuleCard>

            <RuleCard title="Rule 2: Failure notifications" subtitle="Notify stakeholders immediately so recovery can start.">
              <div className="tt-grid3">
                <ToggleRow
                  label="Enabled"
                  checked={emailRules.failure.enabled}
                  onChange={(v) => updateEmailRule("failure.enabled", v)}
                  hint="Turn off only if failures are handled elsewhere."
                />
                <Field
                  label="Resend throttle"
                  value={String(emailRules.failure.throttleHours)}
                  onChange={(v) => updateEmailRule("failure.throttleHours", clampInt(v, 1, 168))}
                  rightAddon="hours"
                  helper="Prevents repeated emails for the same failure."
                />
                <InfoCard title="Best practice" text="Ops stays on for failures to maintain audit trails and reduce response time." />
              </div>

              <div className="tt-mt">
                <RecipientsPicker
                  value={emailRules.failure.recipients}
                  onChange={(next) => updateEmailRule("failure.recipients", next)}
                  note="Ops is locked on for failures."
                  forceOps={true}
                />
              </div>

              <div className="tt-row tt-mt">
                <div className="tt-vars">
                  Variables available: <span className="tt-varsList">{variables.join("  ")}</span>
                </div>
                <div className="tt-row">
                  <button
                    type="button"
                    className={templateFocus === "failure" ? "tt-btn tt-btnGhost tt-btnActive" : "tt-btn tt-btnGhost"}
                    onClick={() => {
                      setTemplateFocus("failure");
                      showToast("Editing failure template");
                    }}
                  >
                    Edit template
                  </button>
                  <button type="button" className="tt-btn tt-btnPrimary" onClick={() => showToast("Failure rule saved (UI only).")}>
                    Save
                  </button>
                </div>
              </div>
            </RuleCard>

            <div className="tt-grid2">
              <div className="tt-card">
                <div className="tt-cardHead">
                  <div>
                    <div className="tt-cardTitle">Template editor</div>
                    <div className="tt-cardHint">{templateFocus === "failure" ? "Failure notification template" : "Debit reminder template"}</div>
                  </div>
                  <button type="button" className="tt-btn tt-btnPrimary" onClick={() => showToast("Template saved (UI only).")}>
                    Save template
                  </button>
                </div>

                <div className="tt-divider" />

                <div className="tt-formStack">
                  <Field
                    label="Subject"
                    value={templateFocus === "failure" ? emailRules.failure.subject : emailRules.reminder.subject}
                    onChange={(v) => (templateFocus === "failure" ? updateEmailRule("failure.subject", v) : updateEmailRule("reminder.subject", v))}
                  />
                  <TextArea
                    label="Body"
                    value={templateFocus === "failure" ? emailRules.failure.body : emailRules.reminder.body}
                    onChange={(v) => (templateFocus === "failure" ? updateEmailRule("failure.body", v) : updateEmailRule("reminder.body", v))}
                    rows={14}
                  />
                </div>
              </div>

              <div className="tt-card">
                <div className="tt-cardHead">
                  <div>
                    <div className="tt-cardTitle">Live preview</div>
                    <div className="tt-cardHint">Sample data preview to validate clarity and tone.</div>
                  </div>
                </div>

                <div className="tt-divider" />

                <EmailPreview subject={preview.subject} body={preview.body} />
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="tt-toastWrap">
            <div className="tt-toast">{toast}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------
   Components
---------------------------- */

function IntegrationTile({ name, description, status, onOpen }) {
  const statusText = status === "connected" ? "Connected" : status === "needs_attention" ? "Needs attention" : "Not connected";
  return (
    <button type="button" className="tt-tile" onClick={onOpen}>
      <div className="tt-tileTop">
        <div className="tt-tileTitle">{name}</div>
        <div className="tt-tileStatus">{statusText}</div>
      </div>
      <div className="tt-tileDesc">{description}</div>
      <div className="tt-tileBottom">
        <div className="tt-tileLine" />
        <div className="tt-tileOpen">Open</div>
      </div>
    </button>
  );
}

function IntegrationCard({ title, hint, data, fields, onToggleEnabled, onChangeMode, onChangeField, onConnect, onDisconnect, onTest }) {
  const statusLabel = data.status === "connected" ? "Connected" : data.status === "needs_attention" ? "Needs attention" : "Not connected";

  const pillClass =
    data.status === "connected" ? "tt-pill tt-pillGood" : data.status === "needs_attention" ? "tt-pill tt-pillWarn" : "tt-pill";

  return (
    <div className="tt-card">
      <div className="tt-cardHead">
        <div>
          <div className="tt-cardTitle">{title}</div>
          <div className="tt-cardHint">
            {hint}{" "}
            <span className="tt-muted">
              Status: <span className={pillClass}>{statusLabel}</span>
              {data.lastChecked ? <span className="tt-muted"> Last checked: {data.lastChecked}</span> : null}
            </span>
          </div>
        </div>

        <div className="tt-row">
          <button type="button" className="tt-btn tt-btnGhost" onClick={() => onToggleEnabled(!data.enabled)}>
            {data.enabled ? "Disable" : "Enable"}
          </button>

          {data.status === "connected" ? (
            <button type="button" className="tt-btn tt-btnGhost" onClick={onDisconnect}>
              Disconnect
            </button>
          ) : (
            <button type="button" className="tt-btn tt-btnPrimary" onClick={onConnect}>
              Connect
            </button>
          )}
        </div>
      </div>

      <div className="tt-divider" />

      <div className="tt-grid3">
        <ModeChip label="OAuth" active={data.connectMode === "oauth"} onClick={() => onChangeMode("oauth")} disabled={!data.enabled} />
        <ModeChip label="API Key" active={data.connectMode === "apiKey"} onClick={() => onChangeMode("apiKey")} disabled={!data.enabled} />

        <div className="tt-miniCard">
          <div className="tt-miniTitle">Quick actions</div>
          <div className="tt-row tt-mtSm">
            <button type="button" className="tt-btn tt-btnGhost" onClick={onTest} disabled={!data.enabled}>
              Test connection
            </button>
            <button type="button" className="tt-btn tt-btnGhost" onClick={() => {}} disabled={!data.enabled} title="UI-only placeholder">
              Advanced
            </button>
          </div>
        </div>
      </div>

      {data.enabled ? (
        <div className="tt-grid2 tt-mt">
          {fields.map((f) => (
            <SecretField
              key={f.key}
              label={f.label}
              value={data[f.key] || ""}
              onChange={(v) => onChangeField({ [f.key]: v })}
              secret={!!f.secret}
              disabled={!data.enabled}
            />
          ))}
        </div>
      ) : (
        <div className="tt-emptyState tt-mt">Enable this integration to configure credentials and connection settings.</div>
      )}

      <div className="tt-row tt-mt">
        <div />
        <div className="tt-row">
          <button type="button" className="tt-btn tt-btnGhost" onClick={onTest} disabled={!data.enabled}>
            Test
          </button>
          <button type="button" className="tt-btn tt-btnPrimary" onClick={() => {}} disabled={!data.enabled} title="UI-only placeholder">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeChip({ label, active, onClick, disabled }) {
  return (
    <button type="button" className={active ? "tt-chip tt-chipActive" : "tt-chip"} onClick={onClick} disabled={disabled}>
      <div className="tt-chipTitle">{label}</div>
      <div className="tt-chipSub">UI-only selector</div>
    </button>
  );
}

function RuleCard({ title, subtitle, children }) {
  return (
    <div className="tt-card">
      <div className="tt-cardHead">
        <div>
          <div className="tt-cardTitle">{title}</div>
          <div className="tt-cardHint">{subtitle}</div>
        </div>
      </div>
      <div className="tt-divider" />
      {children}
    </div>
  );
}

function Field({ label, value, onChange, helper, rightAddon }) {
  return (
    <div className="tt-field">
      <div className="tt-fieldTop">
        <div className="tt-label">{label}</div>
        {helper ? <div className="tt-helper">{helper}</div> : null}
      </div>

      <div className="tt-inputWrap">
        <input className="tt-input" value={value} onChange={(e) => onChange(e.target.value)} />
        {rightAddon ? <div className="tt-addon">{rightAddon}</div> : null}
      </div>
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 10 }) {
  return (
    <div className="tt-field">
      <div className="tt-fieldTop">
        <div className="tt-label">{label}</div>
      </div>
      <div className="tt-inputWrap">
        <textarea className="tt-textarea" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange, hint }) {
  return (
    <div className="tt-miniCard">
      <div className="tt-toggleRow">
        <div>
          <div className="tt-miniTitle">{label}</div>
          {hint ? <div className="tt-miniText">{hint}</div> : null}
        </div>

        <button
          type="button"
          className={checked ? "tt-switch tt-switchOn" : "tt-switch"}
          onClick={() => onChange(!checked)}
          aria-label={label}
        >
          <span className={checked ? "tt-knob tt-knobOn" : "tt-knob"} />
        </button>
      </div>
    </div>
  );
}

function RecipientsPicker({ value, onChange, note, forceOps }) {
  const next = { ...value };

  function setRecipient(k, v) {
    if (k === "ops" && forceOps) return;
    next[k] = v;
    if (forceOps) next.ops = true;
    onChange(next);
  }

  return (
    <div className="tt-miniCard">
      <div className="tt-miniTitle">Recipients</div>
      <div className="tt-miniText">{note}</div>

      <div className="tt-grid3 tt-mtSm">
        <RecipientChip label="Client" enabled={!!value.client} onToggle={() => setRecipient("client", !value.client)} />
        <RecipientChip label="Merchant" enabled={!!value.merchant} onToggle={() => setRecipient("merchant", !value.merchant)} />
        <RecipientChip label="Ops" enabled={!!value.ops} onToggle={() => setRecipient("ops", !value.ops)} locked={forceOps} />
      </div>
    </div>
  );
}

function RecipientChip({ label, enabled, onToggle, locked }) {
  return (
    <button
      type="button"
      className={enabled ? "tt-rec tt-recOn" : "tt-rec"}
      onClick={onToggle}
      disabled={locked}
      title={locked ? "Locked" : ""}
    >
      <div className="tt-recTop">
        <div className="tt-recTitle">{label}</div>
        {locked ? <div className="tt-recLock">Locked</div> : null}
      </div>
      <div className="tt-recSub">{enabled ? "Enabled" : "Disabled"}</div>
    </button>
  );
}

function InfoCard({ title, text }) {
  return (
    <div className="tt-miniCard">
      <div className="tt-miniTitle">{title}</div>
      <div className="tt-miniText">{text}</div>
    </div>
  );
}

function EmailPreview({ subject, body }) {
  return (
    <div className="tt-preview">
      <div className="tt-previewLabel">Subject</div>
      <div className="tt-previewSubject">{subject}</div>
      <div className="tt-previewLabel tt-mtSm">Body</div>
      <div className="tt-previewBody">{body}</div>
    </div>
  );
}

function SecretField({ label, value, onChange, secret, disabled }) {
  const [reveal, setReveal] = useState(false);

  return (
    <div className="tt-field">
      <div className="tt-fieldTop">
        <div className="tt-label">{label}</div>
        {secret ? (
          <button type="button" className="tt-link" onClick={() => setReveal((p) => !p)} disabled={disabled}>
            {reveal ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>

      <div className="tt-inputWrap">
        <input
          className="tt-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={secret && !reveal ? "password" : "text"}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

/* ---------------------------
   Helpers + styles
---------------------------- */

function interpolate(text, vars) {
  let out = text || "";
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

function clampInt(v, min, max) {
  const n = parseInt(String(v).replace(/[^\d]/g, ""), 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

const css = `
.tt-settings {
  width: 100%;
  height: 100%;
  color: rgba(255,255,255,0.92);
}

/* Use the same TabbyTech purple as the rest of the app */
.tt-settings .tt-cardTitle,
.tt-settings .tt-tileTitle,
.tt-settings .tt-miniTitle,
.tt-settings .tt-chipTitle,
.tt-settings .tt-recTitle {
  color: var(--purple);
}

.tt-wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 18px 18px 32px;
}

.tt-hero {
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.08);
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  backdrop-filter: blur(18px);
  box-shadow: 0 22px 70px rgba(0,0,0,0.35);
  padding: 18px;
}

.tt-heroTop {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.tt-title {
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.tt-subtitle {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255,255,255,0.68);
  max-width: 900px;
}

.tt-tabs {
  margin-top: 14px;
  display: inline-flex;
  gap: 8px;
  padding: 8px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.28);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}

.tt-tab {
  border: 1px solid transparent;
  background: transparent;
  color: rgba(255,255,255,0.72);
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease;
}

.tt-tab:hover {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.9);
}

.tt-tabActive {
  background: rgba(255,255,255,0.10);
  border-color: rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.95);
  box-shadow: 0 8px 26px rgba(0,0,0,0.35);
}

.tt-stack { display: grid; gap: 14px; margin-top: 14px; }

.tt-card {
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.08);
  background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03));
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 60px rgba(0,0,0,0.26);
  padding: 18px;
}

.tt-cardHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.tt-cardTitle {
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.tt-sectionTitle {
  font-size: 13px;
  font-weight: 650;
  color: rgba(255,255,255,0.92);
}

.tt-cardHint {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255,255,255,0.68);
}

.tt-note {
  font-size: 12px;
  color: rgba(255,255,255,0.55);
}

.tt-divider {
  height: 1px;
  margin: 14px 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
}

.tt-grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.tt-grid3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.tt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tt-mt { margin-top: 14px; }
.tt-mtSm { margin-top: 10px; }

.tt-btn {
  border-radius: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.92);
  font-size: 13px;
  cursor: pointer;
  transition: transform 120ms ease, background 180ms ease, border-color 180ms ease;
}

.tt-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.tt-btn:hover {
  background: rgba(255,255,255,0.10);
  border-color: rgba(255,255,255,0.14);
}

.tt-btn:active { transform: translateY(1px); }

.tt-btnPrimary {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.14);
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
}

.tt-btnGhost {
  background: rgba(255,255,255,0.04);
}

.tt-btnActive {
  background: rgba(255,255,255,0.10);
  border-color: rgba(255,255,255,0.14);
}

.tt-field { width: 100%; }

.tt-fieldTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.tt-label { font-size: 12px; color: rgba(255,255,255,0.70); }
.tt-helper { font-size: 11px; color: rgba(255,255,255,0.45); }

.tt-inputWrap {
  display: flex;
  align-items: stretch;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.26);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.tt-inputWrap:focus-within {
  border-color: rgba(255,255,255,0.18);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 4px rgba(255,255,255,0.04);
}

.tt-input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: rgba(255,255,255,0.92);
  padding: 10px 12px;
  font-size: 13px;
}

.tt-textarea {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: rgba(255,255,255,0.92);
  padding: 10px 12px;
  font-size: 13px;
  resize: none;
}

.tt-addon {
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-size: 12px;
  color: rgba(255,255,255,0.55);
  border-left: 1px solid rgba(255,255,255,0.10);
}

.tt-link {
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.55);
  font-size: 12px;
  cursor: pointer;
}

.tt-link:hover { color: rgba(255,255,255,0.85); }

.tt-tile {
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.24);
  box-shadow: 0 16px 50px rgba(0,0,0,0.22);
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: transform 140ms ease, background 180ms ease, border-color 180ms ease;
}

.tt-tile:hover {
  background: rgba(0,0,0,0.30);
  border-color: rgba(255,255,255,0.14);
  transform: translateY(-1px);
}

.tt-tileTop { display: flex; justify-content: space-between; gap: 10px; }
.tt-tileTitle { font-size: 13px; font-weight: 650; }
.tt-tileStatus { font-size: 12px; color: rgba(255,255,255,0.60); }
.tt-tileDesc { margin-top: 8px; font-size: 12px; color: rgba(255,255,255,0.68); line-height: 1.45; }

.tt-tileBottom { margin-top: 12px; display: flex; align-items: center; justify-content: space-between; }
.tt-tileLine { width: 46px; height: 1px; background: rgba(255,255,255,0.12); }
.tt-tileOpen { font-size: 12px; color: rgba(255,255,255,0.60); }

.tt-miniCard {
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.22);
  padding: 14px;
}

.tt-miniTitle { font-size: 13px; font-weight: 650; }
.tt-miniText { margin-top: 6px; font-size: 12px; color: rgba(255,255,255,0.68); line-height: 1.45; }

.tt-toggleRow { display: flex; justify-content: space-between; align-items: center; gap: 12px; }

.tt-switch {
  width: 54px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  position: relative;
  cursor: pointer;
}

.tt-switchOn {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.16);
}

.tt-knob {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: rgba(255,255,255,0.70);
  transition: left 160ms ease, background 160ms ease;
}

.tt-knobOn {
  left: 28px;
  background: rgba(255,255,255,0.95);
}

.tt-chip {
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease;
}

.tt-chip:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.14);
}

.tt-chip:disabled { opacity: 0.55; cursor: not-allowed; }

.tt-chipActive {
  background: rgba(255,255,255,0.10);
  border-color: rgba(255,255,255,0.14);
}

.tt-chipTitle { font-size: 13px; font-weight: 650; }
.tt-chipSub { margin-top: 6px; font-size: 12px; color: rgba(255,255,255,0.65); }

.tt-rec {
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease;
}

.tt-rec:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.14); }
.tt-rec:disabled { opacity: 0.65; cursor: not-allowed; }

.tt-recOn {
  background: rgba(255,255,255,0.10);
  border-color: rgba(255,255,255,0.14);
  box-shadow: 0 12px 36px rgba(0,0,0,0.28);
}

.tt-recTop { display: flex; justify-content: space-between; gap: 10px; }
.tt-recTitle { font-size: 13px; font-weight: 650; }
.tt-recLock { font-size: 11px; color: rgba(255,255,255,0.55); }
.tt-recSub { margin-top: 6px; font-size: 12px; color: rgba(255,255,255,0.65); }

.tt-preview {
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.26);
  padding: 14px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}

.tt-previewLabel { font-size: 11px; color: rgba(255,255,255,0.55); }
.tt-previewSubject { margin-top: 6px; font-size: 13px; font-weight: 650; line-height: 1.35; white-space: pre-wrap; }
.tt-previewBody { margin-top: 8px; font-size: 13px; color: rgba(255,255,255,0.78); line-height: 1.55; white-space: pre-wrap; }

.tt-formStack { display: grid; gap: 12px; }

.tt-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  font-size: 11px;
  color: rgba(255,255,255,0.75);
}

.tt-pillGood {
  border-color: rgba(16,185,129,0.28);
  background: rgba(16,185,129,0.12);
  color: rgba(209,250,229,0.9);
}

.tt-pillWarn {
  border-color: rgba(245,158,11,0.28);
  background: rgba(245,158,11,0.12);
  color: rgba(254,243,199,0.9);
}

.tt-emptyState {
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.22);
  padding: 14px;
  color: rgba(255,255,255,0.70);
}

.tt-vars { font-size: 12px; color: rgba(255,255,255,0.60); }
.tt-varsList { color: rgba(255,255,255,0.80); }
.tt-muted { color: rgba(255,255,255,0.62); }

.tt-toastWrap {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 50;
}

.tt-toast {
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.70);
  backdrop-filter: blur(14px);
  padding: 10px 12px;
  color: rgba(255,255,255,0.92);
  font-size: 13px;
  box-shadow: 0 22px 70px rgba(0,0,0,0.45);
}

/* Desktop-first, but keep it from breaking hard if the window is smaller */
@media (max-width: 1100px) {
  .tt-grid3 { grid-template-columns: 1fr; }
  .tt-grid2 { grid-template-columns: 1fr; }
}
`;
