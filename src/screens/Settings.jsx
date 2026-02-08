import React, { useMemo, useRef, useState } from "react";

const styles = {
  page: { height: "100%", display: "flex", flexDirection: "column", gap: 16 },

  headerRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 },
  titleWrap: { display: "flex", flexDirection: "column", gap: 6 },
  title: { margin: 0, fontSize: 26, letterSpacing: 0.2, color: "rgba(255,255,255,0.92)" },
  subtitle: { margin: 0, fontSize: 13, color: "rgba(255,255,255,0.62)", lineHeight: 1.45 },
  actionsRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },

  glass: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
    backdropFilter: "blur(14px)",
    overflow: "hidden",
  },

  panelHeader: {
    padding: "14px 14px 12px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.10)",
  },
  panelTitle: { margin: 0, fontSize: 14, color: "rgba(255,255,255,0.86)" },
  panelMeta: { margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)" },

  tabsRow: {
    padding: 14,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  tab: (active) => ({
    height: 36,
    padding: "0 12px",
    borderRadius: 999,
    border: `1px solid ${active ? "rgba(168,85,247,0.55)" : "rgba(255,255,255,0.12)"}`,
    background: active ? "rgba(168,85,247,0.16)" : "rgba(255,255,255,0.05)",
    color: active ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.76)",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.2,
    userSelect: "none",
  }),

  content: { padding: 14, display: "flex", flexDirection: "column", gap: 14, minHeight: 0 },

  grid2: { display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 14, minHeight: 0 },
  card: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.14)",
    padding: 12,
  },
  cardTitle: {
    margin: 0,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.78)",
  },

  formGrid: { marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 12, fontWeight: 800, letterSpacing: 0.2, color: "rgba(255,255,255,0.72)" },
  input: {
    height: 40,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.88)",
    outline: "none",
    padding: "0 12px",
    fontSize: 13,
  },
  textarea: {
    minHeight: 120,
    resize: "vertical",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.88)",
    outline: "none",
    padding: 12,
    fontSize: 13,
    lineHeight: 1.5,
  },
  select: {
    height: 40,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.88)",
    outline: "none",
    padding: "0 12px",
    fontSize: 13,
    appearance: "none",
  },

  hint: { fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 },
  divider: { height: 1, background: "rgba(255,255,255,0.08)", marginTop: 12 },

  btnRow: { marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
  btn: (variant = "secondary", disabled = false) => {
    const base = {
      height: 40,
      padding: "0 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.86)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      userSelect: "none",
      transition: "transform 160ms ease, box-shadow 160ms ease, border 160ms ease",
      fontSize: 13,
      fontWeight: 800,
      letterSpacing: 0.2,
      opacity: disabled ? 0.55 : 1,
      minWidth: 140,
    };

    if (variant === "primary") {
      return {
        ...base,
        background: "linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95))",
        border: "1px solid rgba(168,85,247,0.55)",
        boxShadow: "0 14px 34px rgba(124,58,237,0.28)",
      };
    }

    if (variant === "danger") {
      return {
        ...base,
        background: "rgba(239,68,68,0.14)",
        border: "1px solid rgba(239,68,68,0.35)",
        minWidth: 140,
      };
    }

    return base;
  },

  statusPill: (tone) => {
    const map = {
      Connected: { bg: "rgba(34,197,94,0.14)", bd: "rgba(34,197,94,0.30)" },
      "Not connected": { bg: "rgba(255,255,255,0.06)", bd: "rgba(255,255,255,0.14)" },
      Error: { bg: "rgba(239,68,68,0.16)", bd: "rgba(239,68,68,0.32)" },
    };
    const t = map[tone] || map["Not connected"];
    return {
      height: 22,
      padding: "0 10px",
      borderRadius: 999,
      display: "inline-flex",
      alignItems: "center",
      border: `1px solid ${t.bd}`,
      background: t.bg,
      color: "rgba(255,255,255,0.86)",
      fontSize: 11,
      fontWeight: 900,
      letterSpacing: 0.2,
    };
  },

  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
  },
  toggleTitle: { fontSize: 13, fontWeight: 900, color: "rgba(255,255,255,0.84)" },
  toggleSub: { marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.45 },
  toggle: { width: 44, height: 24, accentColor: "#A855F7", cursor: "pointer" },

  previewBox: {
    marginTop: 10,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.14)",
    overflow: "hidden",
  },
  previewHeader: {
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    background: "rgba(0,0,0,0.08)",
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.78)",
    textTransform: "uppercase",
  },
  previewBody: { padding: 12, display: "flex", flexDirection: "column", gap: 10 },
  emailCard: {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    padding: 12,
  },
  emailSubject: { fontSize: 13, fontWeight: 900, color: "rgba(255,255,255,0.88)" },
  emailLine: { fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 },
};

