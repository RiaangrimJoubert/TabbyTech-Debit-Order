import React, { useMemo, useState } from "react";

const styles = {
  page: { height: "100%", display: "flex", flexDirection: "column", gap: 16 },
  headerRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 },
  titleWrap: { display: "flex", flexDirection: "column", gap: 6 },
  title: { margin: 0, fontSize: 26, letterSpacing: 0.2, color: "rgba(255,255,255,0.92)" },
  subtitle: { margin: 0, fontSize: 13, color: "rgba(255,255,255,0.62)", lineHeight: 1.4 },

  glass: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
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

  content: { padding: 14, display: "flex", flexDirection: "column", gap: 14, minHeight: 0 },

  stepperWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  step: (active, done) => ({
    height: 34,
    padding: "0 10px",
    borderRadius: 999,
    border: `1px solid ${
      active ? "rgba(168,85,247,0.55)" : done ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.12)"
    }`,
    background: active
      ? "rgba(168,85,247,0.16)"
      : done
      ? "rgba(34,197,94,0.12)"
      : "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.82)",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.2,
    userSelect: "none",
  }),
  dot: (active, done) => ({
    width: 10,
    height: 10,
    borderRadius: 999,
    background: active ? "rgba(168,85,247,0.95)" : done ? "rgba(34,197,94,0.95)" : "rgba(255,255,255,0.35)",
    boxShadow: active ? "0 0 0 6px rgba(168,85,247,0.12)" : "none",
  }),

  grid: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14, minHeight: 0 },
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
    color: "rgba(255,255,255,0.78)",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  cardBody: { marginTop: 10, display: "flex", flexDirection: "column", gap: 10 },

  btnRow: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
  btn: (variant = "secondary", disabled = false) => {
    const base = {
      height: 38,
      padding: "0 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.86)",
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      userSelect: "none",
      transition: "transform 160ms ease, box-shadow 160ms ease, border 160ms ease",
      fontSize: 13,
      fontWeight: 800,
      letterSpacing: 0.2,
      opacity: disabled ? 0.55 : 1,
    };

    if (variant === "primary") {
      return {
        ...base,
        background: "linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95))",
        border: "1px solid rgba(168,85,247,0.55)",
        boxShadow: "0 14px 34px rgba(124,58,237,0.28)",
      };
    }

    return base;
  },

  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.62)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  td: { padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.78)" },

  badge: (tone) => {
    const map = {
      Ready: { bg: "rgba(168,85,247,0.16)", bd: "rgba(168,85,247,0.32)" },
      Validated: { bg: "rgba(34,197,94,0.14)", bd: "rgba(34,197,94,0.30)" },
      Warning: { bg: "rgba(245,158,11,0.16)", bd: "rgba(245,158,11,0.32)" },
      Failed: { bg: "rgba(239,68,68,0.16)", bd: "rgba(239,68,68,0.32)" },
    };
    const t = map[tone] || map.Ready;
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

  kv: { display: "grid", gridTemplateColumns: "160px 1fr", gap: 10 },
  k: { fontSize: 12, color: "rgba(255,255,255,0.55)" },
  v: { fontSize: 13, color: "rgba(255,255,255,0.82)" },

  hint: { fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 },
};

