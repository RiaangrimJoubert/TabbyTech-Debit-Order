// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Invoices from "./pages/Invoices.jsx";
import InvoiceHtml from "./pages/InvoiceHtml.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/invoices" replace />} />
      <Route path="/invoices" element={<Invoices />} />
      <Route path="/invoices-html/:invoiceId" element={<InvoiceHtml />} />
      <Route path="*" element={<Navigate to="/invoices" replace />} />
    </Routes>
  );
}
