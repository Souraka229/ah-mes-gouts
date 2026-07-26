import { NextResponse } from "next/server";
import { z } from "zod";

import { confirmOrderPayment } from "@/lib/payments/confirm-order-payment";
import {
  getFeexPayConfig,
  getFeexPayTransactionStatus,
  initiateFeexPayPayment,
  isMockPaymentAllowed,
} from "@/lib/payments/feexpay";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  expirePendingOrder,
  getServerOrder,
} from "@/lib/server/order-repository";
import { isPendingPaymentExpired } from "@/lib/orders/payment-expiration";
import type { PaymentMethod } from "@/types/order";

const bodySchema = z.object({
  orderId: z.string().min(1),
  method: z.enum(["mtn_momo", "moov_money", "celtiis_cash", "card"]),
});

async function mockPayment(
  orderId: string,
  method: PaymentMethod,
  amount: number,
): Promise<
  | { status: "SUCCESS"; reference: string }
  | { status: "error"; message: string }
> {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  if (amount <= 0) {
    return { status: "error", message: "Montant invalide." };
  }

  if (method === "card" && amount > 50000) {
    return {
      status: "error",
      message:
        "Paiement refusé par la banque. Réessayez ou choisissez Mobile Money.",
    };
  }

  return {
    status: "SUCCESS",
    reference: `MOCK-${orderId}-${Date.now()}`,
  };
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = await checkRateLimit(
    `payments:initiate:${ip}`,
    10,
    60_000,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques instants." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const { orderId, method } = parsed.data;
  const order = await getServerOrder(orderId);

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  if (
    order.status === "recue" &&
    isPendingPaymentExpired(order.createdAt)
  ) {
    await expirePendingOrder(orderId);
    return NextResponse.json(
      {
        error:
          "Le délai de paiement a expiré. Veuillez reprendre votre commande.",
      },
      { status: 410 },
    );
  }

  if (order.status !== "recue") {
    return NextResponse.json(
      { error: "Cette commande a déjà été traitée." },
      { status: 409 },
    );
  }

  const deviceKey = request.headers.get("x-amg-device-key")?.trim() || null;

  if (isMockPaymentAllowed()) {
    const mock = await mockPayment(orderId, method, order.total);
    if (mock.status === "error") {
      return NextResponse.json({ error: mock.message }, { status: 402 });
    }

    const confirmed = await confirmOrderPayment(orderId, mock.reference, {
      deviceKey,
    });
    if (!confirmed.ok) {
      return NextResponse.json(
        { error: confirmed.error },
        { status: confirmed.status },
      );
    }

    return NextResponse.json({
      status: "SUCCESS",
      reference: mock.reference,
      orderId,
    });
  }

  const config = getFeexPayConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Configuration FeexPay incomplète." },
      { status: 503 },
    );
  }

  const customerName = `${order.client.firstName} ${order.client.lastName}`.trim();
  const result = await initiateFeexPayPayment(
    {
      orderId,
      amount: order.total,
      customerPhone: order.client.phone,
      customerName,
      paymentMethod: method,
    },
    config,
  );

  if (result.status === "FAILED") {
    return NextResponse.json({ error: result.error }, { status: 402 });
  }

  if (result.status === "SUCCESS") {
    const confirmed = await confirmOrderPayment(orderId, result.reference, {
      deviceKey,
    });
    if (!confirmed.ok) {
      return NextResponse.json(
        { error: confirmed.error },
        { status: confirmed.status },
      );
    }

    return NextResponse.json({
      status: "SUCCESS",
      reference: result.reference,
      orderId,
    });
  }

  return NextResponse.json({
    status: "PENDING",
    reference: result.reference,
    message: result.message,
    paymentUrl: result.paymentUrl,
    orderId,
  });
}

/** Poll statut FeexPay et confirme la commande si SUCCESS. */
export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference")?.trim();
  const orderId = new URL(request.url).searchParams.get("orderId")?.trim();

  if (!reference || !orderId) {
    return NextResponse.json(
      { error: "reference et orderId requis" },
      { status: 400 },
    );
  }

  if (isMockPaymentAllowed()) {
    return NextResponse.json({ status: "SUCCESS", reference, orderId });
  }

  const config = getFeexPayConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Configuration FeexPay incomplète." },
      { status: 503 },
    );
  }

  const txStatus = await getFeexPayTransactionStatus(reference, config);

  if (txStatus.status === "PENDING") {
    return NextResponse.json({
      status: "PENDING",
      reference,
      orderId,
    });
  }

  if (txStatus.status === "FAILED") {
    return NextResponse.json({
      status: "FAILED",
      reference,
      orderId,
      error: txStatus.error,
    });
  }

  const deviceKey = request.headers.get("x-amg-device-key")?.trim() || null;
  const confirmed = await confirmOrderPayment(orderId, reference, { deviceKey });

  if (!confirmed.ok) {
    return NextResponse.json(
      { error: confirmed.error, status: txStatus.status },
      { status: confirmed.status },
    );
  }

  return NextResponse.json({
    status: "SUCCESS",
    reference,
    orderId,
  });
}
