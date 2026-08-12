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

/**
 * Jeton de suivi conservé localement à la création de la commande.
 * Exigé par /api/orders/[id]/tracking pour lire une commande.
 */
export function getTrackingToken(orderId: string): string | null {
  return getOrderById(orderId)?.trackingToken ?? null;
}

/**
 * Construit l'URL de suivi en y joignant le jeton s'il est connu de cet
 * appareil. Sans jeton, seules les commandes antérieures à la migration
 * restent lisibles.
 */
export function buildTrackingUrl(orderId: string): string {
  const base = `/api/orders/${encodeURIComponent(orderId)}/tracking`;
  const token = getTrackingToken(orderId);
  return token ? `${base}?t=${encodeURIComponent(token)}` : base;
}
