import { getProductCategory } from "@/lib/catalog-utils";
import { isUnlimitedStockCategory } from "@/lib/admin/categories";
import { getFullCatalog } from "@/lib/server/shop-catalog";
import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { sendOrderNotifications } from "@/lib/notifications/order-notifications";
import {
  formatNewOrderAlert,
  notifyTelegramSafe,
} from "@/lib/notifications/telegram";
import { formatFulfillmentSummary } from "@/lib/delivery/fulfillment-summary";
import { attachOrderToCustomer } from "@/lib/server/crm/customer-service";
import {
  confirmServerOrderPayment,
  expirePendingOrder,
  getServerOrder,
} from "@/lib/server/order-repository";
import { isPendingPaymentExpired } from "@/lib/orders/payment-expiration";

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

  if (
    existing.status === "recue" &&
    isPendingPaymentExpired(existing.createdAt)
  ) {
    await expirePendingOrder(orderId);
    return {
      ok: false,
      error:
        "Le délai de paiement de cette commande a expiré. Veuillez recommencer.",
      status: 410,
    };
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

  const catalog = await getFullCatalog();
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));

  const stockClaims = existing.items
    .filter((item) => item.slug)
    .map((item) => {
      const product = bySlug.get(item.slug!);
      const category = product ? getProductCategory(product) : undefined;
      const unlimitedStock = category
        ? isUnlimitedStockCategory(category)
        : false;
      return {
        slug: item.slug!,
        name: item.name,
        quantity: item.quantity,
        category,
        unlimitedStock,
      };
    });

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

  if (confirmed.status === "annulee") {
    return {
      ok: false,
      error:
        "Le délai de paiement de cette commande a expiré. Veuillez recommencer.",
      status: 410,
    };
  }

  const trackedClaims = stockClaims.filter((c) => !c.unlimitedStock);
  if (trackedClaims.length > 0) {
    void appendAdminActionLog({
      adminName: "Client",
      source: "manual",
      action: "stock_decrement",
      summary: `Stock débité — commande ${confirmed.id}`,
      details: {
        orderId: confirmed.id,
        items: trackedClaims.map((c) => ({
          slug: c.slug,
          name: c.name,
          quantity: c.quantity,
        })),
      },
    }).catch(() => {
      /* non bloquant */
    });
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
