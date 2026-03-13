import React, { useEffect, useMemo, useState } from "react";
import { request } from "../api";

const SETTINGS_CACHE_TTL_MS = 10 * 60 * 1000;

const SERVICE_META = {
  zohoCrm: {
    key: "zohoCrm",
    name: "Zoho CRM",
    purpose: "Client records, debit order metadata, account sync",
    category: "Core data",
    note: "Primary source for client and debit order context.",
  },
  zohoBooks: {
    key: "zohoBooks",
    name: "Zoho Books",
    purpose: "Invoices, reconciliation, finance support",
    category: "Finance",
    note: "Used for invoice and finance-side record flow.",
  },
  zeptoMail: {
    key: "zeptoMail",
    name: "ZeptoMail",
    purpose: "Transactional email delivery and notifications",
    category: "Notifications",
    note: "Notification transport layer for debit order messaging.",
  },
  paystack: {
    key: "paystack",
    name: "Paystack",
    purpose: "Collections, charges, payment events, webhooks",
    category: "Payments",
    note: "Primary payment and charge processing service.",
  },
};

const SERVICE_ORDER = ["zohoCrm", "zohoBooks", "zeptoMail", "paystack"];

function safeStr(v) {
  return String(v == null ? "" : v).trim();
}

function normalizeStatus(raw) {
  const s = safeStr(raw).toLowerCase();
  if (s === "connected") return "connected";
  return "not_connected";
}

function normalizeHealth(raw) {
  const s = safeStr(raw);
  return s || "Unknown";
}

