// src/pages/ClientPortal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { calcTotals, money } from "../data/invoices.js";
import "../styles/invoice-html.css";

function getApiBase() {
  // IMPORTANT: no optional chaining, so Vite define() replacement works
  const base = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function normalizeInvoice(inv) {
  const raw = inv || {};

  const id =
    String(raw.id || raw.invoice_id || raw.invoiceId || "").trim() ||
    `INV-${Math.random().toString(16).slice(2)}`;

  const customer =
    String(raw.customer || raw.customerName || raw.customer_name || raw.contact_name || "").trim() ||
    "Customer";

  const customerEmail =
    String(raw.customerEmail || raw.customer_email || raw.contact_email || raw.email || "").trim();

  const apiStatus = String(raw.status || raw.invoice_status || "unpaid").trim().toLowerCase();
  let status = "Unpaid";
  if (apiStatus === "paid") status = "Paid";
  else if (apiStatus === "overdue") status = "Overdue";
  else if (apiStatus === "draft") status = "Unpaid";
  else if (apiStatus === "unpaid") status = "Unpaid";

  const dateIssued = String(raw.dateIssued || raw.date || raw.issuedDate || "").trim();
  const dueDate = String(raw.dueDate || raw.due_date || "").trim();

  const currency = String(raw.currency || raw.currencyCode || raw.currency_code || "ZAR").trim() || "ZAR";
  const booksInvoiceId = String(raw.booksInvoiceId || raw.id || raw.invoice_id || "").trim();

  const itemsRaw = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.line_items)
      ? raw.line_items
      : [];

  let items = itemsRaw.map((it) => {
    const description = String(it.description || it.name || it.item_name || it.item || "Item");
    const qty = Number(it.qty ?? it.quantity ?? 1);
    const unitPrice = Number(it.unitPrice ?? it.rate ?? it.unit_price ?? 0);

    return {
      description,
      qty: Number.isFinite(qty) ? qty : 1,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0
    };
  });

  const apiTotal = Number(raw.total ?? raw.invoice_total ?? raw.amount ?? 0);

  if ((!items || items.length === 0) && Number.isFinite(apiTotal) && apiTotal > 0) {
    items = [
      {
        description: "TabbyPay Subscription",
        qty: 1,
        unitPrice: apiTotal
      }
    ];
  }

  return {
    id,
    status,
    customer,
    customerEmail,
    dateIssued,
    dueDate,
    currency,
    items,
    booksInvoiceId
  };
}

async function fetchPortalInvoices(token) {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error("Missing VITE_API_BASE_URL");
  if (!token) throw new Error("Missing portal token");

  const url = `${apiBase}/api/portal/invoices?token=${encodeURIComponent(token)}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" }
  });

  const text = await resp.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!resp.ok) {
    const msg = json?.error || json?.message || `Request failed (${resp.status})`;
    throw new Error(msg);
  }

  // support either { ok:true, data:[...] } or { invoices:[...] }
  const items = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.invoices)
      ? json.invoices
      : [];

  return items.map(normalizeInvoice);
}

export default function ClientPortal() {
  const { customerKey } = useParams();
  const navigate = useNavigate();

  // We will treat the URL param as a TOKEN (not an email, not a name)
  const token = useMemo(() => {
    return decodeURIComponent(String(customerKey || "")).trim();
  }, [customerKey]);

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setErr("");
      try {
        const rows = await fetchPortalInvoices(token);
        if (!alive) return;
        setInvoices(rows || []);
      } catch (e) {
        if (!alive) return;
        setInvoices([]);
        setErr(e?.message || "Failed to load invoices");
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [token]);

  const clientInvoices = useMemo(() => {
    return (invoices || []).slice().sort((a, b) => String(b.dateIssued || "").localeCompare(String(a.dateIssued || "")));
  }, [invoices]);

  function openInvoice(inv) {
    const id = String(inv?.booksInvoiceId || inv?.id || "").trim();
    if (!id) return;
    // pass token through so the /invoice page can call secure endpoints later
    navigate(`/invoice/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`);
  }

  return (
    <div className="invhtml-root">
      <div className="invhtml-shell">
        <div className="invhtml-topbar">
          <div className="invhtml-brand">
            <div className="invhtml-logo">TP</div>
            <div className="invhtml-brandtext">
              <div className="invhtml-brandname">TabbyDen</div>
              <div className="invhtml-brandsub">Invoices</div>
            </div>
          </div>

          <div className="invhtml-actions noprint">
            <Link className="invhtml-btn" to="/">
              Home
            </Link>
          </div>
        </div>

        <div className="invhtml-card">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="invhtml-emptytitle" style={{ marginBottom: 2 }}>
              Your invoices
            </div>

            <div className="invhtml-emptysub">
              This is your private invoice view link. You can open any invoice and Print or Save as PDF.
            </div>

            {loading && (
              <div className="invhtml-emptysub" style={{ marginTop: 10 }}>
                Loading invoices...
              </div>
            )}

            {!loading && err && (
              <div className="invhtml-empty" style={{ marginTop: 10 }}>
                <div className="invhtml-emptytitle">Could not load invoices</div>
                <div className="invhtml-emptysub">{err}</div>
              </div>
            )}

            {!loading && !err && clientInvoices.length === 0 ? (
              <div className="invhtml-empty" style={{ marginTop: 10 }}>
                <div className="invhtml-emptytitle">No invoices found</div>
                <div className="invhtml-emptysub">There are no invoices available for this link.</div>
              </div>
            ) : null}

            {!loading && !err && clientInvoices.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {clientInvoices.map((inv) => {
                  const t = calcTotals(inv);
                  return (
                    <button
                      key={inv.id}
                      type="button"
                      className="invhtml-btn"
                      style={{
                        width: "100%",
                        justifyContent: "space-between",
                        paddingLeft: 12,
                        paddingRight: 12
                      }}
                      onClick={() => openInvoice(inv)}
                      aria-label={`Open invoice ${inv.id}`}
                    >
                      <span style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                        <span style={{ fontWeight: 900 }}>{inv.id}</span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                          {inv.dateIssued} • {inv.status}
                        </span>
                      </span>

                      <span style={{ fontWeight: 900 }}>{money(t.total, inv.currency)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="invhtml-divider noprint" />

          <div className="invhtml-footer">
            <div className="invhtml-muted">Tip: open an invoice then use Print or Save as PDF in your browser.</div>
            <div className="invhtml-muted">TabbyDen</div>
          </div>
        </div>
      </div>
    </div>
  );
}
