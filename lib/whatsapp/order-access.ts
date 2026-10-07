import { phoneSearchVariants, phonesMatch } from "@/lib/crm/phone";
import { getPrisma } from "@/lib/prisma";
import { isPendingPaymentExpired } from "@/lib/orders/payment-expiration";

/** Le numéro WhatsApp correspond-il au téléphone enregistré sur la commande ? */
export function chatPhoneOwnsOrderClientPhone(
  chatPhone: string,
  orderClientPhone: string,
): boolean {
  return phonesMatch(chatPhone, orderClientPhone);
}

export async function assertChatOwnsPayableOrder(
  chatPhone: string,
  orderId: string,
): Promise<
  | { ok: true; total: number; trackingToken: string | null }
  | { ok: false; reason: "not_found" | "forbidden" | "expired" | "not_payable" }
> {
  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      clientPhone: true,
      status: true,
      total: true,
      createdAt: true,
      trackingToken: true,
    },
  });

  if (!order) return { ok: false, reason: "not_found" };

  const variants = phoneSearchVariants(chatPhone);
  if (!variants.some((v) => phonesMatch(v, order.clientPhone))) {
    return { ok: false, reason: "forbidden" };
  }

  if (order.status !== "RECUE") {
    return { ok: false, reason: "not_payable" };
  }

  if (isPendingPaymentExpired(order.createdAt)) {
    return { ok: false, reason: "expired" };
  }

  return {
    ok: true,
    total: order.total,
    trackingToken: order.trackingToken,
  };
}

/** Vérifie qu'une référence FeexPay appartient à une commande de cette cliente. */
export async function assertChatOwnsPaymentReference(
  chatPhone: string,
  reference: string,
): Promise<
  | { ok: true; orderId: string }
  | { ok: false; reason: "unknown_ref" | "forbidden" }
> {
  const prisma = getPrisma();
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { reference: reference.trim() },
    select: {
      orderId: true,
      order: { select: { clientPhone: true } },
    },
  });

  if (!attempt) return { ok: false, reason: "unknown_ref" };

  if (
    !chatPhoneOwnsOrderClientPhone(chatPhone, attempt.order.clientPhone)
  ) {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, orderId: attempt.orderId };
}
