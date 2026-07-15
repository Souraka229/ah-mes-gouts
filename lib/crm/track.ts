import { getOrCreateDeviceKey } from "@/lib/crm/device-id";

export type ClientActivityType =
  | "product_view"
  | "add_to_cart"
  | "checkout_start"
  | "order_placed";

export type TrackActivityInput = {
  type: ClientActivityType;
  productId?: string;
  productSlug?: string;
  productName?: string;
  metadata?: Record<string, unknown>;
};

/** Fire-and-forget — ne bloque jamais l'UI boutique. */
export function trackActivity(input: TrackActivityInput): void {
  if (typeof window === "undefined") return;

  const deviceKey = getOrCreateDeviceKey();
  if (!deviceKey) return;

  void fetch("/api/crm/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceKey,
      type: input.type,
      productId: input.productId,
      productSlug: input.productSlug,
      productName: input.productName,
      metadata: input.metadata,
    }),
    keepalive: true,
  }).catch(() => null);
}

/** Relie l'appareil au téléphone (après saisie / commande). */
export function linkDeviceToPhone(phone: string): void {
  if (typeof window === "undefined") return;
  const deviceKey = getOrCreateDeviceKey();
  if (!deviceKey || !phone.trim()) return;

  void fetch("/api/crm/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceKey, phone }),
    keepalive: true,
  }).catch(() => null);
}
