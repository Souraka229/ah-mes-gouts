import { formatFulfillmentSummary } from "@/lib/delivery/fulfillment-summary";
import type { PublicTrackingOrder, SavedOrder } from "@/types/order";

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••• •• ••";
  return `••• •• •• ${digits.slice(-4)}`;
}

/**
 * Transforme une commande interne en DTO public pour le suivi.
 * Données sensibles masquées (téléphone). Pas d'adresse précise — zone uniquement.
 */
export function toPublicTrackingOrder(order: SavedOrder): PublicTrackingOrder {
  const isAnonymousGift =
    order.isGift && order.gift !== null && !order.gift.senderVisible;

  return {
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    mode: order.mode,
    zoneName: order.zoneName,
    scheduledSlotStart: order.scheduledSlotStart,
    scheduledSlotEnd: order.scheduledSlotEnd,
    fulfillmentSummary: formatFulfillmentSummary(order),
    deliveryFee: order.deliveryFee,
    isGift: order.isGift,
    isAnonymousGift,
    giftMessage: order.gift?.giftMessage ?? null,
    recipientName: order.isGift ? (order.gift?.recipientName ?? null) : null,
    client: isAnonymousGift
      ? null
      : {
          firstName: order.client.firstName,
          lastName: order.client.lastName.charAt(0) + ".",
          phone: maskPhone(order.client.phone),
        },    paymentMethod: order.paymentMethod,
    items: order.items,
    subtotal: order.subtotal,
    total: order.total,
  };
}
