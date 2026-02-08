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

  // UI-only state
  const [integrations, setIntegrations] = useState({
    zohoCrm: {
      enabled: true,
      status: "not_connected", // not_connected | connected | needs_attention
      connectMode: "oauth", // oauth | apiKey (UI only)
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
        ops: true, // should remain true as a best-practice default
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
  const [toast, setToast] = useState(null);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  }

  function pillForStatus(status) {
    if (status === "connected") return "bg-emerald-500/15 text-emerald-200 border-emerald-500/20";
    if (status === "needs_attention") return "bg-amber-500/15 text-amber-200 border-amber-500/20";
    return "bg-white/5 text-white/70 border-white/10";
  }

  function labelForStatus(status) {
    if (status === "connected") return "Connected";
    if (status === "needs_attention") return "Needs attention";
    return "Not connected";
  }

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
    const subject = interpolate(rule.subject, sample);
    const body = interpolate(rule.body, sample);

    return { subject, body };
  }, [emailRules, templateFocus, branding.senderName]);

  return (
    <div className="w-full h-full p-6 text-white">
      <div className="max-w-[1200px] mx-auto">
        <Header
          title="Settings"
          subtitle="Configure integrations, brand details, and email behaviour. UI-only for now."
        />

        <div className="mt-5 flex items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={[
                "px-4 py-2 rounded-xl border text-sm transition",
                activeTab === t.key
                  ? "bg-white/10 border-white/15 text-white"
                  : "bg-transparent border-white/10 text-white/70 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "integrations" && (
            <div className="space-y-4">
              <TabIntro
                title="Integrations"
                text="Connect external systems so TabbyTech can sync clients, reconcile payments, and streamline ops. These controls are UI-only until backend wiring resumes."
              />

              <GlassCard>
                <CardTitle title="Connection overview" subtitle="Status-first view. Connect only what you need." />
                <div className="mt-5 grid grid-cols-3 gap-4">
                  <IntegrationTile
                    name="Zoho CRM"
                    description="Sync clients and company records."
                    status={integrations.zohoCrm.status}
                    onOpen={() => openIntegrationModal("zohoCrm", showToast)}
                  />
                  <IntegrationTile
                    name="Zoho Books"
                    description="Invoice and reconciliation support."
                    status={integrations.zohoBooks.status}
                    onOpen={() => openIntegrationModal("zohoBooks", showToast)}
                  />
                  <IntegrationTile
                    name="Paystack"
                    description="Payment processing and webhooks."
                    status={integrations.paystack.status}
                    onOpen={() => openIntegrationModal("paystack", showToast)}
                  />
                </div>
              </GlassCard>

              <IntegrationCard
                title="Zoho CRM"
                status={integrations.zohoCrm.status}
                statusClass={pillForStatus(integrations.zohoCrm.status)}
                statusLabel={labelForStatus(integrations.zohoCrm.status)}
                enabled={integrations.zohoCrm.enabled}
                onToggleEnabled={(v) => updateIntegration("zohoCrm", { enabled: v })}
                connectMode={integrations.zohoCrm.connectMode}
                onChangeMode={(v) => updateIntegration("zohoCrm", { connectMode: v })}
                fields={[
                  { label: "Organisation ID", value: integrations.zohoCrm.orgId, onChange: (v) => updateIntegration("zohoCrm", { orgId: v }) },
                  { label: "Client ID", value: integrations.zohoCrm.clientId, onChange: (v) => updateIntegration("zohoCrm", { clientId: v }) },
                  { label: "Client Secret", value: integrations.zohoCrm.clientSecret, onChange: (v) => updateIntegration("zohoCrm", { clientSecret: v }), secret: true },
                  { label: "API Key (optional)", value: integrations.zohoCrm.apiKey, onChange: (v) => updateIntegration("zohoCrm", { apiKey: v }), secret: true },
                ]}
                lastChecked={integrations.zohoCrm.lastChecked}
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
              />

              <IntegrationCard
                title="Zoho Books"
                status={integrations.zohoBooks.status}
                statusClass={pillForStatus(integrations.zohoBooks.status)}
                statusLabel={labelForStatus(integrations.zohoBooks.status)}
                enabled={integrations.zohoBooks.enabled}
                onToggleEnabled={(v) => updateIntegration("zohoBooks", { enabled: v })}
                connectMode={integrations.zohoBooks.connectMode}
                onChangeMode={(v) => updateIntegration("zohoBooks", { connectMode: v })}
                fields={[
                  { label: "Organisation ID", value: integrations.zohoBooks.orgId, onChange: (v) => updateIntegration("zohoBooks", { orgId: v }) },
                  { label: "Client ID", value: integrations.zohoBooks.clientId, onChange: (v) => updateIntegration("zohoBooks", { clientId: v }) },
                  { label: "Client Secret", value: integrations.zohoBooks.clientSecret, onChange: (v) => updateIntegration("zohoBooks", { clientSecret: v }), secret: true },
                  { label: "API Key (optional)", value: integrations.zohoBooks.apiKey, onChange: (v) => updateIntegration("zohoBooks", { apiKey: v }), secret: true },
                ]}
                lastChecked={integrations.zohoBooks.lastChecked}
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
              />

              <IntegrationCard
                title="Paystack"
                status={integrations.paystack.status}
                statusClass={pillForStatus(integrations.paystack.status)}
                statusLabel={labelForStatus(integrations.paystack.status)}
                enabled={integrations.paystack.enabled}
                onToggleEnabled={(v) => updateIntegration("paystack", { enabled: v })}
                connectMode={integrations.paystack.connectMode}
                onChangeMode={(v) => updateIntegration("paystack", { connectMode: v })}
                fields={[
                  { label: "Public key", value: integrations.paystack.publicKey, onChange: (v) => updateIntegration("paystack", { publicKey: v }) },
                  { label: "Secret key", value: integrations.paystack.secretKey, onChange: (v) => updateIntegration("paystack", { secretKey: v }), secret: true },
                  { label: "Webhook secret (optional)", value: integrations.paystack.webhookSecret, onChange: (v) => updateIntegration("paystack", { webhookSecret: v }), secret: true },
                ]}
                lastChecked={integrations.paystack.lastChecked}
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
              />
            </div>
          )}

          {activeTab === "branding" && (
            <div className="space-y-4">
              <TabIntro
                title="Profile and Branding"
                text="Control sender identity, support details, and branding used in emails and exports. These values will later flow into templates and PDFs."
              />

              <GlassCard>
                <CardTitle title="Business identity" subtitle="What your clients see in emails and receipts." />

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <Field
                    label="Business name"
                    value={branding.businessName}
                    onChange={(v) => updateBranding({ businessName: v })}
                    placeholder="Your business name"
                  />
                  <Field
                    label="Sender name"
                    value={branding.senderName}
                    onChange={(v) => updateBranding({ senderName: v })}
                    placeholder="Name shown in inbox"
                  />
                  <Field
                    label="Sender email"
                    value={branding.senderEmail}
                    onChange={(v) => updateBranding({ senderEmail: v })}
                    placeholder="no-reply@yourdomain.co.za"
                  />
                  <Field
                    label="Reply-to email"
                    value={branding.replyToEmail}
                    onChange={(v) => updateBranding({ replyToEmail: v })}
                    placeholder="support@yourdomain.co.za"
                  />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <Field
                    label="Support email"
                    value={branding.supportEmail}
                    onChange={(v) => updateBranding({ supportEmail: v })}
                    placeholder="support@yourdomain.co.za"
                  />
                  <Field
                    label="Support phone"
                    value={branding.supportPhone}
                    onChange={(v) => updateBranding({ supportPhone: v })}
                    placeholder="010 446 5754"
                  />
                </div>

                <div className="mt-5">
                  <Field
                    label="Logo URL (optional)"
                    value={branding.logoUrl}
                    onChange={(v) => updateBranding({ logoUrl: v })}
                    placeholder="https://..."
                    helper="Shown in email headers and future PDF exports. Keep it square for best results."
                  />
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    onClick={() => showToast("Branding saved (UI only).")}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
                  >
                    Save changes
                  </button>
                </div>
              </GlassCard>
            </div>
          )}

          {activeTab === "email" && (
            <div className="space-y-4">
              <TabIntro
                title="Email Rules"
                text="Define what gets sent, when, and to whom. Templates include a live preview with sample data so you can confirm tone and clarity."
              />

              <GlassCard>
                <CardTitle
                  title="Operational recipients"
                  subtitle="Defaults and safety rails. Ops should always receive failures."
                />
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <Field
                    label="Ops email"
                    value={emailRules.ops.opsEmail}
                    onChange={(v) => updateEmailRule("ops.opsEmail", v)}
                    placeholder="ops@yourdomain.co.za"
                  />
                  <Field
                    label="CC email (optional)"
                    value={emailRules.ops.ccEmail}
                    onChange={(v) => updateEmailRule("ops.ccEmail", v)}
                    placeholder="finance@yourdomain.co.za"
                  />
                </div>
                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    onClick={() => showToast("Recipients saved (UI only).")}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
                  >
                    Save
                  </button>
                </div>
              </GlassCard>

              <GlassCard>
                <CardTitle
                  title="Rule 1: Debit reminder"
                  subtitle="When a debit run is scheduled, send a reminder to reduce surprises and failed collections."
                />

                <div className="mt-5 grid grid-cols-3 gap-4">
                  <ToggleRow
                    label="Enabled"
                    checked={emailRules.reminder.enabled}
                    onChange={(v) => updateEmailRule("reminder.enabled", v)}
                    hint="If disabled, no reminder emails will be sent."
                  />
                  <Field
                    label="Send"
                    value={String(emailRules.reminder.daysBefore)}
                    onChange={(v) => updateEmailRule("reminder.daysBefore", clampInt(v, 0, 30))}
                    placeholder="2"
                    rightAddon="days before"
                  />
                  <Field
                    label="Time"
                    value={emailRules.reminder.sendTime}
                    onChange={(v) => updateEmailRule("reminder.sendTime", v)}
                    placeholder="09:00"
                    helper="Local time. Example: 09:00"
                  />
                </div>

                <div className="mt-5">
                  <RecipientsPicker
                    value={emailRules.reminder.recipients}
                    onChange={(next) => updateEmailRule("reminder.recipients", next)}
                    note="Ops is recommended for reminders so you can trace what clients received."
                    forceOps={false}
                  />
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <div className="text-xs text-white/60">Template variables: {variables.join("  ")}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTemplateFocus("reminder");
                        showToast("Editing: debit reminder template");
                      }}
                      className={[
                        "px-4 py-2 rounded-xl border text-sm",
                        templateFocus === "reminder"
                          ? "bg-white/10 border-white/15"
                          : "bg-transparent border-white/10 hover:bg-white/5 text-white/80",
                      ].join(" ")}
                    >
                      Edit template
                    </button>
                    <button
                      onClick={() => showToast("Reminder rule saved (UI only).")}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </GlassCard>

              <GlassCard>
                <CardTitle
                  title="Rule 2: Failure notifications"
                  subtitle="When a debit order fails, notify stakeholders so recovery actions can start immediately."
                />

                <div className="mt-5 grid grid-cols-3 gap-4">
                  <ToggleRow
                    label="Enabled"
                    checked={emailRules.failure.enabled}
                    onChange={(v) => updateEmailRule("failure.enabled", v)}
                    hint="If disabled, failures will not trigger any emails."
                  />
                  <Field
                    label="Resend throttle"
                    value={String(emailRules.failure.throttleHours)}
                    onChange={(v) => updateEmailRule("failure.throttleHours", clampInt(v, 1, 168))}
                    placeholder="24"
                    rightAddon="hours"
                    helper="Prevents repeated emails for the same failure."
                  />
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold">Best practice</div>
                    <div className="mt-1 text-xs text-white/70 leading-relaxed">
                      Ops should always receive failures to support audit trails and recovery workflows.
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <RecipientsPicker
                    value={emailRules.failure.recipients}
                    onChange={(next) => updateEmailRule("failure.recipients", next)}
                    note="Ops is locked on for failures."
                    forceOps={true}
                  />
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <div className="text-xs text-white/60">Template variables: {variables.join("  ")}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTemplateFocus("failure");
                        showToast("Editing: failure template");
                      }}
                      className={[
                        "px-4 py-2 rounded-xl border text-sm",
                        templateFocus === "failure"
                          ? "bg-white/10 border-white/15"
                          : "bg-transparent border-white/10 hover:bg-white/5 text-white/80",
                      ].join(" ")}
                    >
                      Edit template
                    </button>
                    <button
                      onClick={() => showToast("Failure rule saved (UI only).")}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </GlassCard>

              <div className="grid grid-cols-2 gap-4">
                <GlassCard>
                  <CardTitle
                    title="Template editor"
                    subtitle={templateFocus === "failure" ? "Failure notification template" : "Debit reminder template"}
                  />

                  <div className="mt-4 text-xs text-white/70 leading-relaxed">
                    Keep it short, clear, and action-driven. Variables will be replaced automatically once backend logic is active.
                  </div>

                  <div className="mt-5 space-y-3">
                    <Field
                      label="Subject"
                      value={templateFocus === "failure" ? emailRules.failure.subject : emailRules.reminder.subject}
                      onChange={(v) =>
                        templateFocus === "failure"
                          ? updateEmailRule("failure.subject", v)
                          : updateEmailRule("reminder.subject", v)
                      }
                      placeholder="Subject line"
                    />
                    <TextArea
                      label="Body"
                      value={templateFocus === "failure" ? emailRules.failure.body : emailRules.reminder.body}
                      onChange={(v) =>
                        templateFocus === "failure"
                          ? updateEmailRule("failure.body", v)
                          : updateEmailRule("reminder.body", v)
                      }
                      placeholder="Email body"
                      rows={14}
                    />
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-2">
                    <button
                      onClick={() => showToast("Template saved (UI only).")}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
                    >
                      Save template
                    </button>
                  </div>
                </GlassCard>

                <GlassCard>
                  <CardTitle title="Live preview" subtitle="Sample data preview to confirm tone and structure." />

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="text-xs text-white/60">Subject</div>
                    <div className="mt-1 text-sm font-semibold leading-snug whitespace-pre-wrap">{preview.subject}</div>

                    <div className="mt-4 text-xs text-white/60">Body</div>
                    <div className="mt-1 text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{preview.body}</div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold">Preview notes</div>
                    <ul className="mt-2 space-y-2 text-xs text-white/70 leading-relaxed list-disc pl-5">
                      <li>Keep reminders friendly and direct.</li>
                      <li>Failures should list next steps clearly.</li>
                      <li>Use a consistent sender name for trust.</li>
                    </ul>
                  </div>
                </GlassCard>
              </div>
            </div>
          )}
        </div>

        {toast && (
          <div className="fixed bottom-6 right-6">
            <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl px-4 py-3 text-sm text-white/90 shadow-xl">
              {toast}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------
   UI building blocks
---------------------------- */

function Header({ title, subtitle }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <div className="text-2xl font-semibold tracking-tight">{title}</div>
        <div className="mt-1 text-sm text-white/70 leading-relaxed">{subtitle}</div>
      </div>
    </div>
  );
}

function TabIntro({ title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm text-white/70 leading-relaxed">{text}</div>
    </div>
  );
}

function GlassCard({ children }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">{children}</div>;
}

function CardTitle({ title, subtitle }) {
  return (
    <div>
      <div className="text-base font-semibold">{title}</div>
      {subtitle ? <div className="mt-1 text-sm text-white/70 leading-relaxed">{subtitle}</div> : null}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, helper, rightAddon }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-white/70">{label}</div>
        {helper ? <div className="text-xs text-white/45">{helper}</div> : null}
      </div>
      <div className="mt-2 flex items-stretch rounded-2xl border border-white/10 bg-black/30 focus-within:border-white/20">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none"
        />
        {rightAddon ? (
          <div className="px-3 flex items-center text-xs text-white/55 border-l border-white/10">{rightAddon}</div>
        ) : null}
      </div>
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 10 }) {
  return (
    <div className="w-full">
      <div className="text-xs text-white/70">{label}</div>
      <div className="mt-2 rounded-2xl border border-white/10 bg-black/30 focus-within:border-white/20">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full resize-none bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none"
        />
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          {hint ? <div className="mt-1 text-xs text-white/65 leading-relaxed">{hint}</div> : null}
        </div>

        <button
          onClick={() => onChange(!checked)}
          className={[
            "w-[54px] h-[30px] rounded-full border transition relative",
            checked ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10",
          ].join(" ")}
          aria-label={label}
        >
          <span
            className={[
              "absolute top-[4px] w-[22px] h-[22px] rounded-full transition",
              checked ? "left-[28px] bg-white" : "left-[4px] bg-white/70",
            ].join(" ")}
          />
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
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-sm font-semibold">Recipients</div>
      <div className="mt-1 text-xs text-white/65 leading-relaxed">{note}</div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <RecipientChip label="Client" enabled={!!value.client} onToggle={() => setRecipient("client", !value.client)} />
        <RecipientChip
          label="Merchant"
          enabled={!!value.merchant}
          onToggle={() => setRecipient("merchant", !value.merchant)}
        />
        <RecipientChip
          label="Ops"
          enabled={!!value.ops}
          onToggle={() => setRecipient("ops", !value.ops)}
          locked={forceOps}
        />
      </div>
    </div>
  );
}

