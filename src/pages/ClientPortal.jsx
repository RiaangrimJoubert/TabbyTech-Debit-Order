import React, { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { INVOICES, calcTotals, money } from "../data/invoices.js";
import "../styles/invoice-html.css";

export default function ClientPortal() {
  const { customerKey } = useParams();
  const navigate = useNavigate();

  const decodedKey = useMemo(() => {
    return decodeURIComponent(String(customerKey || "")).toLowerCase().trim();
  }, [customerKey]);

  const clientInvoices = useMemo(() => {
    if (!decodedKey) return [];
    return INVOICES.filter((x) => {
      const email = String(x.customerEmail || "").toLowerCase().trim();
      const customer = String(x.customer || "").toLowerCase().trim();
      return email === decodedKey || customer === decodedKey;
    }).sort((a, b) => String(b.dateIssued).localeCompare(String(a.dateIssued)));
  }, [decodedKey]);

  function openInvoice(id) {
    navigate(`/invoice/${encodeURIComponent(id)}`);
  }

  return (
    <div className="invhtml-root">
      <div className="invhtml-shell">
        <div className="invhtml-topbar">
          <div className="invhtml-brand">
            <div className="invhtml-logo">TP</div>
            <div className="invhtml-brandtext">
              <div className="invhtml-brandname">TabbyPay</div>
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

            {clientInvoices.length === 0 ? (
              <div className="invhtml-empty" style={{ marginTop: 10 }}>
                <div className="invhtml-emptytitle">No invoices found</div>
                <div className="invhtml-emptysub">
                  We could not find invoices for this client key.
                </div>
              </div>
            ) : (
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
                      onClick={() => openInvoice(inv.id)}
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
            <div className="invhtml-muted">
              Tip: open an invoice then use Print or Save as PDF in your browser.
            </div>
            <div className="invhtml-muted">TabbyPay</div>
          </div>
        </div>
      </div>
    </div>
  );
}
