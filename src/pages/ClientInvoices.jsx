import React, { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { INVOICES, getInvoiceById, calcTotals, money } from "../data/invoices.js";

export default function ClientInvoices() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();

  const baseInvoice = useMemo(() => {
    const id = decodeURIComponent(String(invoiceId || ""));
    return getInvoiceById(id);
  }, [invoiceId]);

  const clientInvoices = useMemo(() => {
    if (!baseInvoice) return [];
    const email = String(baseInvoice.customerEmail || "").toLowerCase();
    const customer = String(baseInvoice.customer || "").toLowerCase();

    return INVOICES.filter((x) => {
      const sameEmail = email && String(x.customerEmail || "").toLowerCase() === email;
      const sameCustomer = customer && String(x.customer || "").toLowerCase() === customer;
      return sameEmail || sameCustomer;
    }).sort((a, b) => String(b.dateIssued).localeCompare(String(a.dateIssued)));
  }, [baseInvoice]);

  function openInvoice(id) {
    navigate(`/invoices-html/${encodeURIComponent(id)}`);
  }

  if (!baseInvoice) {
    return (
      <div className="tt-page">
        <div className="tt-surface">
          <div className="tt-header">
            <div className="tt-title">
              <h1>TabbyPay</h1>
              <p>Invoice portal</p>
            </div>
          </div>

          <div style={{ padding: 18, color: "rgba(255,255,255,0.75)" }}>
            Invoice not found.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tt-page">
      <div className="tt-surface">
        <div className="tt-header">
          <div className="tt-title">
            <h1>TabbyPay</h1>
            <p>
              Invoices for <strong>{baseInvoice.customer}</strong> ({baseInvoice.customerEmail})
            </p>
          </div>

          <div className="tt-toolbar">
            <Link className="tt-btn" to="/invoices-html/${encodeURIComponent(baseInvoice.id)}">
              Open latest invoice
            </Link>
          </div>
        </div>

        <div className="tt-table-wrap">
          <table className="tt-table" role="table" aria-label="Client invoices table">
            <thead>
              <tr>
                <th style={{ width: 160 }}>Invoice</th>
                <th style={{ width: 140 }}>Status</th>
                <th style={{ width: 170 }}>Issued</th>
                <th style={{ width: 170 }}>Due</th>
                <th style={{ width: 160, textAlign: "right" }}>Total</th>
                <th style={{ width: 140, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {clientInvoices.map((inv) => {
                const totals = calcTotals(inv);
                const dotClass =
                  inv.status === "Paid" ? "paid" : inv.status === "Unpaid" ? "unpaid" : "overdue";

                return (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 700, letterSpacing: 0.2 }}>{inv.id}</td>
                    <td>
                      <span className="tt-badge">
                        <span className={`tt-dot ${dotClass}`} />
                        {inv.status}
                      </span>
                    </td>
                    <td>{inv.dateIssued}</td>
                    <td>{inv.dueDate}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      {money(totals.total, inv.currency)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="tt-linkbtn"
                        onClick={() => openInvoice(inv.id)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}

              {clientInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 18, color: "rgba(255,255,255,0.70)" }}>
                    No invoices found for this client.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="tt-footer-note">
          Open shows the printable invoice. Use Print or Save as PDF on that page.
        </div>
      </div>
    </div>
  );
}
