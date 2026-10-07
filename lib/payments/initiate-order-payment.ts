import { assertChatOwnsPayableOrder } from "@/lib/whatsapp/order-access";
import { confirmOrderPayment } from "@/lib/payments/confirm-order-payment";
import {
  getFeexPayConfig,
  initiateFeexPayPayment,
  isMockPaymentAllowed,
} from "@/lib/payments/feexpay";
import { settlePaymentByReference } from "@/lib/payments/settle-payment";
import { getPrisma } from "@/lib/prisma";
import { isPendingPaymentExpired } from "@/lib/orders/payment-expiration";
import { toPrismaPaymentMethod } from "@/lib/server/order-mapper";
import {
  expirePendingOrder,
  getServerOrder,
} from "@/lib/server/order-repository";
import type { PaymentMethod } from "@/types/order";

export type InitiateOrderPaymentResult =
  | {
      ok: true;
      status: "SUCCESS" | "PENDING";
      reference: string;
      orderId: string;
      message?: string;
      paymentUrl?: string;
    }
  | { ok: false; error: string; httpStatus: number };

async function mockPayment(
  orderId: string,
  method: PaymentMethod,
  amount: number,
): Promise<
  | { status: "SUCCESS"; reference: string }
  | { status: "error"; message: string }
> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (amount <= 0) {
    return { status: "error", message: "Montant invalide." };
  }
  return {
    status: "SUCCESS",
    reference: `MOCK-${orderId}-${Date.now()}`,
  };
}

/**
 * Initiation FeexPay partagée (checkout web + WhatsApp).
 * `paymentPhone` = numéro qui reçoit la demande USSD (peut différer du téléphone commande).
 */
export async function initiateOrderPayment(input: {
  orderId: string;
  method: PaymentMethod;
  paymentPhone?: string;
  deviceKey?: string | null;
  salesChannel?: "web" | "whatsapp";
  /** Obligatoire si salesChannel = whatsapp — empêche le paiement d'une commande tierce. */
  authorizedChatPhone?: string;
}): Promise<InitiateOrderPaymentResult> {
  const order = await getServerOrder(input.orderId);

  if (!order) {
    return { ok: false, error: "Commande introuvable.", httpStatus: 404 };
  }

  if (input.salesChannel === "whatsapp") {
    const chat = input.authorizedChatPhone?.trim();
    if (!chat) {
      return { ok: false, error: "Non autorisé.", httpStatus: 403 };
    }
    const access = await assertChatOwnsPayableOrder(chat, input.orderId);
    if (!access.ok) {
      return { ok: false, error: "Non autorisé.", httpStatus: 403 };
    }
  }

  if (order.status === "recue" && isPendingPaymentExpired(order.createdAt)) {
    await expirePendingOrder(input.orderId);
    return {
      ok: false,
      error: "Le délai de paiement a expiré. Reprenez votre commande.",
      httpStatus: 410,
    };
  }

  if (order.status !== "recue") {
    return {
      ok: false,
      error: "Cette commande a déjà été traitée.",
      httpStatus: 409,
    };
  }

  const momoPhone = input.paymentPhone?.trim() || order.client.phone;

  if (input.salesChannel === "whatsapp") {
    await getPrisma().order.update({
      where: { id: input.orderId },
      data: { salesChannel: "whatsapp" },
    });
  }

  if (isMockPaymentAllowed()) {
    const mock = await mockPayment(input.orderId, input.method, order.total);
    if (mock.status === "error") {
      return { ok: false, error: mock.message, httpStatus: 402 };
    }
    const confirmed = await confirmOrderPayment(input.orderId, mock.reference, {
      deviceKey: input.deviceKey ?? null,
    });
    if (!confirmed.ok) {
      return {
        ok: false,
        error: confirmed.error,
        httpStatus: confirmed.status,
      };
    }
    return {
      ok: true,
      status: "SUCCESS",
      reference: mock.reference,
      orderId: input.orderId,
    };
  }

  const config = getFeexPayConfig();
  if (!config) {
    return {
      ok: false,
      error: "Paiement indisponible pour le moment.",
      httpStatus: 503,
    };
  }

  const customerName = `${order.client.firstName} ${order.client.lastName}`.trim();
  const result = await initiateFeexPayPayment(
    {
      orderId: input.orderId,
      amount: order.total,
      customerPhone: momoPhone,
      customerName,
      paymentMethod: input.method,
    },
    config,
  );

  if (result.status === "FAILED") {
    return { ok: false, error: result.error, httpStatus: 402 };
  }

  const prisma = getPrisma();
  const existingAttempt = await prisma.paymentAttempt.findUnique({
    where: { reference: result.reference },
    select: { orderId: true, status: true },
  });

  if (existingAttempt) {
    if (existingAttempt.orderId !== input.orderId) {
      return {
        ok: false,
        error: "Référence de paiement déjà utilisée.",
        httpStatus: 409,
      };
    }
    if (existingAttempt.status !== "PENDING") {
      return {
        ok: false,
        error: "Cette tentative de paiement est close.",
        httpStatus: 409,
      };
    }
  } else {
    try {
      await prisma.paymentAttempt.create({
        data: {
          orderId: input.orderId,
          reference: result.reference,
          method: toPrismaPaymentMethod(input.method),
          amount: order.total,
          status: "PENDING",
        },
      });
    } catch {
      return {
        ok: false,
        error: "Paiement impossible à enregistrer. Réessayez.",
        httpStatus: 409,
      };
    }
  }

  if (result.status === "SUCCESS") {
    const settled = await settlePaymentByReference(result.reference);
    if (!settled.ok && settled.status !== 202) {
      return {
        ok: false,
        error: settled.error,
        httpStatus: settled.status,
      };
    }
    return {
      ok: true,
      status: "SUCCESS",
      reference: result.reference,
      orderId: input.orderId,
    };
  }

  return {
    ok: true,
    status: "PENDING",
    reference: result.reference,
    orderId: input.orderId,
    message: result.message,
    paymentUrl: result.paymentUrl,
  };
}
