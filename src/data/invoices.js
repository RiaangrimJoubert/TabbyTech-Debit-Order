// src/data/invoices.js
export const INVOICES = [
  {
    id: "INV-10001",
    status: "Paid",
    customer: "Palm Wheel Alignment",
    customerEmail: "accounts@palmwheelalignment.co.za",
    dateIssued: "2026-02-12",
    dueDate: "2026-02-12",
    currency: "ZAR",
    subtotal: 1650.0,
    vatRate: 0.15,
    items: [
      { description: "Wheel alignment (front + rear)", qty: 1, unitPrice: 950.0 },
      { description: "Balancing", qty: 2, unitPrice: 200.0 },
      { description: "Camber adjustment", qty: 1, unitPrice: 300.0 }
    ],
    notes: "Thank you for your business."
  },
  {
    id: "INV-10002",
    status: "Unpaid",
    customer: "Umzee",
    customerEmail: "info@umzee.co.za",
    dateIssued: "2026-02-14",
    dueDate: "2026-02-21",
    currency: "ZAR",
    subtotal: 2499.0,
    vatRate: 0.15,
    items: [
      { description: "Monthly debit order system setup", qty: 1, unitPrice: 2499.0 }
    ],
    notes: "Payment due within 7 days."
  },
  {
    id: "INV-10003",
    status: "Overdue",
    customer: "Arctic Tundra",
    customerEmail: "billing@arctictundra.co.za",
    dateIssued: "2026-01-28",
    dueDate: "2026-02-04",
    currency: "ZAR",
    subtotal: 5800.0,
    vatRate: 0.15,
    items: [
      { description: "Campaign management retainer", qty: 1, unitPrice: 5800.0 }
    ],
    notes: "Please settle to avoid service interruption."
  }
];

export function getInvoiceById(invoiceId) {
  return INVOICES.find((x) => String(x.id) === String(invoiceId)) || null;
}

export function money(amount, currency = "ZAR") {
  const n = Number(amount || 0);
  const isZar = currency === "ZAR";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: isZar ? "ZAR" : currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
}

export function calcTotals(inv) {
  const subtotal = Number(inv?.subtotal || 0);
  const vatRate = Number(inv?.vatRate || 0);
  const vat = subtotal * vatRate;
  const total = subtotal + vat;
  return { subtotal, vat, total };
}
