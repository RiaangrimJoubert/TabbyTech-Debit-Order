import { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import { request } from "../api";

import Dashboard from "./Dashboard";
import DebitOrderMonitor from "./DebitOrderMonitor";
import NotificationMonitoring from "../screens/NotificationMonitoring";
import Clients from "../screens/Clients";
import DebitOrders from "../screens/DebitOrders";
import Batches from "./Batches";
import Invoices from "../screens/Invoices";
import Reports from "./Reports";
import Settings from "../screens/Settings";
import Tenants from "../screens/Tenants";

const TITLES = {
  dashboard: "Dashboard",
  clients: "Clients",
  debitorders: "Debit Orders",
  debitordermonitor: "Debit Order Monitor",
  notificationmonitoring: "Notification Monitoring",
  batches: "Batches",
  invoices: "Invoices",
  reports: "Reports",
  settings: "Settings",
  tenants: "Tenants",
};

const FAILED_DEBITS_STORAGE_KEY = "tabbypay_failed_debit_orders";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeString(value) {
  return String(value == null ? "" : value).trim();
}

function formatAmount(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "R 0.00";
  return `R ${num.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function normalizeFailedDebit(item, index) {
  return {
    id: safeString(item?.id) || `failed-${index}`,
    clientName:
      safeString(item?.clientName) ||
      safeString(item?.client_name) ||
      safeString(item?.customerName) ||
      safeString(item?.name) ||
      "Unknown client",
    amount:
      item?.amount ??
      item?.Amount ??
      item?.debitAmount ??
      item?.debit_amount ??
      0,
    reason:
      safeString(item?.reason) ||
      safeString(item?.failureReason) ||
      safeString(item?.failure_reason) ||
      safeString(item?.statusReason) ||
      "Failed debit order",
    timestamp:
      safeString(item?.timestamp) ||
      safeString(item?.createdTime) ||
      safeString(item?.failedAt) ||
      safeString(item?.updatedAt) ||
      safeString(item?.date) ||
      "No timestamp",
  };
}

function readFailedDebitsFromStorage() {
  if (typeof window === "undefined") return [];

  try {
    const fromWindow = safeArray(window.__TABBY_FAILED_DEBIT_ORDERS__);
    if (fromWindow.length) {
      return fromWindow.map((item, index) => normalizeFailedDebit(item, index));
    }
  } catch {
    // ignore safely
  }

  try {
    const raw = window.localStorage.getItem(FAILED_DEBITS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return safeArray(parsed).map((item, index) => normalizeFailedDebit(item, index));
  } catch {
    return [];
  }
}

function AlertDrawer({
  isOpen,
  failedDebits,
  onClose,
  onOpenDebitOrders,
  onOpenNotificationMonitoring,
}) {
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden={!isOpen}
        className={`tt-alertdrawer-backdrop ${isOpen ? "is-open" : ""}`}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 6, 18, 0.55)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 220ms ease",
          zIndex: 80,
        }}
      />

      <aside
        aria-hidden={!isOpen}
        className={`tt-alertdrawer ${isOpen ? "is-open" : ""}`}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          bottom: 16,
          width: "min(460px, calc(100vw - 24px))",
          borderRadius: 24,
          border: "1px solid rgba(161, 110, 255, 0.22)",
          background:
            "linear-gradient(180deg, rgba(12,16,40,0.96) 0%, rgba(14,10,34,0.97) 100%)",
          boxShadow:
            "0 20px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(140,90,255,0.08)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          transform: isOpen ? "translateX(0)" : "translateX(110%)",
          opacity: isOpen ? 1 : 0,
          transition: "transform 260ms ease, opacity 220ms ease",
          zIndex: 90,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "22px 22px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background:
              "radial-gradient(circle at top right, rgba(140,90,255,0.16), transparent 38%)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(193, 168, 255, 0.92)",
                  marginBottom: 8,
                }}
              >
                Operations Alert Center
              </div>

              <div
                style={{
                  fontSize: 24,
                  lineHeight: 1.1,
                  fontWeight: 800,
                  color: "#f7f4ff",
                  marginBottom: 8,
                }}
              >
                Failed Debit Orders
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "rgba(210, 214, 235, 0.78)",
                }}
              >
                Clients that failed to pay in the current debit order cycle.
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close alerts"
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div
              style={{
                borderRadius: 18,
                padding: "14px 16px",
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(135deg, rgba(74, 22, 132, 0.38), rgba(21, 17, 47, 0.78))",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(210,214,235,0.76)",
                  marginBottom: 8,
                }}
              >
                Failed items
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#ffffff",
                }}
              >
                {failedDebits.length}
              </div>
            </div>

            <div
              style={{
                borderRadius: 18,
                padding: "14px 16px",
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(135deg, rgba(20, 88, 104, 0.38), rgba(21, 17, 47, 0.78))",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(210,214,235,0.76)",
                  marginBottom: 8,
                }}
              >
                Attention state
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: failedDebits.length ? "#ff8b8b" : "#87f7bb",
                }}
              >
                {failedDebits.length ? "Action needed" : "Queue clear"}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: 18,
            overflowY: "auto",
            flex: 1,
          }}
        >
          {failedDebits.length ? (
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              {failedDebits.map((item) => (
                <div
                  key={item.id}
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: "#ffffff",
                          marginBottom: 4,
                        }}
                      >
                        {item.clientName}
                      </div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#ff9f9f",
                          background: "rgba(255, 94, 94, 0.08)",
                          border: "1px solid rgba(255, 94, 94, 0.14)",
                          borderRadius: 999,
                          padding: "6px 10px",
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#ff6b6b",
                            display: "inline-block",
                          }}
                        />
                        Failed
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: "rgba(210,214,235,0.7)",
                          marginBottom: 4,
                        }}
                      >
                        Amount
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: "#ffffff",
                        }}
                      >
                        {formatAmount(item.amount)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 14,
                        padding: "12px 14px",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "rgba(193,168,255,0.92)",
                          marginBottom: 6,
                        }}
                      >
                        Failure reason
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#eef0ff",
                          lineHeight: 1.45,
                        }}
                      >
                        {item.reason}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        borderRadius: 14,
                        padding: "12px 14px",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: "rgba(193,168,255,0.92)",
                            marginBottom: 6,
                          }}
                        >
                          Timestamp
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#eef0ff",
                          }}
                        >
                          {item.timestamp}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                minHeight: 260,
                borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))",
                display: "grid",
                placeItems: "center",
                padding: 24,
                textAlign: "center",
              }}
            >
              <div>
                <div
                  style={{
                    width: 62,
                    height: 62,
                    margin: "0 auto 14px",
                    borderRadius: 18,
                    background:
                      "linear-gradient(135deg, rgba(120,76,255,0.24), rgba(65,43,120,0.16))",
                    border: "1px solid rgba(161,110,255,0.18)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 28,
                  }}
                >
                  🔔
                </div>

                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#ffffff",
                    marginBottom: 8,
                  }}
                >
                  No failed debit orders
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(210,214,235,0.76)",
                    maxWidth: 280,
                  }}
                >
                  The alert center is active, but no failed debit orders were found in the current shared data source.
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: 18,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onOpenDebitOrders}
            style={{
              height: 48,
              borderRadius: 16,
              border: "1px solid rgba(161,110,255,0.24)",
              background:
                "linear-gradient(135deg, rgba(115, 69, 255, 0.34), rgba(59, 29, 139, 0.26))",
              color: "#ffffff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Open Debit Orders
          </button>

          <button
            type="button"
            onClick={onOpenNotificationMonitoring}
            style={{
              height: 48,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "#ffffff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Open Notification Monitoring
          </button>
        </div>
      </aside>
    </>
  );
}

function getCurrentUserRole() {
  if (typeof window === "undefined") return "admin";
  try {
    const raw = window.localStorage.getItem("tt_user");
    if (!raw) return "admin";
    const parsed = JSON.parse(raw);
    const role = String(
      parsed?.role ||
      parsed?.role_name ||
      parsed?.role_details?.role_name ||
      ""
    ).trim().toLowerCase();
    return role === "tenant" ? "tenant" : "admin";
  } catch {
    return "admin";
  }
}

const ADMIN_ONLY_KEYS = new Set(["settings", "tenants"]);

function AccessDenied() {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        padding: 48,
        color: "rgba(255,255,255,0.82)",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          background: "rgba(17,24,39,0.7)",
          border: "1px solid rgba(148,163,184,0.18)",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Access denied
        </div>
        <div style={{ color: "rgba(148,163,184,0.85)", lineHeight: 1.55 }}>
          This section is only available to administrators. Please contact your
          account administrator if you believe you should have access.
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ onLogout }) {
  const currentRole = getCurrentUserRole();
  const [activeKey, setActiveKey] = useState("dashboard");
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [failedDebits, setFailedDebits] = useState(() => readFailedDebitsFromStorage());

  const [debitOrdersPresetSearch, setDebitOrdersPresetSearch] = useState("");
  const [debitOrdersPresetFocusClientId, setDebitOrdersPresetFocusClientId] = useState("");
  const [batchesPresetClientId, setBatchesPresetClientId] = useState("");
  const [batchesPresetBatchId, setBatchesPresetBatchId] = useState("");

  const pageTitle = useMemo(() => TITLES[activeKey] || "Dashboard", [activeKey]);

  useEffect(() => {
    function refreshFailedDebits() {
      setFailedDebits(readFailedDebitsFromStorage());
    }

    function onStorage(event) {
      if (!event || event.key === FAILED_DEBITS_STORAGE_KEY) {
        refreshFailedDebits();
      }
    }

    function onFailedDebitsUpdated() {
      refreshFailedDebits();
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setIsAlertsOpen(false);
      }
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("tabbypay:failed-debits-updated", onFailedDebitsUpdated);
    window.addEventListener("keydown", onKeyDown);

    refreshFailedDebits();

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tabbypay:failed-debits-updated", onFailedDebitsUpdated);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    let active = true;

    function getCurrentCycleBounds() {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const monthStart = new Date(y, m, 1);
      const nextMonthStart = new Date(y, m + 1, 1);
      return { monthStart, nextMonthStart };
    }

    function isInCurrentCycle(row) {
      const { monthStart, nextMonthStart } = getCurrentCycleBounds();
      const candidates = [
        row?.lastAttemptDate,
        row?.last_attempt_date,
        row?.nextChargeDate,
        row?.next_charge_date,
        row?.updatedAt,
        row?.updated_at,
        row?.modified_time,
        row?.Modified_Time,
      ];

      for (const raw of candidates) {
        const s = String(raw || "").trim();
        if (!s) continue;
        const d = new Date(s);
        if (!Number.isNaN(d.getTime())) {
          return d >= monthStart && d < nextMonthStart;
        }
      }

      return true;
    }

    async function loadFailedDebitsFromApi() {
      try {
        const json = await request("/api/debit-orders", { method: "GET" });
        if (!active) return;
        if (!json || json.ok !== true || !Array.isArray(json.data)) return;

        const failedRaw = json.data.filter((row) => {
          const status = String(row?.status || "").trim().toLowerCase();
          const isFailedLike =
            status === "failed" ||
            status === "cancelled" ||
            status === "canceled" ||
            status === "unpaid";

          const reason =
            row?.failureReason ||
            row?.failure_reason ||
            row?.statusReason ||
            row?.reason;
          const hasReason = !!String(reason || "").trim();

          if (!isFailedLike && !hasReason) return false;

          return isInCurrentCycle(row);
        });

        setFailedDebits(failedRaw.map((item, index) => normalizeFailedDebit(item, index)));

        try {
          window.localStorage.setItem(FAILED_DEBITS_STORAGE_KEY, JSON.stringify(failedRaw));
        } catch {
          // ignore safely
        }
      } catch {
        // ignore safely
      }
    }

    loadFailedDebitsFromApi();

    return () => {
      active = false;
    };
  }, []);

  function onNavigate(key) {
    if (ADMIN_ONLY_KEYS.has(key) && currentRole !== "admin") {
      return;
    }

    setActiveKey(key);
    setIsAlertsOpen(false);

    if (key !== "debitorders") {
      setDebitOrdersPresetSearch("");
      setDebitOrdersPresetFocusClientId("");
    }

    if (key !== "batches") {
      setBatchesPresetClientId("");
      setBatchesPresetBatchId("");
    }
  }

  const content = useMemo(() => {
    if (ADMIN_ONLY_KEYS.has(activeKey) && currentRole !== "admin") {
      return <AccessDenied />;
    }

    if (activeKey === "clients") {
      return (
        <Clients
          onOpenDebitOrders={({ clientId }) => {
            const id = String(clientId || "").trim();
            if (!id) return;

            setDebitOrdersPresetSearch(id);
            setDebitOrdersPresetFocusClientId(id);
            setActiveKey("debitorders");
          }}
          onOpenBatches={({ clientId, batchId }) => {
            const nextClientId = String(clientId || "").trim();
            const nextBatchId = String(batchId || "").trim();

            setBatchesPresetClientId(nextClientId);
            setBatchesPresetBatchId(nextBatchId);
            setActiveKey("batches");
          }}
        />
      );
    }

    if (activeKey === "debitorders") {
      return (
        <DebitOrders
          presetSearch={debitOrdersPresetSearch}
          presetFocusClientId={debitOrdersPresetFocusClientId}
        />
      );
    }

    if (activeKey === "debitordermonitor") return <DebitOrderMonitor />;
    if (activeKey === "notificationmonitoring") return <NotificationMonitoring />;

    if (activeKey === "batches") {
      return (
        <Batches
          presetClientId={batchesPresetClientId}
          presetBatchId={batchesPresetBatchId}
        />
      );
    }

    if (activeKey === "invoices") return <Invoices />;
    if (activeKey === "reports") return <Reports />;
    if (activeKey === "settings") return <Settings />;
    if (activeKey === "tenants") return <Tenants />;

    return <Dashboard />;
  }, [
    activeKey,
    currentRole,
    debitOrdersPresetSearch,
    debitOrdersPresetFocusClientId,
    batchesPresetClientId,
    batchesPresetBatchId,
  ]);

  return (
    <div className="tt-appshell">
      <Sidebar
        activeKey={activeKey}
        onNavigate={(key) => onNavigate(key)}
        onLogout={() => onLogout?.()}
      />

      <main className="tt-shell-main">
        <header className="tt-shell-topbar">
          <div>
            <div className="tt-shell-kicker">TabbyTech</div>
            <div className="tt-shell-h1">{pageTitle}</div>
          </div>

          <div className="tt-shell-actions">
            <button
              className="tt-shell-iconbtn"
              type="button"
              aria-label="Notifications"
              aria-expanded={isAlertsOpen}
              onClick={() => {
                setFailedDebits(readFailedDebitsFromStorage());
                setIsAlertsOpen((prev) => !prev);
              }}
              title="Operations alerts"
            >
              🔔
            </button>

            <div className="tt-shell-user" role="button" tabIndex={0} aria-label="User menu">
              <div className="tt-shell-avatar">T</div>
              <div>
                <div className="tt-shell-username">TabbyPay</div>
                <div className="tt-shell-userrole">PurAgent</div>
              </div>
            </div>
          </div>
        </header>

        <section className="tt-shell-content">{content}</section>
      </main>

      <AlertDrawer
        isOpen={isAlertsOpen}
        failedDebits={failedDebits}
        onClose={() => setIsAlertsOpen(false)}
        onOpenDebitOrders={() => onNavigate("debitorders")}
        onOpenNotificationMonitoring={() => onNavigate("notificationmonitoring")}
      />
    </div>
  );
}
