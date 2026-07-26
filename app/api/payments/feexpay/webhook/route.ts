import { NextResponse } from "next/server";

import { confirmOrderPayment } from "@/lib/payments/confirm-order-payment";
import {
  verifyFeexPayPaymentForOrder,
  verifyFeexPayWebhookRequest,
} from "@/lib/payments/feexpay-webhook";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Webhook FeexPay — notification serveur à serveur.
 * URL : https://votre-domaine/api/payments/feexpay/webhook
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = await checkRateLimit(
    `feexpay:webhook:${ip}`,
    30,
    60_000,
  );

  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  if (!verifyFeexPayWebhookRequest(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      status?: string;
      custom_id?: string;
      reference?: string;
      callback_info?: { orderId?: string };
    };

    const orderId =
      body.callback_info?.orderId?.trim() ||
      body.custom_id?.trim() ||
      null;
    const reference = body.reference?.trim();
    const status = (body.status ?? "").toUpperCase();

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId manquant dans le webhook" },
        { status: 400 },
      );
    }

    if (
      status === "SUCCESS" ||
      status === "SUCCESSFUL" ||
      status === "APPROVED"
    ) {
      const verified = await verifyFeexPayPaymentForOrder({
        orderId,
        reference,
      });
      if (!verified.ok) {
        return NextResponse.json(
          { error: verified.error },
          { status: verified.status },
        );
      }

      const result = await confirmOrderPayment(orderId, reference);
      if (!result.ok && result.status !== 409) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }

      return NextResponse.json({
        received: true,
        orderId,
        status: "CONFIRMED",
      });
    }

    return NextResponse.json({
      received: true,
      orderId,
      status: "IGNORED",
    });
  } catch (error) {
    console.error("[FeexPay Webhook]", error);
    return NextResponse.json(
      { error: "Erreur traitement webhook" },
      { status: 500 },
    );
  }
}
