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
  const [toast, setToast] = useState(null);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  }

  function pillForStatus(status) {
    if (status === "connected") return "bg-emerald-500/15 text-emerald-200 border-emerald-500/25";
    if (status === "needs_attention") return "bg-amber-500/15 text-amber-200 border-amber-500/25";
    return "bg-white/5 text-white/70 border-white/12";
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
    return {
      subject: interpolate(rule.subject, sample),
      body: interpolate(rule.body, sample),
    };
  }, [emailRules, templateFocus, branding.senderName]);

  return (
    <div className="w-full h-full p-6 text-white">
      <div className="max-w-[1200px] mx-auto">
        <Header
          title="Settings"
          subtitle="Control integrations, identity, and email behaviour. Everything here is UI-only until backend wiring resumes."
        />

        {/* Tabs */}
        <div className="mt-6">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-2">
            {TABS.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  type="button"
                  className={[
                    "px-4 py-2 rounded-xl text-sm transition relative",
                    active
                      ? "bg-white/10 border border-white/15 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                      : "text-white/70 hover:text-white hover:bg-white/5",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          {activeTab === "integrations" && (
            <div className="space-y-4">
              <TabIntro
                title="Integrations"
                text="Connect the tools your team already uses. Status-first controls keep this clean today and scalable later."
              />

              <GlassCard>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle title="Connection overview" subtitle="Connect only what you need. Test status without leaving this page." />
                  <div className="text-xs text-white/55 leading-relaxed text-right">
                    Tip: keep credentials in a password manager
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-4">
                  <IntegrationTile
                    name="Zoho CRM"
                    description="Sync clients and account records."
                    status={integrations.zohoCrm.status}
                    onOpen={() => openIntegrationModal("zohoCrm", showToast)}
                  />
                  <IntegrationTile
                    name="Zoho Books"
                    description="Invoices and reconciliation support."
                    status={integrations.zohoBooks.status}
                    onOpen={() => openIntegrationModal("zohoBooks", showToast)}
                  />
                  <IntegrationTile
                    name="Paystack"
                    description="Payments and webhooks."
                    status={integrations.paystack.status}
                    onOpen={() => openIntegrationModal("paystack", showToast)}
                  />
                </div>
              </GlassCard>

              <IntegrationCard
                title="Zoho CRM"
                hint="Ideal for client sync and account management."
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
                hint="Useful for finance workflows and reconciliation."
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
                hint="Payment processing and event webhooks."
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
                text="Make emails and exports feel consistent. Keep sender details stable so clients always recognise you."
              />

              <GlassCard>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle title="Business identity" subtitle="What clients see in their inbox and in future exports." />
                  <button
                    onClick={() => showToast("Branding saved (UI only).")}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                    type="button"
                  >
                    Save changes
                  </button>
                </div>

                <Divider />

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Business name" value={branding.businessName} onChange={(v) => updateBranding({ businessName: v })} placeholder="Your business name" />
                  <Field label="Sender name" value={branding.senderName} onChange={(v) => updateBranding({ senderName: v })} placeholder="Name shown in inbox" />
                  <Field label="Sender email" value={branding.senderEmail} onChange={(v) => updateBranding({ senderEmail: v })} placeholder="no-reply@yourdomain.co.za" />
                  <Field label="Reply-to email" value={branding.replyToEmail} onChange={(v) => updateBranding({ replyToEmail: v })} placeholder="support@yourdomain.co.za" />
                </div>

                <Divider />

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Support email" value={branding.supportEmail} onChange={(v) => updateBranding({ supportEmail: v })} placeholder="support@yourdomain.co.za" />
                  <Field label="Support phone" value={branding.supportPhone} onChange={(v) => updateBranding({ supportPhone: v })} placeholder="010 446 5754" />
                </div>

                <Divider />

                <Field
                  label="Logo URL (optional)"
                  value={branding.logoUrl}
                  onChange={(v) => updateBranding({ logoUrl: v })}
                  placeholder="https://..."
                  helper="Used in email headers and future PDFs. Square logos look best."
                />
              </GlassCard>
            </div>
          )}

          {activeTab === "email" && (
            <div className="space-y-4">
              <TabIntro
                title="Email Rules"
                text="Rules read like logic: when something happens, who gets notified, and what they receive."
              />

              <GlassCard>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle title="Operational recipients" subtitle="Safe defaults. Ops should always receive failures." />
                  <button
                    onClick={() => showToast("Recipients saved (UI only).")}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                    type="button"
                  >
                    Save
                  </button>
                </div>

                <Divider />

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Ops email" value={emailRules.ops.opsEmail} onChange={(v) => updateEmailRule("ops.opsEmail", v)} placeholder="ops@yourdomain.co.za" />
                  <Field label="CC email (optional)" value={emailRules.ops.ccEmail} onChange={(v) => updateEmailRule("ops.ccEmail", v)} placeholder="finance@yourdomain.co.za" />
                </div>
              </GlassCard>

              <GlassCard>
                <CardTitle title="Rule 1: Debit reminder" subtitle="Two days before the run date, reduce surprises and failures." />

                <Divider />

                <div className="grid grid-cols-3 gap-4">
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
                    placeholder="2"
                    rightAddon="days before"
                  />
                  <Field
                    label="Time"
                    value={emailRules.reminder.sendTime}
                    onChange={(v) => updateEmailRule("reminder.sendTime", v)}
                    placeholder="09:00"
                    helper="Local time, for example 09:00"
                  />
                </div>

                <div className="mt-5">
                  <RecipientsPicker
                    value={emailRules.reminder.recipients}
                    onChange={(next) => updateEmailRule("reminder.recipients", next)}
                    note="Ops is recommended for traceability."
                    forceOps={false}
                  />
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <div className="text-xs text-white/55 leading-relaxed">
                    Variables available: <span className="text-white/75">{variables.join("  ")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTemplateFocus("reminder");
                        showToast("Editing reminder template");
                      }}
                      className={[
                        "px-4 py-2 rounded-xl border text-sm transition shadow-[0_0_0_1px_rgba(255,255,255,0.04)]",
                        templateFocus === "reminder"
                          ? "bg-white/10 border-white/15 text-white"
                          : "bg-transparent border-white/10 text-white/75 hover:bg-white/5 hover:text-white",
                      ].join(" ")}
                      type="button"
                    >
                      Edit template
                    </button>
                    <button
                      onClick={() => showToast("Reminder rule saved (UI only).")}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                      type="button"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </GlassCard>

              <GlassCard>
                <CardTitle title="Rule 2: Failure notifications" subtitle="Notify stakeholders immediately so recovery can start." />

                <Divider />

                <div className="grid grid-cols-3 gap-4">
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
                    placeholder="24"
                    rightAddon="hours"
                    helper="Prevents repeated emails for the same failure."
                  />
                  <InfoCard
                    title="Best practice"
                    text="Ops stays on for failures to maintain audit trails and reduce response time."
                  />
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
                  <div className="text-xs text-white/55 leading-relaxed">
                    Variables available: <span className="text-white/75">{variables.join("  ")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTemplateFocus("failure");
                        showToast("Editing failure template");
                      }}
                      className={[
                        "px-4 py-2 rounded-xl border text-sm transition shadow-[0_0_0_1px_rgba(255,255,255,0.04)]",
                        templateFocus === "failure"
                          ? "bg-white/10 border-white/15 text-white"
                          : "bg-transparent border-white/10 text-white/75 hover:bg-white/5 hover:text-white",
                      ].join(" ")}
                      type="button"
                    >
                      Edit template
                    </button>
                    <button
                      onClick={() => showToast("Failure rule saved (UI only).")}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                      type="button"
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

                  <Divider />

                  <div className="text-xs text-white/65 leading-relaxed">
                    Keep tone consistent and action-driven. Templates will become live once backend logic is active.
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

                  <div className="mt-6 flex items-center justify-end">
                    <button
                      onClick={() => showToast("Template saved (UI only).")}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                      type="button"
                    >
                      Save template
                    </button>
                  </div>
                </GlassCard>

                <GlassCard>
                  <CardTitle title="Live preview" subtitle="Sample data preview to validate clarity and tone." />

                  <Divider />

                  <EmailPreview subject={preview.subject} body={preview.body} />

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <MiniHint title="Clear subject" text="Client can understand in one glance." />
                    <MiniHint title="Next steps" text="Failure emails should point to action." />
                    <MiniHint title="Trust signals" text="Consistent sender name and tone." />
                  </div>
                </GlassCard>
              </div>
            </div>
          )}
        </div>

        {toast && (
          <div className="fixed bottom-6 right-6">
            <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl px-4 py-3 text-sm text-white/90 shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
              {toast}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------
   Premium UI building blocks
---------------------------- */

function Header({ title, subtitle }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-white/6 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-white/4 blur-3xl" />
      </div>
      <div className="relative">
        <div className="text-2xl font-semibold tracking-tight">{title}</div>
        <div className="mt-2 text-sm text-white/70 leading-relaxed max-w-[820px]">{subtitle}</div>
      </div>
    </div>
  );
}

function TabIntro({ title, text }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm text-white/70 leading-relaxed">{text}</div>
    </div>
  );
}

