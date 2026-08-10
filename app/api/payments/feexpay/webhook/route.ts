import { NextResponse } from "next/server";

import { confirmOrderPayment } from "@/lib/payments/confirm-order-payment";
import { verifyFeexPayPaymentForOrder } from "@/lib/payments/feexpay-webhook";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Webhook FeexPay — notification serveur à serveur.
 * URL : https://votre-domaine/api/payments/feexpay/webhook
 *
 * FeexPay n'envoie ni secret ni signature avec ses webhooks (confirmé dans
 * leur doc officielle — aucun mécanisme d'auth documenté). La sécurité vient
 * de la ré-vérification : on ne fait jamais confiance au body du webhook,
 * on revérifie toujours le statut via l'API FeexPay avant de confirmer un
 * paiement (verifyFeexPayPaymentForOrder). Le rate-limit reste actif contre
 * le spam/abus de l'URL.
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

  try {
    // Forme réelle du payload FeexPay (doc officielle, section Webhook) :
    // { reference, order_id, status, amount, callback_info (string), ... }
    const body = (await request.json().catch(() => ({}))) as {
      status?: string;
      order_id?: string;
      custom_id?: string;
      reference?: string;
      callback_info?: string;
    };

    const orderId =
      body.order_id?.trim() ||
      body.callback_info?.trim() ||
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
