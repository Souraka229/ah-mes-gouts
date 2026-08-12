import { NextResponse } from "next/server";

import { settlePaymentByReference } from "@/lib/payments/settle-payment";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Webhook FeexPay — notification serveur à serveur.
 * URL : https://votre-domaine/api/payments/feexpay/webhook
 *
 * FeexPay n'envoie ni secret ni signature avec ses webhooks (confirmé dans
 * leur doc officielle — aucun mécanisme d'auth documenté). La sécurité ne
 * vient donc jamais du body : on ne lit que la référence, et
 * settlePaymentByReference() revérifie tout auprès de l'API FeexPay avant de
 * confirmer quoi que ce soit. Le rate-limit reste actif contre le spam d'URL.
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

    const reference = body.reference?.trim();
    const status = (body.status ?? "").toUpperCase();

    // La référence est la seule donnée du webhook qui compte : elle sert à
    // retrouver la tentative en base. `order_id` et `callback_info` ne sont
    // plus lus du tout — la commande est déduite de la tentative, jamais
    // dictée par l'appelant.
    if (!reference) {
      return NextResponse.json(
        { error: "reference manquante dans le webhook" },
        { status: 400 },
      );
    }

    if (
      status === "SUCCESS" ||
      status === "SUCCESSFUL" ||
      status === "APPROVED"
    ) {
      const result = await settlePaymentByReference(reference);

      // 409 = déjà traitée, 202 = encore en attente côté FeexPay.
      // Dans les deux cas le webhook a bien été reçu : répondre 200 évite
      // des retries inutiles.
      if (!result.ok && result.status !== 409 && result.status !== 202) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status },
        );
      }

      return NextResponse.json({
        received: true,
        status: result.ok ? "CONFIRMED" : "PENDING",
      });
    }

    return NextResponse.json({ received: true, status: "IGNORED" });
  } catch (error) {
    console.error("[FeexPay Webhook]", error);
    return NextResponse.json(
      { error: "Erreur traitement webhook" },
      { status: 500 },
    );
  }
}