function formatLastChecked(value) {
  const s = safeStr(value);
  if (!s) return "Not yet checked";

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;

  return d.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function buildServiceModel(apiData = {}) {
  return SERVICE_ORDER.map((key) => {
    const meta = SERVICE_META[key];
    const live = apiData?.[key] || {};

    return {
      key,
      name: safeStr(live.service) || meta.name,
      purpose: meta.purpose,
      category: meta.category,
      note: meta.note,
      status: normalizeStatus(live.status),
      environment: safeStr(live.environment) || "Unknown",
      lastChecked: formatLastChecked(live.lastChecked),
      health: normalizeHealth(live.health),
    };
  });
}

export default function Settings() {
  const [toast, setToast] = useState(null);
  const [selectedService, setSelectedService] = useState("zohoCrm");
  const [services, setServices] = useState(() => buildServiceModel({}));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  }

  async function loadIntegrationHealth({ silent = false } = {}) {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const res = await request("/api/settings/integrations-health");
      const nextServices = buildServiceModel(res?.data || {});
      setServices(nextServices);
    } catch (err) {
      const msg = String(err?.message || err || "Failed to load integration health");
      setError(msg);
      showToast("Could not refresh integration health.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadIntegrationHealth();
  }, []);

  const orderedServices = useMemo(() => {
    return SERVICE_ORDER.map((key) => services.find((service) => service.key === key)).filter(Boolean);
  }, [services]);

  const connectedCount = orderedServices.filter((service) => service.status === "connected").length;
  const liveCount = orderedServices.filter((service) => safeStr(service.environment).toLowerCase() === "live").length;
  const healthyCount = orderedServices.filter((service) => safeStr(service.health).toLowerCase() === "healthy").length;

  const readinessLabel =
    connectedCount === 4 && healthyCount === 4
      ? "Production ready"
      : connectedCount >= 3
      ? "Almost ready"
      : "Needs attention";

  const selected =
    orderedServices.find((service) => service.key === selectedService) || orderedServices[0] || null;

  function handleRefreshHealth() {
    loadIntegrationHealth({ silent: true });
  }

  return (
    <div className="tti-root">
      <style>{css}</style>

      <div className="tti-wrap">
        <section className="tti-hero">
          <div className="tti-heroTop">
            <div>
              <div className="tti-title">System Integrations</div>
              <div className="tti-subtitle">
                Service status for the core tools that power TabbyPay operations, finance flow,
                notifications, and collections.
                {loading ? " • loading..." : ""}
                {refreshing ? " • refreshing..." : ""}
                {error ? " • attention needed" : ""}
              </div>
            </div>

            <div className="tti-heroActions">
              <button
                type="button"
                className="tti-btn tti-btnPrimary"
                onClick={handleRefreshHealth}
                disabled={loading || refreshing}
              >
                {refreshing ? "Refreshing..." : "Refresh health"}
              </button>
            </div>
          </div>

          <div className="tti-readinessGrid">
            <ReadinessCard
              label="System state"
              value={readinessLabel}
              sub={`${connectedCount}/4 services connected`}
              accent="purple"
            />
            <ReadinessCard
              label="Live services"
              value={String(liveCount)}
              sub="Running in live environment"
              accent="blue"
            />
            <ReadinessCard
              label="Healthy services"
              value={String(healthyCount)}
              sub="No current service warnings"
              accent="green"
            />
            <ReadinessCard
              label="Operational focus"
              value="Debit order stack"
              sub="CRM, Books, ZeptoMail, Paystack"
              accent="orange"
            />
          </div>
        </section>

        <section className="tti-card">
          <div className="tti-cardHead">
            <div>
              <div className="tti-cardTitle">Connected services</div>
              <div className="tti-cardHint">
                Keep this screen honest and operational. It should reflect what the app actually depends on.
              </div>
            </div>

            <div className="tti-inlinePills">
              <StatusPill tone="good">Core stack</StatusPill>
            </div>
          </div>

          <div className="tti-serviceGrid">
            {orderedServices.map((service) => {
              const isActive = selectedService === service.key;

              return (
                <button
                  key={service.key}
                  type="button"
                  className={isActive ? "tti-serviceCard tti-serviceCardActive" : "tti-serviceCard"}
                  onClick={() => setSelectedService(service.key)}
                >
                  <div className="tti-serviceTop">
                    <div>
                      <div className="tti-serviceName">{service.name}</div>
                      <div className="tti-serviceCategory">{service.category}</div>
                    </div>

                    <StatusDot status={service.status} />
                  </div>

                  <div className="tti-servicePurpose">{service.purpose}</div>

                  <div className="tti-serviceMeta">
                    <span>{service.environment}</span>
                    <span>{service.health}</span>
                  </div>

                  <div className="tti-serviceFooter">
                    <StatusBadge status={service.status} />
                    <span className="tti-serviceLast">Checked: {service.lastChecked}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="tti-detailGrid">
          <section className="tti-card">
            {selected ? (
              <>
                <div className="tti-cardHead">
                  <div>
                    <div className="tti-cardTitle">{selected.name}</div>
                    <div className="tti-cardHint">{selected.note}</div>
                  </div>

                  <div className="tti-row">
                    <button
                      type="button"
                      className="tti-btn tti-btnGhost"
                      onClick={handleRefreshHealth}
                      disabled={loading || refreshing}
                    >
                      {refreshing ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>
                </div>

                <div className="tti-divider" />

                <div className="tti-kvGrid">
                  <KeyValue label="Service" value={selected.name} />
                  <KeyValue label="Category" value={selected.category} />
                  <KeyValue label="Environment" value={selected.environment} />
                  <KeyValue
                    label="Status"
                    value={selected.status === "connected" ? "Connected" : "Not connected"}
                  />
                  <KeyValue label="Health" value={selected.health} />
                  <KeyValue label="Last checked" value={selected.lastChecked} />
                </div>

                <div className="tti-divider" />

                <div className="tti-detailBlocks">
                  <div className="tti-miniCard">
                    <div className="tti-miniTitle">Purpose</div>
                    <div className="tti-miniText">{selected.purpose}</div>
                  </div>

                  <div className="tti-miniCard">
                    <div className="tti-miniTitle">Why it matters</div>
                    <div className="tti-miniText">
                      This service supports a production path in the debit order workflow and should stay visible to ops.
                    </div>
                  </div>

                  <div className="tti-miniCard">
                    <div className="tti-miniTitle">Recommended next step</div>
                    <div className="tti-miniText">
                      Keep connection state honest. Only add deeper config here when backend settings are truly wired.
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="tti-emptyState">No integration selected.</div>
            )}
          </section>

          <section className="tti-card">
            <div className="tti-cardHead">
              <div>
                <div className="tti-cardTitle">Operational notes</div>
                <div className="tti-cardHint">
                  A tighter settings module is better than a broad fake one.
                </div>
              </div>
            </div>

            <div className="tti-noteStack">
              <div className="tti-noteCard">
                <div className="tti-noteTitle">Zoho CRM</div>
                <div className="tti-noteText">
                  Best used as the operational data backbone for clients and debit order records.
                </div>
              </div>

              <div className="tti-noteCard">
                <div className="tti-noteTitle">Zoho Books</div>
                <div className="tti-noteText">
                  Keep this visible for finance confidence, invoice support, and reconciliation context.
                </div>
              </div>

              <div className="tti-noteCard">
                <div className="tti-noteTitle">ZeptoMail</div>
                <div className="tti-noteText">
                  This replaces the need for a fake Email Rules module unless rule logic is truly backend-driven.
                </div>
              </div>

              <div className="tti-noteCard">
                <div className="tti-noteTitle">Paystack</div>
                <div className="tti-noteText">
                  Payment processing and webhooks deserve first-class visibility in production operations.
                </div>
              </div>
            </div>
          </section>
        </div>

        {error ? (
          <div className="tti-errorBar">
            Settings API error: {error}
          </div>
        ) : null}

        {toast ? (
          <div className="tti-toastWrap">
            <div className="tti-toast">{toast}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReadinessCard({ label, value, sub, accent = "purple" }) {
  return (
    <div className={`tti-readinessCard tti-readiness-${accent}`}>
      <div className="tti-readinessLabel">{label}</div>
      <div className="tti-readinessValue">{value}</div>
      <div className="tti-readinessSub">{sub}</div>
    </div>
  );
}

function KeyValue({ label, value }) {
  return (
    <div className="tti-kvCard">
      <div className="tti-kvLabel">{label}</div>
      <div className="tti-kvValue">{value}</div>
    </div>
  );
}

function StatusDot({ status }) {
  return (
    <span
      className={status === "connected" ? "tti-statusDot tti-statusDotGood" : "tti-statusDot"}
      aria-hidden="true"
    />
  );
}

function StatusPill({ children, tone = "neutral" }) {
  return <span className={`tti-pill tti-pill-${tone}`}>{children}</span>;
}

function StatusBadge({ status }) {
  const connected = status === "connected";
  return (
    <span className={connected ? "tti-badge tti-badgeGood" : "tti-badge"}>
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

const css = `
.tti-root {
  width: 100%;
  height: 100%;
  color: rgba(255,255,255,0.92);
}

.tti-root * {
  box-sizing: border-box;
}

.tti-wrap {
  max-width: 1320px;
  margin: 0 auto;
  padding: 18px 18px 34px;
}

.tti-hero,
.tti-card {
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.08);
  background:
    radial-gradient(circle at top right, rgba(124,58,237,0.12), transparent 24%),
    linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  backdrop-filter: blur(18px);
  box-shadow: 0 22px 70px rgba(0,0,0,0.30);
}

.tti-hero {
  padding: 18px;
}

.tti-card {
  padding: 18px;
  margin-top: 14px;
}

.tti-heroTop,
.tti-cardHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.tti-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
}

.tti-subtitle {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.55;
  color: rgba(255,255,255,0.68);
  max-width: 860px;
}

.tti-cardTitle {
  font-size: 15px;
  font-weight: 800;
  color: #a855f7;
}

.tti-cardHint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255,255,255,0.66);
}

.tti-heroActions,
.tti-row,
.tti-inlinePills {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tti-btn {
  border-radius: 14px;
  padding: 10px 14px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.92);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 140ms ease, background 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.tti-btn:hover {
  transform: translateY(-1px);
  background: rgba(255,255,255,0.10);
  border-color: rgba(255,255,255,0.14);
}

.tti-btn:disabled {
  opacity: 0.58;
  cursor: not-allowed;
  transform: none;
}

.tti-btnPrimary {
  background: linear-gradient(135deg, rgba(168,85,247,0.95), rgba(124,58,237,0.95));
  border: 1px solid rgba(168,85,247,0.34);
  color: #fff;
  box-shadow:
    0 14px 34px rgba(124,58,237,0.24),
    inset 0 1px 0 rgba(255,255,255,0.10);
}

.tti-btnPrimary:hover {
  background: linear-gradient(135deg, rgba(186,104,255,0.98), rgba(139,92,246,0.98));
  border-color: rgba(186,104,255,0.42);
  box-shadow:
    0 18px 38px rgba(124,58,237,0.30),
    inset 0 1px 0 rgba(255,255,255,0.14);
}

.tti-btnGhost {
  background: rgba(255,255,255,0.05);
}

.tti-readinessGrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.tti-readinessCard {
  min-height: 118px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.10);
  padding: 14px;
  background:
    radial-gradient(circle at 85% 120%, rgba(124,58,237,0.22), transparent 42%),
    linear-gradient(180deg, rgba(6,11,35,0.94) 0%, rgba(12,18,48,0.84) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 40px rgba(0,0,0,0.24);
}

.tti-readiness-green {
  background:
    radial-gradient(circle at 85% 120%, rgba(16,185,129,0.22), transparent 42%),
    linear-gradient(180deg, rgba(6,11,35,0.94) 0%, rgba(12,18,48,0.84) 100%);
}

.tti-readiness-blue {
  background:
    radial-gradient(circle at 85% 120%, rgba(59,130,246,0.22), transparent 42%),
    linear-gradient(180deg, rgba(6,11,35,0.94) 0%, rgba(12,18,48,0.84) 100%);
}

.tti-readiness-orange {
  background:
    radial-gradient(circle at 85% 120%, rgba(249,115,22,0.20), transparent 42%),
    linear-gradient(180deg, rgba(6,11,35,0.94) 0%, rgba(12,18,48,0.84) 100%);
}

.tti-readinessLabel {
  font-size: 12px;
  color: rgba(255,255,255,0.62);
}

.tti-readinessValue {
  margin-top: 16px;
  font-size: 24px;
  font-weight: 800;
  color: white;
  line-height: 1.1;
}

.tti-readinessSub {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255,255,255,0.56);
}

.tti-pill,
.tti-badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.78);
}

.tti-pill-good,
.tti-badgeGood {
  border-color: rgba(34,197,94,0.26);
  background: rgba(34,197,94,0.12);
  color: #86efac;
}

.tti-pill-neutral {
  border-color: rgba(139,92,246,0.22);
  background: rgba(139,92,246,0.10);
  color: #c4b5fd;
}

.tti-serviceGrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.tti-serviceCard {
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.22);
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: transform 140ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
  box-shadow: 0 14px 34px rgba(0,0,0,0.18);
}

.tti-serviceCard:hover {
  transform: translateY(-1px);
  border-color: rgba(168,85,247,0.20);
  background: rgba(0,0,0,0.28);
}

.tti-serviceCardActive {
  border-color: rgba(168,85,247,0.34);
  background:
    radial-gradient(circle at top right, rgba(124,58,237,0.12), transparent 26%),
    rgba(0,0,0,0.30);
  box-shadow: 0 18px 40px rgba(0,0,0,0.24);
}

.tti-serviceTop {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.tti-serviceName {
  font-size: 14px;
  font-weight: 800;
  color: #a855f7;
}

.tti-serviceCategory {
  margin-top: 5px;
  font-size: 11px;
  color: rgba(255,255,255,0.54);
}

.tti-statusDot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #6b7280;
  box-shadow: 0 0 0 4px rgba(107,114,128,0.14);
  flex: 0 0 auto;
  margin-top: 2px;
}

.tti-statusDotGood {
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34,197,94,0.14);
}

.tti-servicePurpose {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255,255,255,0.72);
  min-height: 56px;
}

.tti-serviceMeta,
.tti-serviceFooter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tti-serviceMeta {
  margin-top: 10px;
  font-size: 11px;
  color: rgba(255,255,255,0.52);
}

.tti-serviceFooter {
  margin-top: 12px;
}

.tti-serviceLast {
  font-size: 11px;
  color: rgba(255,255,255,0.48);
}

.tti-detailGrid {
  display: grid;
  grid-template-columns: 1.25fr 0.85fr;
  gap: 14px;
}

.tti-divider {
  height: 1px;
  margin: 14px 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
}

.tti-kvGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.tti-kvCard,
.tti-miniCard,
.tti-noteCard {
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  padding: 12px;
}

.tti-kvLabel {
  font-size: 11px;
  color: rgba(255,255,255,0.52);
}

.tti-kvValue {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 800;
  color: white;
}

.tti-detailBlocks,
.tti-noteStack {
  display: grid;
  gap: 10px;
}

.tti-miniTitle,
.tti-noteTitle {
  font-size: 13px;
  font-weight: 800;
  color: #a855f7;
}

.tti-miniText,
.tti-noteText {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255,255,255,0.68);
}

.tti-emptyState {
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  padding: 14px;
  font-size: 13px;
  color: rgba(255,255,255,0.72);
}

.tti-errorBar {
  margin-top: 14px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(239,68,68,0.24);
  background: rgba(239,68,68,0.08);
  color: #fca5a5;
  font-size: 12px;
  font-weight: 700;
}

.tti-toastWrap {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 50;
}

.tti-toast {
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(14px);
  padding: 10px 12px;
  color: rgba(255,255,255,0.92);
  font-size: 13px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.40);
}

@media (max-width: 1320px) {
  .tti-readinessGrid,
  .tti-serviceGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tti-detailGrid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .tti-readinessGrid,
  .tti-serviceGrid,
  .tti-kvGrid {
    grid-template-columns: 1fr;
  }

  .tti-heroTop,
  .tti-cardHead {
    flex-direction: column;
    align-items: stretch;
  }
}
`;
