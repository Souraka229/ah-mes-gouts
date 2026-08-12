import { NextResponse } from "next/server";

import { notifyTelegramSafe } from "@/lib/notifications/telegram";
import { settlePaymentByReference } from "@/lib/payments/settle-payment";
import { getPrisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** On laisse au webhook et au polling client le temps de faire leur travail. */
const MIN_AGE_MS = 2 * 60_000;
/** Au-delà : on ferme la tentative et on alerte — traitement manuel. */
const MAX_AGE_MS = 120 * 60_000;
const BATCH_SIZE = 50;

/**
 * Réconciliation des paiements — le filet qui empêche de perdre de l'argent.
 *
 * Une validation USSD Mobile Money dépasse régulièrement les ~112 s du polling
 * client, et FeexPay ne garantit aucun retry de webhook. Sans ce cron, la
 * commande expirait en ANNULEE alors que la cliente avait bien payé.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!secret?.trim()) {
      return NextResponse.json(
        { error: "CRON_SECRET non configuré en production" },
        { status: 503 },
      );
    }
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  } else if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const prisma = getPrisma();
  const now = Date.now();

  try {
    const pending = await prisma.paymentAttempt.findMany({
      where: {
        status: "PENDING",
        initiatedAt: {
          lte: new Date(now - MIN_AGE_MS),
          gte: new Date(now - MAX_AGE_MS),
        },
      },
      orderBy: { initiatedAt: "asc" },
      take: BATCH_SIZE,
      select: { reference: true, amount: true },
    });

    let recovered = 0;
    let failed = 0;

    for (const attempt of pending) {
      try {
        const result = await settlePaymentByReference(attempt.reference);

        if (result.ok && !result.alreadySettled) {
          recovered += 1;
          // Une commande rattrapée aurait été perdue. La cheffe doit le savoir :
          // la cliente attend peut-être depuis vingt minutes.
          notifyTelegramSafe(
            `💰 Paiement rattrapé — commande ${result.orderId}\n` +
              `${formatPrice(attempt.amount)} confirmés par réconciliation ` +
              `(pas par le webhook). À préparer.`,
          );
        } else if (!result.ok && result.status === 402) {
          failed += 1;
        }
      } catch (error) {
        console.error(
          `[cron/reconcile-payments] ${attempt.reference} échouée:`,
          error,
        );
      }
    }

    // Au-delà de 2 h sans réponse : on ferme et on alerte, rien ne traîne.
    const stale = await prisma.paymentAttempt.updateMany({
      where: {
        status: "PENDING",
        initiatedAt: { lt: new Date(now - MAX_AGE_MS) },
      },
      data: {
        status: "EXPIRED",
        settledAt: new Date(),
        failureReason: "Aucune réponse FeexPay sous 2 h",
      },
    });

    if (stale.count > 0) {
      notifyTelegramSafe(
        `⚠️ ${stale.count} tentative(s) de paiement sans réponse depuis 2 h — ` +
          `à vérifier sur le tableau de bord FeexPay.`,
      );
    }

    return NextResponse.json({
      ok: true,
      checked: pending.length,
      recovered,
      failed,
      expired: stale.count,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Réconciliation échouée";
    console.error("[cron/reconcile-payments]", message, error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
