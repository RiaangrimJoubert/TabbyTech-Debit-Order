// src/api/debitOrders.js
import { request } from "./index";

export async function fetchDebitOrders() {
  const res = await request("/api/debit-orders", { method: "GET" });
  return res?.data || [];
}

export async function fetchDebitOrderById(id) {
  if (!id) throw new Error("Missing debit order id");
  const res = await request(`/api/debit-orders/${encodeURIComponent(id)}`, { method: "GET" });
  return res?.data || null;
}