function RecipientChip({ label, enabled, onToggle, locked }) {
  return (
    <button
      onClick={onToggle}
      disabled={locked}
      className={[
        "rounded-2xl border px-4 py-3 text-left transition",
        enabled ? "bg-white/10 border-white/15" : "bg-white/5 border-white/10 hover:bg-white/7",
        locked ? "opacity-80 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <div className="text-sm font-semibold flex items-center justify-between">
        <span>{label}</span>
        {locked ? <span className="text-xs text-white/55">Locked</span> : null}
      </div>
      <div className="mt-1 text-xs text-white/65">{enabled ? "Enabled" : "Disabled"}</div>
    </button>
  );
}

function IntegrationTile({ name, description, status, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left hover:bg-black/25 transition"
      type="button"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-xs text-white/60">
          {status === "connected" ? "Connected" : status === "needs_attention" ? "Needs attention" : "Not connected"}
        </div>
      </div>
      <div className="mt-1 text-xs text-white/65 leading-relaxed">{description}</div>
      <div className="mt-3 text-xs text-white/55">Open</div>
    </button>
  );
}

function IntegrationCard({
  title,
  status,
  statusClass,
  statusLabel,
  enabled,
  onToggleEnabled,
  connectMode,
  onChangeMode,
  fields,
  lastChecked,
  onConnect,
  onDisconnect,
  onTest,
}) {
  const showFields = enabled;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold">{title}</div>
          <div className="mt-1 text-sm text-white/70 leading-relaxed">
            Status:{" "}
            <span className={["inline-flex items-center px-2 py-1 rounded-full border text-xs", statusClass].join(" ")}>
              {statusLabel}
            </span>
            {lastChecked ? <span className="ml-2 text-xs text-white/50">Last checked: {lastChecked}</span> : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleEnabled(!enabled)}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
            type="button"
          >
            {enabled ? "Disable" : "Enable"}
          </button>
          {status === "connected" ? (
            <button
              onClick={onDisconnect}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/80"
              type="button"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={onConnect}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
              type="button"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <ModeChip label="OAuth" active={connectMode === "oauth"} onClick={() => onChangeMode("oauth")} disabled={!enabled} />
        <ModeChip
          label="API Key"
          active={connectMode === "apiKey"}
          onClick={() => onChangeMode("apiKey")}
          disabled={!enabled}
        />
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs text-white/60">Quick actions</div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={onTest}
              disabled={!enabled}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs disabled:opacity-50"
              type="button"
            >
              Test connection
            </button>
            <button
              onClick={() => {}}
              disabled={!enabled}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 disabled:opacity-50"
              title="UI-only placeholder"
              type="button"
            >
              Advanced
            </button>
          </div>
        </div>
      </div>

      {showFields ? (
        <div className="mt-5 grid grid-cols-2 gap-4">
          {fields.map((f) => (
            <SecretField
              key={f.label}
              label={f.label}
              value={f.value}
              onChange={f.onChange}
              secret={!!f.secret}
              disabled={!enabled}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70 leading-relaxed">
          Enable this integration to configure credentials and connection settings.
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          onClick={onTest}
          disabled={!enabled}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/80 disabled:opacity-50"
          type="button"
        >
          Test
        </button>
        <button
          onClick={() => {}}
          disabled={!enabled}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm disabled:opacity-50"
          title="UI-only placeholder"
          type="button"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function ModeChip({ label, active, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-2xl border px-4 py-4 text-left transition",
        active ? "bg-white/10 border-white/15" : "bg-white/5 border-white/10 hover:bg-white/7",
        disabled ? "opacity-50 cursor-not-allowed" : "",
      ].join(" ")}
      type="button"
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-1 text-xs text-white/65">UI-only mode selector</div>
    </button>
  );
}

function SecretField({ label, value, onChange, secret, disabled }) {
  const [reveal, setReveal] = useState(false);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-white/70">{label}</div>
        {secret ? (
          <button
            onClick={() => setReveal((p) => !p)}
            className="text-xs text-white/55 hover:text-white/80"
            type="button"
            disabled={disabled}
          >
            {reveal ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>

      <div className="mt-2 rounded-2xl border border-white/10 bg-black/30 focus-within:border-white/20">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={secret ? "••••••••" : ""}
          type={secret && !reveal ? "password" : "text"}
          disabled={disabled}
          className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none disabled:opacity-60"
        />
      </div>
    </div>
  );
}

/* ---------------------------
   Helpers
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

function openIntegrationModal(_key, showToast) {
  // UI-only placeholder. Keeps the UX intention without introducing a modal dependency.
  showToast("Integration opened (UI-only placeholder).");
}
