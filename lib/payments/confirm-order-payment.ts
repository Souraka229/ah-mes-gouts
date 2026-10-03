import { getProductCategory } from "@/lib/catalog-utils";
import { isUnlimitedStockCategory } from "@/lib/admin/categories";
import { isLowStock, getEffectiveStock } from "@/lib/product-stock-display";
import {
  attachVariants,
  getFullCatalog,
} from "@/lib/server/shop-catalog";
import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { sendOrderNotifications } from "@/lib/notifications/order-notifications";
import {
  alertDeliveryWaveFull,
  alertNewOrder,
  alertStockLow,
  notifyOps,
} from "@/lib/notifications/ops-alerts";
import { formatFulfillmentSummary } from "@/lib/delivery/fulfillment-summary";
import {
  formatSlotDateShort,
  formatSlotRange,
} from "@/lib/delivery/slots";
import {
  buildSlotKey,
  getSlotOccupancy,
} from "@/lib/server/slot-bookings";
import type { SavedOrder } from "@/types/order";
import { attachOrderToCustomer } from "@/lib/server/crm/customer-service";
import {
  confirmServerOrderPayment,
  expirePendingOrder,
  getServerOrder,
} from "@/lib/server/order-repository";
import { isPendingPaymentExpired } from "@/lib/orders/payment-expiration";
import { revalidatePath, revalidateTag } from "next/cache";
import type { StockClaim } from "@/lib/server/order-pricing";

/**
 * Prévient la boutique dès qu'une vague de livraison est complète (35).
 *
 * C'est le signal opérationnel : à partir de là, la tournée peut être
 * constituée et assignée à un ou plusieurs livreurs. L'information de
 * capacité reste interne — la cliente ne voit que la disponibilité.
 */
async function notifyIfDeliveryWaveFull(order: SavedOrder): Promise<void> {
  if (order.fulfillmentType !== "delivery" || !order.scheduledSlotStart) {
    return;
  }

  const slotKey = buildSlotKey("delivery", order.scheduledSlotStart);
  const { used, capacity, isFull } = await getSlotOccupancy(slotKey);

  // Uniquement au franchissement exact : sinon chaque commande suivante
  // renverrait une alerte alors que la vague est déjà pleine.
  if (!isFull || used !== capacity) return;

  notifyOps(
    alertDeliveryWaveFull({
      capacity,
      dayLabel: formatSlotDateShort(order.scheduledSlotStart),
      slotLabel: formatSlotRange(
        order.scheduledSlotStart,
        order.scheduledSlotEnd ?? order.scheduledSlotStart,
      ),
    }),
  );
}

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

  const catalog = await attachVariants(await getFullCatalog());
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));

  const stockClaims = new Map<string, StockClaim>();
  for (const item of existing.items) {
    if (!item.slug) continue;
    const product = bySlug.get(item.slug);
    const category = product ? getProductCategory(product) : undefined;
    const unlimitedStock = category
      ? isUnlimitedStockCategory(category)
      : false;
    const variant = item.variantId
      ? product?.variants?.find((entry) => entry.id === item.variantId)
      : undefined;
    const variantStockTracked = Boolean(
      variant && variant.stockRemaining !== null,
    );
    const key = variantStockTracked
      ? `${item.slug}:${item.variantId}`
      : item.slug;
    const current = stockClaims.get(key);
    if (current) {
      current.quantity += item.quantity;
      continue;
    }
    stockClaims.set(key, {
      slug: item.slug,
      name: item.name,
      quantity: item.quantity,
      category,
      unlimitedStock,
      variantId: item.variantId,
      variantStockTracked,
    });
  }
  const claims = [...stockClaims.values()];

  const confirmed = await confirmServerOrderPayment(
    orderId,
    claims,
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

  const trackedClaims = claims.filter((c) => !c.unlimitedStock);
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

  notifyOps(
    alertNewOrder({
      orderId: confirmed.id,
      total: confirmed.total,
      mode: confirmed.mode,
      clientName: `${confirmed.client.firstName} ${confirmed.client.lastName}`.trim(),
    }),
  );

  void notifyIfDeliveryWaveFull(confirmed).catch(() => {
    /* non bloquant */
  });

  try {
    revalidateTag("catalog");
    revalidateTag("menu");
    revalidatePath("/");
    revalidatePath("/catalogue");
    for (const claim of trackedClaims) {
      revalidatePath(`/produit/${claim.slug}`);
    }
  } catch {
    /* ISR best-effort */
  }

  const catalogAfter = await attachVariants(await getFullCatalog()).catch(
    () => [] as typeof catalog,
  );
  for (const claim of trackedClaims) {
    const product = catalogAfter.find((p) => p.slug === claim.slug);
    if (!product) continue;
    const remaining = getEffectiveStock(product);
    if (remaining === null) continue;
    if (isLowStock(product) || remaining === 0) {
      notifyOps(
        alertStockLow({
          productName: product.name,
          remaining,
        }),
      );
    }
  }

  return { ok: true, orderId };
}

export { formatFulfillmentSummary };
