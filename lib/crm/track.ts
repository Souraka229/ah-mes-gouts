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

/**
 * Reconnaît la cliente à partir de son téléphone, sans jamais la lier.
 *
 * L'ancienne route /api/crm/link était publique et sans preuve de possession :
 * n'importe qui pouvait rattacher son appareil à un numéro quelconque et,
 * au passage, écraser le prénom et le nom du client en base. Elle est
 * supprimée.
 *
 * La liaison appareil → client se fait désormais uniquement à la confirmation
 * de paiement (attachOrderToCustomer), où le paiement effectif fait office de
 * preuve. Ici, on ne fait que lire un signal d'accueil.
 */
export async function recognizeCustomer(phone: string): Promise<{
  known: boolean;
  trusted?: boolean;
  firstName?: string;
  ordersCount?: number;
} | null> {
  if (typeof window === "undefined" || !phone.trim()) return null;

  try {
    const response = await fetch("/api/customer/recognize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (!response.ok) return null;
    return (await response.json()) as { known: boolean };
  } catch {
    return null;
  }
}
