import { settlePaymentByReference } from "@/lib/payments/settle-payment";
import { getPrisma } from "@/lib/prisma";

import { drainWhatsAppInboundQueue } from "./inbound-queue";
import { drainWhatsAppOutboundQueue } from "./outbound-send";
import { assertChatOwnsPaymentReference } from "./order-access";
import { clearPaySession } from "./pay-session";

/**
 * Boucle autonome : file entrante/sortante + paiements WhatsApp bloqués en attente opérateur.
 */
export async function runWhatsAppAutopilot(): Promise<{
  inbound: number;
  outbound: number;
  paymentsSettled: number;
  sessionsCleared: number;
}> {
  const inbound = await drainWhatsAppInboundQueue(30);
  const outbound = await drainWhatsAppOutboundQueue(25);

  let paymentsSettled = 0;
  let sessionsCleared = 0;

  try {
    const prisma = getPrisma();
    const now = new Date();
    const waiting = await prisma.whatsAppPaySession.findMany({
      where: {
        state: "waiting_operator",
        reference: { not: null },
        expiresAt: { gt: now },
      },
      take: 40,
      select: {
        phoneKey: true,
        reference: true,
        orderId: true,
      },
    });

    for (const session of waiting) {
      const ref = session.reference?.trim();
      if (!ref) continue;

      const owned = await assertChatOwnsPaymentReference(session.phoneKey, ref);
      if (!owned.ok) continue;

      const settled = await settlePaymentByReference(ref);
      if (settled.ok) {
        paymentsSettled += 1;
        await clearPaySession(session.phoneKey);
      }
    }

    const expired = await prisma.whatsAppPaySession.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    sessionsCleared = expired.count;
  } catch (err) {
    console.warn("[whatsapp/autopilot]", err);
  }

  return { inbound, outbound, paymentsSettled, sessionsCleared };
}