function currencyZar(n) {
  const val = Number(n || 0);
  return val.toLocaleString("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "2-digit" });
}

const steps = [
  { key: "create", label: "Create batch" },
  { key: "review", label: "Review items" },
  { key: "submit", label: "Submit" },
  { key: "results", label: "Results" },
];

const batchItems = [
  { id: "DO-90021", client: "Mkhize Holdings", amount: 3990, status: "Validated" },
  { id: "DO-90022", client: "Sable Properties", amount: 12500, status: "Warning" },
  { id: "DO-90023", client: "Aurora Wellness Group", amount: 1790, status: "Validated" },
  { id: "DO-90025", client: "TabbyTech Partners", amount: 2500, status: "Ready" },
];

export default function Batches() {
  const [step, setStep] = useState("create");

  const activeIndex = useMemo(() => steps.findIndex((s) => s.key === step), [step]);

  const totals = useMemo(() => {
    const total = batchItems.reduce((acc, x) => acc + x.amount, 0);
    const warnings = batchItems.filter((x) => x.status === "Warning").length;
    const validated = batchItems.filter((x) => x.status === "Validated").length;
    const ready = batchItems.filter((x) => x.status === "Ready").length;
    return { total, warnings, validated, ready, count: batchItems.length };
  }, []);

  const mockBatch = useMemo(
    () => ({
      id: "BT-20260208-0003",
      runDate: "2026-02-12T10:00:00.000Z",
      created: "2026-02-08T08:45:00.000Z",
      createdBy: "Admin",
      channel: "EFT / DebiCheck",
      notes: "UI-only workflow. No submission occurs.",
    }),
    []
  );

  function canGoNext() {
    return true;
  }

  function goNext() {
    const i = steps.findIndex((s) => s.key === step);
    const next = steps[Math.min(i + 1, steps.length - 1)]?.key;
    if (next) setStep(next);
  }

  function goBack() {
    const i = steps.findIndex((s) => s.key === step);
    const prev = steps[Math.max(i - 1, 0)]?.key;
    if (prev) setStep(prev);
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={styles.titleWrap}>
          <h1 style={styles.title}>Batches</h1>
          <p style={styles.subtitle}>
            A guided workflow UI for building and submitting batch runs. Backend is paused, so everything here is visual only.
          </p>
        </div>
      </div>

      <div style={{ ...styles.glass, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={styles.panelHeader}>
          <div>
            <p style={styles.panelTitle}>Batch workflow</p>
            <p style={styles.panelMeta}>Step {activeIndex + 1} of {steps.length}</p>
          </div>

          <div style={styles.stepperWrap}>
            {steps.map((s, idx) => {
              const active = s.key === step;
              const done = idx < activeIndex;
              return (
                <div
                  key={s.key}
                  style={styles.step(active, done)}
                  role="button"
                  tabIndex={0}
                  onClick={() => setStep(s.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setStep(s.key);
                  }}
                  title={s.label}
                >
                  <span style={styles.dot(active, done)} />
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.grid}>
            {/* LEFT */}
            <div style={styles.card}>
              <p style={styles.cardTitle}>
                {step === "create" && "Create a new batch"}
                {step === "review" && "Review items"}
                {step === "submit" && "Submit batch"}
                {step === "results" && "Batch results"}
              </p>

              <div style={styles.cardBody}>
                {step === "create" && (
                  <>
                    <div style={styles.kv}>
                      <div style={styles.k}>Batch id</div>
                      <div style={styles.v}>{mockBatch.id}</div>

                      <div style={styles.k}>Run date</div>
                      <div style={styles.v}>{formatDate(mockBatch.runDate)}</div>

                      <div style={styles.k}>Channel</div>
                      <div style={styles.v}>{mockBatch.channel}</div>

                      <div style={styles.k}>Created</div>
                      <div style={styles.v}>{formatDate(mockBatch.created)}</div>

                      <div style={styles.k}>Created by</div>
                      <div style={styles.v}>{mockBatch.createdBy}</div>
                    </div>

                    <div style={{ marginTop: 10, padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.84)", marginBottom: 6 }}>What happens in this workflow</div>
                      <div style={styles.hint}>
                        You select debit orders, validate items, and prepare a run. The submit step is visual only for now and does not call any backend.
                      </div>
                    </div>
                  </>
                )}

                {step === "review" && (
                  <>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Debit order</th>
                          <th style={styles.th}>Client</th>
                          <th style={styles.th}>Amount</th>
                          <th style={styles.th}>Validation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchItems.map((x) => (
                          <tr key={x.id}>
                            <td style={styles.td} />
                            <td style={styles.td}>{x.id}</td>
                            <td style={styles.td}>{x.client}</td>
                            <td style={styles.td}>{currencyZar(x.amount)}</td>
                            <td style={styles.td}>
                              <span style={styles.badge(x.status)}>{x.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.10)" }}>
                      <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.84)", marginBottom: 6 }}>Review notes</div>
                      <div style={styles.hint}>
                        Warnings indicate items that may fail in a real run, for example missing mandates or banking verification. In this UI-only build, warnings are visual markers.
                      </div>
                    </div>
                  </>
                )}

                {step === "submit" && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
                        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.84)" }}>Pre-submit checks</div>
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.74)" }}>
                          <div>Validation complete</div>
                          <div>Run date confirmed</div>
                          <div>Batch totals calculated</div>
                          <div>Notifications queued</div>
                        </div>
                      </div>

                      <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
                        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.84)" }}>Submit impact</div>
                        <div style={styles.hint}>
                          In a live system, submit would create a batch record, lock items, and trigger downstream processing. Here, it switches to the Results step only.
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(168,85,247,0.30)", background: "rgba(168,85,247,0.10)" }}>
                      <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.88)" }}>Ready to submit</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>
                        This is a premium UI flow for TabbyTech. No backend calls are made.
                      </div>
                    </div>
                  </>
                )}

                {step === "results" && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(34,197,94,0.30)", background: "rgba(34,197,94,0.10)" }}>
                        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.88)" }}>Batch submitted</div>
                        <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>
                          Result view is UI-only. In production this would display success, failures, and provider responses.
                        </div>
                      </div>

                      <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
                        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.84)" }}>Summary</div>
                        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Items</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "rgba(255,255,255,0.88)" }}>{totals.count}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Total</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "rgba(255,255,255,0.88)" }}>
                              {currencyZar(totals.total)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.10)" }}>
                      <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.84)", marginBottom: 8 }}>Result breakdown</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span style={styles.badge("Validated")}>Validated {totals.validated}</span>
                        <span style={styles.badge("Warning")}>Warnings {totals.warnings}</span>
                        <span style={styles.badge("Ready")}>Ready {totals.ready}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div style={styles.card}>
              <p style={styles.cardTitle}>Batch totals</p>
              <div style={styles.cardBody}>
                <div style={styles.kv}>
                  <div style={styles.k}>Items</div>
                  <div style={styles.v}>{totals.count}</div>
                  <div style={styles.k}>Total</div>
                  <div style={styles.v}>{currencyZar(totals.total)}</div>
                  <div style={styles.k}>Validated</div>
                  <div style={styles.v}>{totals.validated}</div>
                  <div style={styles.k}>Warnings</div>
                  <div style={styles.v}>{totals.warnings}</div>
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "8px 0" }} />

                <div style={styles.hint}>
                  This panel stays visible throughout the flow, giving the run a confident, operational feel.
                </div>

                <div style={styles.btnRow}>
                  <button style={styles.btn("secondary", activeIndex === 0)} type="button" disabled={activeIndex === 0} onClick={goBack}>
                    Back
                  </button>

                  {step !== "results" ? (
                    <button style={styles.btn("primary", !canGoNext())} type="button" disabled={!canGoNext()} onClick={goNext}>
                      {step === "submit" ? "Submit" : "Next"}
                    </button>
                  ) : (
                    <button style={styles.btn("primary", false)} type="button" onClick={() => setStep("create")}>
                      New batch
                    </button>
                  )}
                </div>

                <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.84)", marginBottom: 6 }}>Pro tip</div>
                  <div style={styles.hint}>
                    When backend resumes, this flow maps neatly to a batch state machine. Create, validate, submit, results.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
              Batch id: <span style={{ color: "rgba(255,255,255,0.82)", fontWeight: 900 }}>{mockBatch.id}</span>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
              Run date: <span style={{ color: "rgba(255,255,255,0.82)", fontWeight: 900 }}>{formatDate(mockBatch.runDate)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