function mask(value) {
  if (!value) return "";
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 3)}${"•".repeat(Math.max(4, value.length - 6))}${value.slice(-3)}`;
}

function sampleVars() {
  return {
    payer_name: "Thandi Mokoena",
    amount: "R3,990",
    run_date: "15 Feb 2026",
    reference: "MKH-MND-0182",
    failure_reason: "Insufficient funds",
    support_email: "support@tabbytech.co.za",
    support_phone: "010 446 5754",
    company_name: "TabbyTech",
  };
}

function applyVars(template, vars) {
  return (template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => String(vars[key] ?? ""));
}

export default function Settings() {
  const [tab, setTab] = useState("integrations");

  const [zohoRegion, setZohoRegion] = useState("ZA");
  const [zohoCrmClientId, setZohoCrmClientId] = useState("");
  const [zohoCrmClientSecret, setZohoCrmClientSecret] = useState("");
  const [zohoCrmRefreshToken, setZohoCrmRefreshToken] = useState("");

  const [zohoBooksOrgId, setZohoBooksOrgId] = useState("");
  const [zohoBooksRefreshToken, setZohoBooksRefreshToken] = useState("");

  const [paystackSecretKey, setPaystackSecretKey] = useState("");

  const [showSecrets, setShowSecrets] = useState(false);
  const [crmStatus, setCrmStatus] = useState("Not connected");
  const [booksStatus, setBooksStatus] = useState("Not connected");
  const [paystackStatus, setPaystackStatus] = useState("Not connected");

  const [companyName, setCompanyName] = useState("TabbyTech");
  const [supportEmail, setSupportEmail] = useState("support@tabbytech.co.za");
  const [supportPhone, setSupportPhone] = useState("010 446 5754");
  const [timezone, setTimezone] = useState("Africa/Johannesburg");
  const [accent, setAccent] = useState("#A855F7");
  const [emailFooter, setEmailFooter] = useState(
    "If you have questions, reply to this email or contact support."
  );

  const logoInputRef = useRef(null);
  const [logoUrl, setLogoUrl] = useState("");

  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(2);
  const [sendTime, setSendTime] = useState("09:00");
  const [avoidWeekends, setAvoidWeekends] = useState(true);

  const [reminderToClient, setReminderToClient] = useState(true);
  const [reminderToMerchant, setReminderToMerchant] = useState(true);
  const [reminderToOps, setReminderToOps] = useState(true);
  const [opsEmail, setOpsEmail] = useState("ops@tabbytech.co.za");

  const [failureEnabled, setFailureEnabled] = useState(true);
  const [failureToClient, setFailureToClient] = useState(true);
  const [failureToMerchant, setFailureToMerchant] = useState(true);
  const [failureToOps, setFailureToOps] = useState(true);
  const [includeReasonCodes, setIncludeReasonCodes] = useState(true);

  const [reminderSubject, setReminderSubject] = useState("Reminder: Debit order scheduled for {{run_date}}");
  const [reminderBody, setReminderBody] = useState(
    "Hi {{payer_name}},\n\nThis is a reminder that a debit order of {{amount}} is scheduled for {{run_date}}.\nReference: {{reference}}\n\nIf you need assistance, contact {{company_name}} at {{support_email}} or {{support_phone}}.\n\nThank you,\n{{company_name}}"
  );

  const [failureSubject, setFailureSubject] = useState("Action needed: Debit order failed on {{run_date}}");
  const [failureBody, setFailureBody] = useState(
    "Hi {{payer_name}},\n\nYour debit order of {{amount}} scheduled for {{run_date}} was unsuccessful.\nReference: {{reference}}\nReason: {{failure_reason}}\n\nPlease contact {{company_name}} at {{support_email}} or {{support_phone}} to resolve this.\n\nThank you,\n{{company_name}}"
  );

  const vars = useMemo(() => {
    return {
      ...sampleVars(),
      support_email: supportEmail,
      support_phone: supportPhone,
      company_name: companyName,
    };
  }, [supportEmail, supportPhone, companyName]);

  const reminderPreview = useMemo(() => {
    return { subject: applyVars(reminderSubject, vars), body: applyVars(reminderBody, vars) };
  }, [reminderSubject, reminderBody, vars]);

  const failurePreview = useMemo(() => {
    const v = includeReasonCodes ? vars : { ...vars, failure_reason: "" };
    return { subject: applyVars(failureSubject, v), body: applyVars(failureBody, v) };
  }, [failureSubject, failureBody, vars, includeReasonCodes]);

  function handleLogoPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoUrl(url);
  }

  function fakeTest(setStatus) {
    setStatus("Connected");
  }

  function fakeDisconnect(setStatus) {
    setStatus("Not connected");
  }

  const tabs = [
    { key: "integrations", label: "Integrations" },
    { key: "profile", label: "Profile and Branding" },
    { key: "email", label: "Email Rules" },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={styles.titleWrap}>
          <h1 style={styles.title}>Settings</h1>
          <p style={styles.subtitle}>
            Configure integrations, branding, and notification rules. Everything is UI-only for now and will be connected once backend resumes.
          </p>
        </div>

        <div style={styles.actionsRow}>
          <button style={styles.btn("secondary")} type="button">
            Reset
          </button>
          <button style={styles.btn("primary")} type="button">
            Save changes
          </button>
        </div>
      </div>

      <div style={{ ...styles.glass, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={styles.panelHeader}>
          <div>
            <p style={styles.panelTitle}>Configuration</p>
            <p style={styles.panelMeta}>3 sections</p>
          </div>
        </div>

        <div style={styles.tabsRow}>
          {tabs.map((t) => {
            const active = t.key === tab;
            return (
              <div
                key={t.key}
                style={styles.tab(active)}
                role="button"
                tabIndex={0}
                onClick={() => setTab(t.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setTab(t.key);
                }}
              >
                <span>{t.label}</span>
              </div>
            );
          })}
        </div>

        <div style={styles.content}>
          {tab === "integrations" && (
            <div style={styles.grid2}>
              <div style={styles.card}>
                <p style={styles.cardTitle}>Zoho CRM</p>

                <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={styles.hint}>Connect to Zoho CRM to sync clients, mandates, and status updates.</div>
                  <span style={styles.statusPill(crmStatus)}>{crmStatus}</span>
                </div>

                <div style={styles.formGrid}>
                  <div style={styles.field}>
                    <div style={styles.label}>Zoho region</div>
                    <select style={styles.select} value={zohoRegion} onChange={(e) => setZohoRegion(e.target.value)}>
                      <option value="ZA">South Africa</option>
                      <option value="EU">Europe</option>
                      <option value="US">United States</option>
                      <option value="IN">India</option>
                    </select>
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Client ID</div>
                    <input style={styles.input} value={zohoCrmClientId} onChange={(e) => setZohoCrmClientId(e.target.value)} placeholder="Paste client id" />
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Client secret</div>
                    <input
                      style={styles.input}
                      value={showSecrets ? zohoCrmClientSecret : mask(zohoCrmClientSecret)}
                      onChange={(e) => setZohoCrmClientSecret(e.target.value)}
                      placeholder="Paste client secret"
                    />
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Refresh token</div>
                    <input
                      style={styles.input}
                      value={showSecrets ? zohoCrmRefreshToken : mask(zohoCrmRefreshToken)}
                      onChange={(e) => setZohoCrmRefreshToken(e.target.value)}
                      placeholder="Paste refresh token"
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                    <input type="checkbox" checked={showSecrets} onChange={(e) => setShowSecrets(e.target.checked)} />
                    Show secrets
                  </label>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button style={styles.btn("secondary")} type="button" onClick={() => fakeTest(setCrmStatus)}>
                      Test connection
                    </button>
                    <button style={styles.btn("danger")} type="button" onClick={() => fakeDisconnect(setCrmStatus)}>
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
                <div style={styles.card}>
                  <p style={styles.cardTitle}>Zoho Books</p>

                  <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={styles.hint}>Sync invoices, ledger references, and payment confirmation.</div>
                    <span style={styles.statusPill(booksStatus)}>{booksStatus}</span>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                    <div style={styles.field}>
                      <div style={styles.label}>Organisation ID</div>
                      <input style={styles.input} value={zohoBooksOrgId} onChange={(e) => setZohoBooksOrgId(e.target.value)} placeholder="Paste organisation id" />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Refresh token</div>
                      <input
                        style={styles.input}
                        value={showSecrets ? zohoBooksRefreshToken : mask(zohoBooksRefreshToken)}
                        onChange={(e) => setZohoBooksRefreshToken(e.target.value)}
                        placeholder="Paste refresh token"
                      />
                    </div>
                  </div>

                  <div style={styles.btnRow}>
                    <button style={styles.btn("secondary")} type="button" onClick={() => fakeTest(setBooksStatus)}>
                      Test connection
                    </button>
                    <button style={styles.btn("danger")} type="button" onClick={() => fakeDisconnect(setBooksStatus)}>
                      Disconnect
                    </button>
                  </div>
                </div>

                <div style={styles.card}>
                  <p style={styles.cardTitle}>Paystack</p>

                  <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={styles.hint}>Used for payment events, verification, and reconciliation.</div>
                    <span style={styles.statusPill(paystackStatus)}>{paystackStatus}</span>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                    <div style={styles.field}>
                      <div style={styles.label}>Secret key</div>
                      <input
                        style={styles.input}
                        value={showSecrets ? paystackSecretKey : mask(paystackSecretKey)}
                        onChange={(e) => setPaystackSecretKey(e.target.value)}
                        placeholder="Paste secret key"
                      />
                    </div>
                  </div>

                  <div style={styles.btnRow}>
                    <button style={styles.btn("secondary")} type="button" onClick={() => fakeTest(setPaystackStatus)}>
                      Test connection
                    </button>
                    <button style={styles.btn("danger")} type="button" onClick={() => fakeDisconnect(setPaystackStatus)}>
                      Disconnect
                    </button>
                  </div>

                  <div style={styles.divider} />
                  <div style={styles.hint}>
                    Best practice: keep keys masked by default and only reveal them when needed. In production, secrets must be stored in secure server-side storage.
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "profile" && (
            <div style={styles.grid2}>
              <div style={styles.card}>
                <p style={styles.cardTitle}>Company profile</p>

                <div style={styles.formGrid}>
                  <div style={styles.field}>
                    <div style={styles.label}>Company name</div>
                    <input style={styles.input} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Time zone</div>
                    <input style={styles.input} value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Support email</div>
                    <input style={styles.input} value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Support phone</div>
                    <input style={styles.input} value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} />
                  </div>
                </div>

                <div style={styles.divider} />

                <p style={{ ...styles.cardTitle, marginTop: 12 }}>Branding</p>

                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={styles.field}>
                    <div style={styles.label}>Accent color</div>
                    <input style={styles.input} value={accent} onChange={(e) => setAccent(e.target.value)} placeholder="#A855F7" />
                    <div style={styles.hint}>Use the TabbyTech purple for buttons and highlights.</div>
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Logo</div>
                    <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoPick} />
                    <button style={styles.btn("secondary")} type="button" onClick={() => logoInputRef.current?.click()}>
                      Upload logo
                    </button>
                    <div style={styles.hint}>UI preview only. In production this uploads to storage and updates templates.</div>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                  <div style={styles.field}>
                    <div style={styles.label}>Email footer</div>
                    <textarea style={styles.textarea} value={emailFooter} onChange={(e) => setEmailFooter(e.target.value)} />
                  </div>
                </div>

                <div style={styles.btnRow}>
                  <button style={styles.btn("secondary")} type="button">
                    Preview
                  </button>
                  <button style={styles.btn("primary")} type="button">
                    Save branding
                  </button>
                </div>
              </div>

              <div style={styles.card}>
                <p style={styles.cardTitle}>Preview</p>

                <div style={styles.previewBox}>
                  <div style={styles.previewHeader}>
                    <div style={styles.previewTitle}>Email brand preview</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: accent,
                          boxShadow: `0 0 0 6px ${accent}22`,
                        }}
                      />
                      <div style={styles.hint}>Accent</div>
                    </div>
                  </div>

                  <div style={styles.previewBody}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 16,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(255,255,255,0.04)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontWeight: 900, color: "rgba(255,255,255,0.70)" }}>TT</span>
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: "rgba(255,255,255,0.88)" }}>{companyName}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{supportEmail}</div>
                      </div>
                    </div>

                    <div style={styles.emailCard}>
                      <div style={styles.emailSubject}>Subject preview</div>
                      <div style={{ ...styles.emailLine, marginTop: 8 }}>
                        This is how your emails will feel with your branding, support details, and footer messaging.
                      </div>
                      <div style={{ height: 10 }} />
                      <button
                        type="button"
                        style={{
                          height: 40,
                          padding: "0 14px",
                          borderRadius: 12,
                          border: `1px solid ${accent}88`,
                          background: `linear-gradient(135deg, ${accent}, rgba(124,58,237,0.95))`,
                          color: "white",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Primary action
                      </button>
                      <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                        {emailFooter}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12, ...styles.hint }}>
                  Best practice: keep support details consistent across all client facing messages. This reduces disputes and improves trust.
                </div>
              </div>
            </div>
          )}

          {tab === "email" && (
            <div style={styles.grid2}>
              <div style={styles.card}>
                <p style={styles.cardTitle}>Notification rules</p>

                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={styles.toggleRow}>
                    <div>
                      <div style={styles.toggleTitle}>Upcoming debit reminder</div>
                      <div style={styles.toggleSub}>
                        Send a reminder before a debit order runs. Default is 2 days before.
                      </div>
                    </div>
                    <input
                      style={styles.toggle}
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => setReminderEnabled(e.target.checked)}
                    />
                  </div>

                  <div style={styles.formGrid}>
                    <div style={styles.field}>
                      <div style={styles.label}>Days before run</div>
                      <input
                        style={styles.input}
                        type="number"
                        min={0}
                        max={14}
                        value={reminderDaysBefore}
                        onChange={(e) => setReminderDaysBefore(Number(e.target.value || 0))}
                        disabled={!reminderEnabled}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Send time</div>
                      <input
                        style={styles.input}
                        type="time"
                        value={sendTime}
                        onChange={(e) => setSendTime(e.target.value)}
                        disabled={!reminderEnabled}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Avoid weekends</div>
                      <select
                        style={styles.select}
                        value={avoidWeekends ? "yes" : "no"}
                        onChange={(e) => setAvoidWeekends(e.target.value === "yes")}
                        disabled={!reminderEnabled}
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Ops inbox</div>
                      <input style={styles.input} value={opsEmail} onChange={(e) => setOpsEmail(e.target.value)} />
                    </div>
                  </div>

                  <div style={styles.card}>
                    <p style={styles.cardTitle}>Recipients</p>

                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.74)", fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={reminderToClient}
                          onChange={(e) => setReminderToClient(e.target.checked)}
                          disabled={!reminderEnabled}
                        />
                        Reminder to payer
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.74)", fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={reminderToMerchant}
                          onChange={(e) => setReminderToMerchant(e.target.checked)}
                          disabled={!reminderEnabled}
                        />
                        Reminder to client business
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.74)", fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={reminderToOps}
                          onChange={(e) => setReminderToOps(e.target.checked)}
                          disabled={!reminderEnabled}
                        />
                        Reminder to ops inbox
                      </label>
                    </div>

                    <div style={{ marginTop: 10, ...styles.hint }}>
                      Best practice: send the payer email by default. Merchant and ops copies reduce support tickets and disputes.
                    </div>
                  </div>

                  <div style={styles.toggleRow}>
                    <div>
                      <div style={styles.toggleTitle}>Failed debit alert</div>
                      <div style={styles.toggleSub}>
                        Send an alert when a debit fails. Both the payer and your team should be notified.
                      </div>
                    </div>
                    <input
                      style={styles.toggle}
                      type="checkbox"
                      checked={failureEnabled}
                      onChange={(e) => setFailureEnabled(e.target.checked)}
                    />
                  </div>

                  <div style={styles.card}>
                    <p style={styles.cardTitle}>Failure recipients</p>

                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.74)", fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={failureToClient}
                          onChange={(e) => setFailureToClient(e.target.checked)}
                          disabled={!failureEnabled}
                        />
                        Failure to payer
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.74)", fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={failureToMerchant}
                          onChange={(e) => setFailureToMerchant(e.target.checked)}
                          disabled={!failureEnabled}
                        />
                        Failure to client business
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.74)", fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={failureToOps}
                          onChange={(e) => setFailureToOps(e.target.checked)}
                          disabled={!failureEnabled}
                        />
                        Failure to ops inbox
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.74)", fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={includeReasonCodes}
                          onChange={(e) => setIncludeReasonCodes(e.target.checked)}
                          disabled={!failureEnabled}
                        />
                        Include reason in payer email
                      </label>
                    </div>

                    <div style={{ marginTop: 10, ...styles.hint }}>
                      Best practice: keep payer messaging simple and helpful. Send detailed reason codes only to ops and the client business when possible.
                    </div>
                  </div>
                </div>

                <div style={styles.btnRow}>
                  <button style={styles.btn("secondary")} type="button">
                    Send test email
                  </button>
                  <button style={styles.btn("primary")} type="button">
                    Save rules
                  </button>
                </div>
              </div>

              <div style={styles.card}>
                <p style={styles.cardTitle}>Templates and preview</p>

                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                  <div style={styles.field}>
                    <div style={styles.label}>Reminder subject</div>
                    <input style={styles.input} value={reminderSubject} onChange={(e) => setReminderSubject(e.target.value)} />
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Reminder body</div>
                    <textarea style={styles.textarea} value={reminderBody} onChange={(e) => setReminderBody(e.target.value)} />
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Failure subject</div>
                    <input style={styles.input} value={failureSubject} onChange={(e) => setFailureSubject(e.target.value)} />
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Failure body</div>
                    <textarea style={styles.textarea} value={failureBody} onChange={(e) => setFailureBody(e.target.value)} />
                  </div>
                </div>

                <div style={styles.previewBox}>
                  <div style={styles.previewHeader}>
                    <div style={styles.previewTitle}>Live preview</div>
                    <div style={styles.hint}>
                      Variables: {"{{payer_name}}"}, {"{{amount}}"}, {"{{run_date}}"}, {"{{reference}}"}
                    </div>
                  </div>

                  <div style={styles.previewBody}>
                    <div style={styles.emailCard}>
                      <div style={styles.emailSubject}>{reminderPreview.subject}</div>
                      <div style={{ ...styles.emailLine, whiteSpace: "pre-wrap", marginTop: 8 }}>{reminderPreview.body}</div>
                    </div>

                    <div style={styles.emailCard}>
                      <div style={styles.emailSubject}>{failurePreview.subject}</div>
                      <div style={{ ...styles.emailLine, whiteSpace: "pre-wrap", marginTop: 8 }}>{failurePreview.body}</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12, ...styles.hint }}>
                  Best practice: keep subjects short, include the run date, and avoid warning tone unless the debit actually failed.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
