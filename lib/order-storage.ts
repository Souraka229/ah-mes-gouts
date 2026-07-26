import type { SavedOrder } from "@/types/order";

const ORDERS_STORAGE_KEY = "ah-mes-gouts-orders";

export function saveOrder(order: SavedOrder): void {
  if (typeof window === "undefined") return;

  const existing = loadOrders();
  window.localStorage.setItem(
    ORDERS_STORAGE_KEY,
    JSON.stringify([order, ...existing]),
  );
}

export function loadOrders(): SavedOrder[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedOrder[];
  } catch {
    return [];
  }
}

export function getOrderById(orderId: string): SavedOrder | undefined {
  return loadOrders().find((order) => order.id === orderId);
}

export function generateOrderId(): string {
  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return `AMG-${suffix}`;
}
