import { NextResponse } from "next/server";
import { z } from "zod";

import { confirmOrderPayment } from "@/lib/payments/confirm-order-payment";
import {
  getFeexPayConfig,
  initiateFeexPayPayment,
  isMockPaymentAllowed,
} from "@/lib/payments/feexpay";
import { settlePaymentByReference } from "@/lib/payments/settle-payment";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { toPrismaPaymentMethod } from "@/lib/server/order-mapper";
import {
  expirePendingOrder,
  getServerOrder,
} from "@/lib/server/order-repository";
import { isPendingPaymentExpired } from "@/lib/orders/payment-expiration";
import type { PaymentMethod } from "@/types/order";

// FeexPay (surtout en sandbox) peut être lent à répondre. Sans ceci, la limite
// par défaut de la plateforme (10s) peut tuer la fonction avant même que notre
// propre try/catch ait la main — ce qui produit un 502 brut malgré le code.
export const maxDuration = 30;

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

  // Tout le reste peut appeler des services externes (FeexPay, Prisma, notifications) —
  // on ne laisse jamais une exception inattendue remonter en 500/502 brut au client.
  try {
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
      console.error(
        `[payments/initiate] FeexPay FAILED — orderId=${orderId} method=${method}:`,
        result.error,
      );
      return NextResponse.json({ error: result.error }, { status: 402 });
    }

    // La tentative est enregistrée AVANT toute confirmation possible.
    // Le @unique sur `reference` est la garantie anti-rejeu : elle vit au
    // niveau base, pas dans une vérification applicative contournable.
    // `amount` est figé ici depuis le total serveur.
    const existingAttempt = await getPrisma().paymentAttempt.findUnique({
      where: { reference: result.reference },
      select: { orderId: true, status: true },
    });

    if (existingAttempt) {
      // Une référence déjà rattachée à une AUTRE commande : c'est exactement
      // le scénario de rejeu. On refuse, toujours.
      if (existingAttempt.orderId !== orderId) {
        console.error(
          `[payments/initiate] référence ${result.reference} déjà liée à ${existingAttempt.orderId}`,
        );
        return NextResponse.json(
          { error: "Référence de paiement déjà utilisée." },
          { status: 409 },
        );
      }

      // Même commande : FeexPay renvoie une référence de repli déterministe
      // (`FP-<orderId>`) quand il n'en fournit pas. Une seconde tentative sur
      // la même commande doit rester possible — sinon la cliente est bloquée.
      if (existingAttempt.status !== "PENDING") {
        return NextResponse.json(
          { error: "Cette tentative de paiement est close." },
          { status: 409 },
        );
      }
    } else {
      try {
        await getPrisma().paymentAttempt.create({
          data: {
            orderId,
            reference: result.reference,
            method: toPrismaPaymentMethod(method),
            amount: order.total,
            status: "PENDING",
          },
        });
      } catch (error) {
        console.error("[payments/initiate] tentative non enregistrée:", error);
        return NextResponse.json(
          { error: "Paiement impossible à enregistrer. Réessayez." },
          { status: 409 },
        );
      }
    }

    if (result.status === "SUCCESS") {
      const settled = await settlePaymentByReference(result.reference);
      if (!settled.ok) {
        return NextResponse.json(
          { error: settled.error },
          { status: settled.status === 202 ? 200 : settled.status },
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
  } catch (error) {
    console.error("[payments/initiate] POST échoué:", error);
    return NextResponse.json(
      {
        error:
          "Le paiement n'a pas pu être traité pour le moment. Réessayez dans un instant.",
      },
      { status: 500 },
    );
  }
}

/**
 * Poll du statut de paiement.
 *
 * `orderId` n'est PLUS un paramètre : c'est lui qui rendait le contournement
 * possible. Tant que l'appelant choisit la commande à créditer, aucune
 * vérification en aval ne peut rattraper le problème. La commande est
 * désormais déduite de la tentative liée à la référence.
 */
export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference")?.trim();

  if (!reference) {
    return NextResponse.json({ error: "reference requise" }, { status: 400 });
  }

  // Cette route n'avait aucun rate-limit.
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = await checkRateLimit(
    `payments:status:${ip}`,
    60,
    60_000,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  try {
    if (isMockPaymentAllowed()) {
      return NextResponse.json({ status: "SUCCESS", reference });
    }

    const settled = await settlePaymentByReference(reference);

    if (settled.ok) {
      return NextResponse.json({
        status: "SUCCESS",
        reference,
        orderId: settled.orderId,
      });
    }

    if (settled.status === 202) {
      return NextResponse.json({ status: "PENDING", reference });
    }

    if (settled.status === 402) {
      return NextResponse.json({
        status: "FAILED",
        reference,
        error: settled.error,
      });
    }

    return NextResponse.json(
      { error: settled.error },
      { status: settled.status },
    );
  } catch (error) {
    console.error("[payments/initiate] GET échoué:", error);
    return NextResponse.json(
      {
        error: "Statut de paiement indisponible pour le moment.",
        status: "PENDING",
      },
      { status: 200 },
    );
  }
}
