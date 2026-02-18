// src/pages/InvoiceHtml.jsx
import React, { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { INVOICES, getInvoiceById, calcTotals, money } from "../data/invoices.js";
import "../styles/invoice-html.css";

export default function InvoiceHtml() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();

  const invoice = useMemo(() => {
    const id = decodeURIComponent(String(invoiceId || ""));
    return getInvoiceById(id);
  }, [invoiceId]);

  const relatedInvoices = useMemo(() => {
    if (!invoice) return [];
    const email = String(invoice.customerEmail || "").toLowerCase();
    const customer = String(invoice.customer || "").toLowerCase();

    return INVOICES.filter((x) => {
      const sameEmail =
        email && String(x.customerEmail || "").toLowerCase() === email;
      const sameCustomer =
        customer && String(x.customer || "").toLowerCase() === customer;
      return sameEmail || sameCustomer;
    }).sort((a, b) => String(b.dateIssued).localeCompare(String(a.dateIssued)));
  }, [invoice]);

  if (!invoice) {
    return (
      <div className="invhtml-root">
        <div className="invhtml-shell">
          <div className="invhtml-topbar">
            <div className="invhtml-brand">
              <div className="invhtml-logo">TT</div>
              <div className="invhtml-brandtext">
                <div className="invhtml-brandname">TabbyTech</div>
                <div className="invhtml-brandsub">Debit Orders</div>
              </div>
            </div>

            <div className="invhtml-actions noprint">
              <Link className="invhtml-btn" to="/invoices">
                Back to invoices
              </Link>
            </div>
          </div>

          <div className="invhtml-card">
            <div className="invhtml-empty">
              <div className="invhtml-emptytitle">Invoice not found</div>
              <div className="invhtml-emptysub">
                The invoice ID in the URL does not match a known invoice.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totals = calcTotals(invoice);
  const vatPercent = Math.round(Number(invoice.vatRate || 0) * 100);

  function onPrint() {
    window.print();
  }

  function onOpenInvoice(nextId) {
    navigate(`/invoices-html/${encodeURIComponent(nextId)}`);
  }

  return (
    <div className="invhtml-root">
      <div className="invhtml-shell">
        <div className="invhtml-topbar">
          <div className="invhtml-brand">
            <div className="invhtml-logo">TT</div>
            <div className="invhtml-brandtext">
              <div className="invhtml-brandname">TabbyTech</div>
              <div className="invhtml-brandsub">Invoices</div>
            </div>
          </div>

          <div className="invhtml-actions noprint">
            <Link className="invhtml-btn" to="/invoices">
              Back
            </Link>
            <button className="invhtml-btn invhtml-btn-primary" type="button" onClick={onPrint}>
              Print / Save as PDF
            </button>
          </div>
        </div>

        <div className="invhtml-card">
          <div className="invhtml-header">
            <div className="invhtml-left">
              <div className="invhtml-h1">Tax Invoice</div>
              <div className="invhtml-meta">
                <div className="invhtml-row">
                  <span className="invhtml-k">Invoice</span>
                  <span className="invhtml-v">{invoice.id}</span>
                </div>
                <div className="invhtml-row">
                  <span className="invhtml-k">Status</span>
                  <span className="invhtml-v">{invoice.status}</span>
                </div>
                <div className="invhtml-row">
                  <span className="invhtml-k">Issued</span>
                  <span className="invhtml-v">{invoice.dateIssued}</span>
                </div>
                <div className="invhtml-row">
                  <span className="invhtml-k">Due</span>
                  <span className="invhtml-v">{invoice.dueDate}</span>
                </div>
              </div>
            </div>

            <div className="invhtml-right">
              <div className="invhtml-company">
                <div className="invhtml-companyname">TabbyTech (Pty) Ltd</div>
                <div className="invhtml-companyline">South Africa</div>
                <div className="invhtml-companyline">Billing: billing@tabbytech.co.za</div>
                <div className="invhtml-companyline">Support: support@tabbytech.co.za</div>
              </div>

              <div className="invhtml-chip">
                <div className="invhtml-chipk">Total due</div>
                <div className="invhtml-chipv">{money(totals.total, invoice.currency)}</div>
              </div>
            </div>
          </div>

          <div className="invhtml-divider" />

          <div className="invhtml-grid">
            <div className="invhtml-panel">
              <div className="invhtml-paneltitle">Bill to</div>
              <div className="invhtml-panelbody">
                <div className="invhtml-strong">{invoice.customer}</div>
                <div className="invhtml-muted">{invoice.customerEmail}</div>
                <div className="invhtml-muted">South Africa</div>
              </div>
            </div>

            <div className="invhtml-panel">
              <div className="invhtml-paneltitle">Payment</div>
              <div className="invhtml-panelbody">
                <div className="invhtml-row2">
                  <span className="invhtml-muted">Method</span>
                  <span className="invhtml-strong">EFT</span>
                </div>
                <div className="invhtml-row2">
                  <span className="invhtml-muted">Reference</span>
                  <span className="invhtml-strong">{invoice.id}</span>
                </div>
                <div className="invhtml-row2">
                  <span className="invhtml-muted">Currency</span>
                  <span className="invhtml-strong">{invoice.currency || "ZAR"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="invhtml-tablewrap">
            <table className="invhtml-table" aria-label="Invoice line items">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ width: 90, textAlign: "right" }}>Qty</th>
                  <th style={{ width: 140, textAlign: "right" }}>Unit</th>
                  <th style={{ width: 160, textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((it, idx) => {
                  const qty = Number(it.qty || 0);
                  const unit = Number(it.unitPrice || 0);
                  const amount = qty * unit;
                  return (
                    <tr key={`${invoice.id}-row-${idx}`}>
                      <td>
                        <div className="invhtml-desc">{it.description}</div>
                      </td>
                      <td style={{ textAlign: "right" }}>{qty}</td>
                      <td style={{ textAlign: "right" }}>{money(unit, invoice.currency)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {money(amount, invoice.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="invhtml-totals">
              <div className="invhtml-trow">
                <span className="invhtml-muted">Subtotal</span>
                <span className="invhtml-strong">{money(totals.subtotal, invoice.currency)}</span>
              </div>
              <div className="invhtml-trow">
                <span className="invhtml-muted">VAT ({vatPercent}%)</span>
                <span className="invhtml-strong">{money(totals.vat, invoice.currency)}</span>
              </div>
              <div className="invhtml-trow invhtml-trowtotal">
                <span>Total</span>
                <span>{money(totals.total, invoice.currency)}</span>
              </div>
            </div>
          </div>

          <div className="invhtml-notes">
            <div className="invhtml-paneltitle">Notes</div>
            <div className="invhtml-muted">{invoice.notes || " "}</div>
          </div>

          <div className="invhtml-divider noprint" />

          <div className="invhtml-notes noprint">
            <div className="invhtml-paneltitle">More invoices for this client</div>

            {relatedInvoices.length <= 1 ? (
              <div className="invhtml-muted">No other invoices found for this client.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {relatedInvoices
                  .filter((x) => x.id !== invoice.id)
                  .map((x) => {
                    const t = calcTotals(x);
                    return (
                      <button
                        key={x.id}
                        type="button"
                        className="invhtml-btn"
                        style={{
                          width: "100%",
                          justifyContent: "space-between",
                          paddingLeft: 12,
                          paddingRight: 12
                        }}
                        onClick={() => onOpenInvoice(x.id)}
                        aria-label={`Open invoice ${x.id}`}
                      >
                        <span style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                          <span style={{ fontWeight: 900 }}>{x.id}</span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                            {x.dateIssued} • {x.status}
                          </span>
                        </span>

                        <span style={{ fontWeight: 900 }}>
                          {money(t.total, x.currency)}
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="invhtml-footer">
            <div className="invhtml-muted">
              This invoice is accessible via URL for email linking. Use Print / Save as PDF from your browser.
            </div>
            <div className="invhtml-muted">TabbyTech Debit Orders</div>
          </div>
        </div>
      </div>
    </div>
  );
}
