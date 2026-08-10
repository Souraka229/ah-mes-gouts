import type { OrderStatus, SavedOrder } from "@/types/order";
import { PAYMENT_METHOD_LABELS, RECEPTION_MODE_LABELS } from "@/types/order";
import {
  formatDeliveryAddressLine,
  isBulkAreasLabel,
} from "@/lib/delivery-zones";
import { parseOrderFlags, type OrderFlags } from "@/lib/orders/order-flags";

export type OrderBoardTab = "nouvelles" | "preparation" | "livraison";

export const BOARD_TAB_LABELS: Record<OrderBoardTab, string> = {
  nouvelles: "Nouvelles",
  preparation: "En préparation",
  livraison: "Prêtes / Livraison",
};

/** Couleur indicateur par statut (pastilles). */
export const STATUS_DOT_CLASS: Record<OrderStatus, string> = {
  recue: "bg-amber-400",
  paiement_confirme: "bg-amber-400",
  preparation: "bg-sky-500",
  prete: "bg-violet-500",
  en_livraison: "bg-orange-500",
  livree: "bg-emerald-500",
  annulee: "bg-red-500",
};

export const STATUS_BORDER_CLASS: Record<OrderStatus, string> = {
  recue: "border-l-amber-400",
  paiement_confirme: "border-l-amber-400",
  preparation: "border-l-sky-500",
  prete: "border-l-violet-500",
  en_livraison: "border-l-orange-500",
  livree: "border-l-emerald-500",
  annulee: "border-l-red-500",
};

// "recue" = paiement pas encore confirmé (en cours ou échoué) — n'apparaît jamais côté admin.
// Règle : si le paiement ne passe pas, la commande ne doit pas remonter.
const NOUVELLES: OrderStatus[] = ["paiement_confirme"];
const PREPARATION: OrderStatus[] = ["preparation"];
const LIVRAISON: OrderStatus[] = ["prete", "en_livraison", "livree"];

export function getOrderBoardTab(status: OrderStatus): OrderBoardTab | null {
  if (status === "annulee") return null;
  if (NOUVELLES.includes(status)) return "nouvelles";
  if (PREPARATION.includes(status)) return "preparation";
  if (LIVRAISON.includes(status)) return "livraison";
  return null;
}

export function filterOrdersByTab(
  orders: SavedOrder[],
  tab: OrderBoardTab,
): SavedOrder[] {
  return orders.filter((o) => getOrderBoardTab(o.status) === tab);
}

export function countByTab(orders: SavedOrder[]): Record<OrderBoardTab, number> {
  return {
    nouvelles: filterOrdersByTab(orders, "nouvelles").length,
    preparation: filterOrdersByTab(orders, "preparation").length,
    livraison: filterOrdersByTab(orders, "livraison").length,
  };
}

export function clientLabel(order: SavedOrder): string {
  const first = order.client.firstName.trim();
  const last = order.client.lastName.trim();
  const full = `${first} ${last}`.trim();
  if (order.isGift && order.gift?.recipientName) {
    return order.gift.recipientName;
  }
  return full || "Client";
}

export function formatItemsSummary(order: SavedOrder): string {
  if (order.items.length === 0) return "—";
  const parts = order.items.map(
    (i) => `${i.quantity}× ${i.name}`,
  );
  return parts.join(", ");
}

export function formatScheduleLabel(order: SavedOrder): string {
  if (!order.scheduledSlotStart) return "—";
  const date = new Date(order.scheduledSlotStart);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const dayLabel = isToday
    ? "Aujourd'hui"
    : date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
  const time = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dayLabel} — ${time}`;
}

export function formatFulfillmentType(order: SavedOrder): string {
  const mode = order.fulfillmentType ?? order.mode;
  return RECEPTION_MODE_LABELS[mode];
}

export function formatFulfillmentPlace(order: SavedOrder): string {
  const mode = order.fulfillmentType ?? order.mode;
  if (mode === "delivery") {
    return formatDeliveryAddressLine({
      zoneId: order.zoneId ?? order.deliveryZoneId,
      zoneName: isBulkAreasLabel(order.zoneName) ? null : order.zoneName,
      address: order.client.address,
      landmark: order.client.landmark,
    });
  }
  return mode === "dinein" ? "Boutique (sur place)" : "Boutique (à emporter)";
}

export function getCakeMessage(order: SavedOrder): string | null {
  const gift = order.gift?.giftMessage?.trim();
  if (gift) return gift;
  const client = parseOrderFlags(order.client.message).note;
  if (client) return client;
  return null;
}

export function hasReferenceNote(order: SavedOrder): boolean {
  return order.items.some((i) => i.supplements.length > 0);
}

/** Choix d'emballage + signalement injoignable extraits du message. */
export function getOrderFlags(order: SavedOrder): OrderFlags {
  return parseOrderFlags(order.client.message);
}

export function getPrimaryAction(
  order: SavedOrder,
): { label: string; nextStatus: OrderStatus } | null {
  const isDelivery = (order.fulfillmentType ?? order.mode) === "delivery";
  switch (order.status) {
    case "recue":
    case "paiement_confirme":
      return { label: "Préparer", nextStatus: "preparation" };
    case "preparation":
      return { label: "Marquer prête", nextStatus: "prete" };
    case "prete":
      // Boutique (emporter / sur place) : pas de livraison → on termine direct.
      return isDelivery
        ? { label: "En livraison", nextStatus: "en_livraison" }
        : { label: "Terminer", nextStatus: "livree" };
    case "en_livraison":
      return { label: "Terminer", nextStatus: "livree" };
    default:
      return null;
  }
}

export function paymentLabel(order: SavedOrder): string {
  return PAYMENT_METHOD_LABELS[order.paymentMethod];
}

export function getClientPhone(order: SavedOrder): string {
  if (order.isGift && order.gift?.recipientPhone) {
    return order.gift.recipientPhone;
  }
  return order.client.phone;
}

export function getDeliveryAddress(order: SavedOrder): string {
  if (order.isGift && order.gift?.recipientAddress) {
    return order.gift.recipientAddress;
  }
  return order.client.address;
}
