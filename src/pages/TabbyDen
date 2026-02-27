// src/pages/TabbyDen.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function safeStr(v) {
  return String(v ?? "").trim();
}

function formatZar(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "R 0.00";
  return `R ${n.toFixed(2)}`;
}

function formatDate(ymd) {
  const s = safeStr(ymd);
  if (!s) return "";
  // expects YYYY-MM-DD
  const parts = s.split("-");
  if (parts.length !== 3) return s;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

export default function TabbyDen() {
  const query = useQuery();
  const token = safeStr(query.get("token"));

  const apiBase = safeStr(import.meta.env.VITE_API_BASE_URL);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  const invoicesUrl = useMemo(() => {
    if (!apiBase) return "";
    if (!token) return "";
    return `${apiBase}/api/tabbyden/invoices?token=${encodeURIComponent(token)}`;
  }, [apiBase, token]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);
      setErr("");
      setRows([]);

      if (!apiBase) {
        setErr("Missing VITE_API_BASE_URL in your frontend environment.");
        setLoading(false);
        return;
      }

      if (!token) {
        setErr("Missing token. Please open TabbyDen using a link like /tabbyden?token=...");
        setLoading(false);
        return;
      }

      try {
        const resp = await fetch(invoicesUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok || !data.ok) {
          const msg = safeStr(data?.error) || `Request failed (${resp.status})`;
          throw new Error(msg);
        }

        const list = Array.isArray(data?.data) ? data.data : [];
        if (!mounted) return;

        // sort newest first if date present
        list.sort((a, b) => safeStr(b?.date).localeCompare(safeStr(a?.date)));

        setRows(list);
        setLoading(false);
      } catch (e) {
        if (!mounted) return;
        setErr(safeStr(e?.message || e) || "Failed to load invoices.");
        setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [apiBase, token, invoicesUrl]);

  const openHtml = (invoiceId) => {
    if (!apiBase || !token) return;
    const url = `${apiBase}/api/tabbyden/invoice-html/${encodeURIComponent(invoiceId)}?token=${encodeURIComponent(
      token
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openPdf = (invoiceId) => {
    if (!apiBase || !token) return;
    const url = `${apiBase}/api/tabbyden/invoice-pdf/${encodeURIComponent(invoiceId)}?token=${encodeURIComponent(
      token
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(900px 600px at 10% 0%, rgba(139,92,246,.20), transparent 55%), #050812",
        color: "#E5E7EB",
        padding: "40px 20px",
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          background: "rgba(17, 24, 39, .78)",
          border: "1px solid rgba(139, 92, 246, .25)",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 18px 45px rgba(0,0,0,.55)",
          backdropFilter: "blur(14px)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "26px 26px",
            borderBottom: "1px solid rgba(124, 58, 237, .35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            background:
              "linear-gradient(135deg, rgba(15, 23, 42, .95), rgba(30, 27, 75, .85))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img
              src="https://raw.githubusercontent.com/RiaangrimJoubert/TabbyTech-Debit-Order/refs/heads/main/public/WP%20LOGO%20(1).png"
              alt="TabbyTech"
              style={{ width: 52, height: 52, objectFit: "contain" }}
            />
            <div>
              <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: -0.3 }}>TabbyDen</div>
              <div style={{ color: "rgba(167, 139, 250, .95)", fontWeight: 600, fontSize: 13 }}>
                Your invoices and documents
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "rgba(148,163,184,.9)" }}>Support</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>billing@tabbytech.co.za</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 26 }}>
          {loading && (
            <div
              style={{
                padding: 18,
                borderRadius: 12,
                border: "1px solid rgba(148, 163, 184, .20)",
                background: "rgba(15, 23, 42, .65)",
              }}
            >
              Loading your invoices...
            </div>
          )}

          {!loading && err && (
            <div
              style={{
                padding: 18,
                borderRadius: 12,
                border: "1px solid rgba(248, 113, 113, .35)",
                background: "rgba(127, 29, 29, .20)",
                color: "#FCA5A5",
                fontWeight: 600,
              }}
            >
              {err}
            </div>
          )}

          {!loading && !err && rows.length === 0 && (
            <div
              style={{
                padding: 18,
                borderRadius: 12,
                border: "1px solid rgba(148, 163, 184, .20)",
                background: "rgba(15, 23, 42, .65)",
              }}
            >
              No invoices found for this account.
            </div>
          )}

          {!loading && !err && rows.length > 0 && (
            <div style={{ display: "grid", gap: 14 }}>
              {rows.map((r) => {
                const id = safeStr(r?.id);
                const invoiceNum = safeStr(r?.invoice_number || r?.invoiceNumber);
                const ref = safeStr(r?.reference_number || r?.reference);
                const customer = safeStr(r?.customer_name || r?.customerName);
                const status = safeStr(r?.status);
                const date = formatDate(r?.date);
                const total = formatZar(r?.total);
                const balance = formatZar(r?.balance);

                return (
                  <div
                    key={id || `${invoiceNum}-${ref}`}
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(148, 163, 184, .18)",
                      background: "rgba(15, 23, 42, .70)",
                      padding: 16,
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1fr",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 900, fontSize: 16, color: "#E5E7EB" }}>
                          {invoiceNum ? `Invoice ${invoiceNum}` : "Invoice"}
                        </div>
                        {status && (
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              padding: "6px 10px",
                              borderRadius: 999,
                              border: "1px solid rgba(139, 92, 246, .35)",
                              background: "rgba(139, 92, 246, .12)",
                              color: "rgba(196, 181, 253, .98)",
                            }}
                          >
                            {status}
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: 8, color: "rgba(148,163,184,.95)", fontSize: 13, lineHeight: 1.5 }}>
                        {customer && <div><strong style={{ color: "#E5E7EB" }}>Customer:</strong> {customer}</div>}
                        {ref && <div><strong style={{ color: "#E5E7EB" }}>Reference:</strong> {ref}</div>}
                        {date && <div><strong style={{ color: "#E5E7EB" }}>Date:</strong> {date}</div>}
                      </div>
                    </div>

                    <div style={{ display: "grid", justifyItems: "end", gap: 10 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, color: "rgba(148,163,184,.9)" }}>Total</div>
                        <div style={{ fontSize: 18, fontWeight: 900 }}>{total}</div>
                        <div style={{ marginTop: 6, fontSize: 12, color: "rgba(148,163,184,.9)" }}>Balance</div>
                        <div style={{ fontSize: 14, fontWeight: 800 }}>{balance}</div>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => openHtml(id)}
                          disabled={!id}
                          style={{
                            cursor: id ? "pointer" : "not-allowed",
                            padding: "10px 14px",
                            borderRadius: 999,
                            border: "1px solid rgba(139,92,246,.55)",
                            background: "rgba(139,92,246,.18)",
                            color: "#EDE9FE",
                            fontWeight: 900,
                            fontSize: 13,
                          }}
                        >
                          View
                        </button>

                        <button
                          onClick={() => openPdf(id)}
                          disabled={!id}
                          style={{
                            cursor: id ? "pointer" : "not-allowed",
                            padding: "10px 14px",
                            borderRadius: 999,
                            border: "1px solid rgba(229,231,235,.22)",
                            background: "rgba(2, 6, 23, .35)",
                            color: "#E5E7EB",
                            fontWeight: 900,
                            fontSize: 13,
                          }}
                        >
                          Download PDF
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer note */}
          <div style={{ marginTop: 18, color: "rgba(148,163,184,.85)", fontSize: 12, lineHeight: 1.5 }}>
            This page is protected by a secure access token. If your link expired, request a new one from support.
          </div>
        </div>
      </div>
    </div>
  );
}
