import { sendOrderNotifications } from "@/lib/notifications/order-notifications";
import {
  formatNewOrderAlert,
  notifyTelegramSafe,
} from "@/lib/notifications/telegram";
import { formatFulfillmentSummary } from "@/lib/delivery/fulfillment-summary";
import { attachOrderToCustomer } from "@/lib/server/crm/customer-service";
import {
  confirmServerOrderPayment,
  getServerOrder,
} from "@/lib/server/order-repository";

export type ConfirmPaymentResult =
  | { ok: true; orderId: string; alreadyConfirmed?: boolean }
  | { ok: false; error: string; status: number };

/**
 * Confirme le paiement d'une commande « reçue » : statut + stock + notifications.
 * Idempotent si déjà en paiement_confirme ou au-delà.
 */
export async function confirmOrderPayment(
  orderId: string,
  paymentReference?: string,
  options?: { deviceKey?: string | null },
): Promise<ConfirmPaymentResult> {
  const existing = await getServerOrder(orderId);
  if (!existing) {
    return { ok: false, error: "Commande introuvable.", status: 404 };
  }

  if (existing.status !== "recue") {
    if (
      existing.status === "paiement_confirme" ||
      existing.status === "preparation" ||
      existing.status === "prete" ||
      existing.status === "en_livraison" ||
      existing.status === "livree"
    ) {
      return { ok: true, orderId, alreadyConfirmed: true };
    }
    return {
      ok: false,
      error: "Cette commande ne peut plus être payée.",
      status: 409,
    };
  }

  const stockClaims = existing.items
    .filter((item) => item.slug)
    .map((item) => ({
      slug: item.slug!,
      name: item.name,
      quantity: item.quantity,
    }));

  const confirmed = await confirmServerOrderPayment(
    orderId,
    stockClaims,
    paymentReference,
  );

  if (!confirmed) {
    return {
      ok: false,
      error: "Impossible de confirmer le paiement (stock ou commande).",
      status: 409,
    };
  }

  void attachOrderToCustomer({
    orderId: confirmed.id,
    phone: confirmed.client.phone,
    firstName: confirmed.client.firstName,
    lastName: confirmed.client.lastName,
    total: confirmed.total,
    createdAt: new Date(confirmed.createdAt),
    deviceKey: options?.deviceKey ?? null,
  }).catch(() => {
    /* non bloquant */
  });

  void sendOrderNotifications(confirmed).catch(() => {
    /* non bloquant */
  });

  notifyTelegramSafe(
    formatNewOrderAlert({
      orderId: confirmed.id,
      total: confirmed.total,
      mode: confirmed.mode,
      clientName: `${confirmed.client.firstName} ${confirmed.client.lastName}`.trim(),
    }),
  );

  return { ok: true, orderId };
}

export { formatFulfillmentSummary };