function GlassCard({ children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      {children}
    </div>
  );
}

function CardTitle({ title, subtitle }) {
  return (
    <div>
      <div className="text-base font-semibold">{title}</div>
      {subtitle ? <div className="mt-2 text-sm text-white/70 leading-relaxed">{subtitle}</div> : null}
    </div>
  );
}

function Divider() {
  return <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />;
}

function Field({ label, value, onChange, placeholder, helper, rightAddon }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-white/70">{label}</div>
        {helper ? <div className="text-xs text-white/45">{helper}</div> : null}
      </div>
      <div className="mt-2 flex items-stretch rounded-2xl border border-white/10 bg-black/30 focus-within:border-white/20 focus-within:shadow-[0_0_0_4px_rgba(255,255,255,0.04)]">
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
      <div className="mt-2 rounded-2xl border border-white/10 bg-black/30 focus-within:border-white/20 focus-within:shadow-[0_0_0_4px_rgba(255,255,255,0.04)]">
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
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          {hint ? <div className="mt-1 text-xs text-white/65 leading-relaxed">{hint}</div> : null}
        </div>

        <button
          onClick={() => onChange(!checked)}
          className={[
            "w-[56px] h-[32px] rounded-full border transition relative",
            checked ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10",
          ].join(" ")}
          aria-label={label}
          type="button"
        >
          <span
            className={[
              "absolute top-[4px] w-[24px] h-[24px] rounded-full transition",
              checked ? "left-[28px] bg-white shadow-[0_10px_28px_rgba(0,0,0,0.35)]" : "left-[4px] bg-white/70",
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
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="text-sm font-semibold">Recipients</div>
      <div className="mt-1 text-xs text-white/65 leading-relaxed">{note}</div>

      <div className="mt-4 grid grid-cols-3 gap-3">
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
      onClick={onToggle}
      disabled={locked}
      type="button"
      className={[
        "rounded-2xl border px-4 py-3 text-left transition",
        enabled
          ? "bg-white/10 border-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
          : "bg-white/5 border-white/10 hover:bg-white/7",
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
  const statusText = status === "connected" ? "Connected" : status === "needs_attention" ? "Needs attention" : "Not connected";

  return (
    <button
      onClick={onOpen}
      type="button"
      className="group rounded-3xl border border-white/10 bg-black/25 p-5 text-left transition hover:bg-black/30 shadow-[0_14px_50px_rgba(0,0,0,0.22)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-xs text-white/60 group-hover:text-white/75 transition">{statusText}</div>
      </div>

      <div className="mt-2 text-xs text-white/65 leading-relaxed">{description}</div>

      <div className="mt-4 flex items-center justify-between">
        <div className="h-px w-12 bg-white/10 group-hover:bg-white/15 transition" />
        <div className="text-xs text-white/55 group-hover:text-white/75 transition">Open</div>
      </div>
    </button>
  );
}

function IntegrationCard({
  title,
  hint,
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
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold">{title}</div>
          <div className="mt-2 text-sm text-white/70 leading-relaxed">
            {hint ? <span className="text-white/65">{hint} </span> : null}
            <span className="ml-0">
              Status:{" "}
              <span className={["inline-flex items-center px-2.5 py-1 rounded-full border text-xs", statusClass].join(" ")}>
                {statusLabel}
              </span>
              {lastChecked ? <span className="ml-2 text-xs text-white/50">Last checked: {lastChecked}</span> : null}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleEnabled(!enabled)}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
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
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
              type="button"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      <Divider />

      <div className="grid grid-cols-3 gap-3">
        <ModeChip label="OAuth" active={connectMode === "oauth"} onClick={() => onChangeMode("oauth")} disabled={!enabled} />
        <ModeChip label="API Key" active={connectMode === "apiKey"} onClick={() => onChangeMode("apiKey")} disabled={!enabled} />

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
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
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/70 leading-relaxed">
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
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm disabled:opacity-50 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
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
      type="button"
      className={[
        "rounded-2xl border px-4 py-4 text-left transition shadow-[0_0_0_1px_rgba(255,255,255,0.03)]",
        active ? "bg-white/10 border-white/15" : "bg-white/5 border-white/10 hover:bg-white/7",
        disabled ? "opacity-50 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-1 text-xs text-white/65">UI-only selector</div>
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

      <div className="mt-2 rounded-2xl border border-white/10 bg-black/30 focus-within:border-white/20 focus-within:shadow-[0_0_0_4px_rgba(255,255,255,0.04)]">
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

function InfoCard({ title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-white/70 leading-relaxed">{text}</div>
    </div>
  );
}

function EmailPreview({ subject, body }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-white/60">Subject</div>
        <div className="text-[11px] text-white/45">Preview</div>
      </div>

      <div className="mt-2 text-sm font-semibold leading-snug whitespace-pre-wrap">{subject}</div>

      <div className="mt-5 text-xs text-white/60">Body</div>
      <div className="mt-2 text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{body}</div>
    </div>
  );
}

function MiniHint({ title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="text-xs font-semibold">{title}</div>
      <div className="mt-1 text-xs text-white/65 leading-relaxed">{text}</div>
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
  showToast("Integration opened (UI-only placeholder).");
}
