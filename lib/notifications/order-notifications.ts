import { SITE_NAME } from "@/lib/seo/site";
import type { SavedOrder } from "@/types/order";

export type NotificationTemplate =
  | "standard"
  | "gift"
  | "gift_sender_confirmation";

export type OrderNotification = {
  template: NotificationTemplate;
  toPhone: string;
  subject: string;
  body: string;
};

function formatSenderName(order: SavedOrder): string {
  return `${order.client.firstName} ${order.client.lastName}`.trim();
}

/** Template standard — commande classique ou confirmation expéditeur */
export function buildStandardOrderNotification(
  order: SavedOrder,
  recipientPhone: string,
): OrderNotification {
  return {
    template: "standard",
    toPhone: recipientPhone,
    subject: `Commande ${order.id}`,
    body: `Votre commande #${order.id} est en préparation. Merci pour votre confiance — ${SITE_NAME}.`,
  };
}

/**
 * Template cadeau — destinataire.
 * Ne contient JAMAIS le nom de l'expéditeur si sender_visible = false.
 */
export function buildGiftRecipientNotification(
  order: SavedOrder,
): OrderNotification | null {
  if (!order.isGift || !order.gift) return null;

  const bodyParts = [
    "Quelqu'un pense à vous — une surprise arrive chez vous.",
  ];

  if (order.gift.giftMessage.trim()) {
    bodyParts.push(`"${order.gift.giftMessage.trim()}"`);
  }

  if (order.gift.senderVisible) {
    bodyParts.splice(1, 0, `De la part de ${formatSenderName(order)}.`);
  }

  bodyParts.push(`— ${SITE_NAME}`);

  return {
    template: "gift",
    toPhone: order.gift.recipientPhone,
    subject: "Une surprise arrive chez vous",
    body: bodyParts.join(" "),
  };
}

/** Confirmation à l'expéditeur d'un cadeau */
export function buildGiftSenderConfirmation(
  order: SavedOrder,
): OrderNotification | null {
  if (!order.isGift || !order.gift) return null;

  return {
    template: "gift_sender_confirmation",
    toPhone: order.client.phone,
    subject: `Cadeau ${order.id}`,
    body: `Votre cadeau pour ${order.gift.recipientName} est confirmé (#${order.id}). Nous préparons la surprise — ${SITE_NAME}.`,
  };
}

export function buildOrderNotifications(
  order: SavedOrder,
): OrderNotification[] {
  if (order.isGift && order.gift) {
    const notifications: OrderNotification[] = [];

    const recipient = buildGiftRecipientNotification(order);
    if (recipient) notifications.push(recipient);

    const sender = buildGiftSenderConfirmation(order);
    if (sender) notifications.push(sender);

    return notifications;
  }

  return [buildStandardOrderNotification(order, order.client.phone)];
}

/** Mock d'envoi SMS — à brancher sur agrégateur (GeniusPay, etc.) */
export async function sendOrderNotifications(
  order: SavedOrder,
): Promise<void> {
  const notifications = buildOrderNotifications(order);

  if (process.env.NODE_ENV === "development") {
    for (const notification of notifications) {
      console.info(
        `[notification:${notification.template}] → ${notification.toPhone}`,
        notification.body,
      );
    }
  }

  await Promise.resolve();
}
