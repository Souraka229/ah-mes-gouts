import { SITE_URL } from "@/lib/seo/site";
import { getServerOrder } from "@/lib/server/order-repository";

import { sendKapsoWhatsAppText } from "./kapso-client";
import { clearPaySession } from "./pay-session";

export async function notifyWhatsAppPaymentSuccess(input: {
  orderId: string;
  toPhone: string;
  phoneNumberId?: string;
}): Promise<void> {
  const order = await getServerOrder(input.orderId);
  if (!order) return;

  const tracking =
    order.trackingToken != null
      ? `${SITE_URL}/suivi/${order.id}?t=${order.trackingToken}`
      : `${SITE_URL}/suivi/${order.id}`;

  const text = [
    "Paiement confirmé — merci.",
    `Commande ${order.id} · ${order.total.toLocaleString("fr-FR")} FCFA`,
    "",
    `Suivi : ${tracking}`,
    "",
    "Nous préparons votre commande. À très vite.",
  ].join("\n");

  await sendKapsoWhatsAppText(
    input.toPhone,
    text,
    input.phoneNumberId,
  ).catch((err) => console.error("[whatsapp/pay-notify]", err));

  await clearPaySession(input.toPhone);
}
