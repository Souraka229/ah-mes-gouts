import type { Prisma } from "@prisma/client";

import { alertSecurity, notifyOps } from "@/lib/notifications/ops-alerts";
import {
  getFeexPayConfig,
  getFeexPayTransactionStatus,
} from "@/lib/payments/feexpay";
import { confirmOrderPayment } from "@/lib/payments/confirm-order-payment";
import { getPrisma } from "@/lib/prisma";

export type SettleResult =
  | { ok: true; orderId: string; alreadySettled?: boolean }
  | { ok: false; error: string; status: number };

/**
 * Extrait le montant encaissé de la réponse FeexPay.
 * FeexPay n'a pas de champ documenté stable ici — on tente les variantes
 * connues, et on renvoie null si aucune n'est présente (cas traité plus bas).
 */
function extractPaidAmount(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  for (const key of ["amount", "montant", "amount_paid", "amountPaid"]) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.round(value);
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return Math.round(parsed);
    }
  }
  return null;
}

/**
 * Point d'entrée UNIQUE de toute confirmation de paiement.
 *
 * Webhook FeexPay, polling client et cron de réconciliation passent tous par
 * ici. Aucune autre fonction n'appelle confirmOrderPayment() — c'est ce qui
 * garantit que les trois chemins ont exactement le même niveau de vérification.
 *
 * Sécurité, dans l'ordre :
 *  1. La référence doit correspondre à une tentative connue en base (anti-rejeu :
 *     une référence empruntée à une autre commande n'existe pas ici).
 *  2. Une tentative déjà réglée ne se rejoue pas (idempotence).
 *  3. Le statut vient de l'API FeexPay, jamais du body du webhook.
 *  4. Le montant est comparé à celui figé à l'initiation.
 */
export async function settlePaymentByReference(
  reference: string,
): Promise<SettleResult> {
  const prisma = getPrisma();
  const trimmed = reference.trim();

  if (!trimmed) {
    return { ok: false, error: "Référence requise.", status: 400 };
  }

  const attempt = await prisma.paymentAttempt.findUnique({
    where: { reference: trimmed },
  });

  if (!attempt) {
    // Référence inconnue : soit inventée, soit empruntée à une autre boutique.
    // C'était exactement le vecteur du contournement — il s'arrête ici.
    return {
      ok: false,
      error: "Référence de paiement inconnue.",
      status: 404,
    };
  }

  if (attempt.status === "SUCCESS") {
    return { ok: true, orderId: attempt.orderId, alreadySettled: true };
  }

  if (attempt.status === "FAILED" || attempt.status === "EXPIRED") {
    return {
      ok: false,
      error: "Cette tentative de paiement est close.",
      status: 409,
    };
  }

  const config = getFeexPayConfig();
  if (!config) {
    return { ok: false, error: "FeexPay non configuré.", status: 503 };
  }

  const tx = await getFeexPayTransactionStatus(trimmed, config);
  const rawResponse = (tx.rawResponse ?? {}) as Prisma.InputJsonValue;

  if (tx.status === "PENDING") {
    return { ok: false, error: "Paiement encore en attente.", status: 202 };
  }

  if (tx.status === "FAILED") {
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "FAILED",
        settledAt: new Date(),
        failureReason: tx.error ?? "Refusé par l'opérateur",
        lastRawResponse: rawResponse,
      },
    });
    return {
      ok: false,
      error: tx.error ?? "Paiement refusé par l'opérateur.",
      status: 402,
    };
  }

  // Contrôle de montant.
  //
  // Montant présent et différent : on bloque, sans appel — c'est une fraude ou
  // un bug grave, jamais un cas normal.
  //
  // Montant absent : on confirme quand même, mais on alerte. Le format exact de
  // la réponse FeexPay n'est pas garanti, et refuser ici bloquerait des
  // paiements légitimes. Ce repli est acceptable *parce que* la liaison
  // référence ↔ commande ci-dessus a déjà fermé le rejeu : sans elle, une
  // référence quelconque suffisait à créditer n'importe quelle commande.
  // À durcir dès qu'un payload réel de production aura été capturé.
  const paidAmount = extractPaidAmount(tx.rawResponse);

  if (paidAmount !== null && paidAmount !== attempt.amount) {
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "FAILED",
        settledAt: new Date(),
        failureReason: `Montant encaissé ${paidAmount} ≠ attendu ${attempt.amount}`,
        lastRawResponse: rawResponse,
      },
    });
    notifyOps(alertSecurity(
        `Montant FeexPay incohérent — commande ${attempt.orderId} : ` +
          `${paidAmount} FCFA encaissés pour ${attempt.amount} FCFA attendus. ` +
          `Paiement NON confirmé.`,
      ),
    );
    return { ok: false, error: "Montant de paiement incohérent.", status: 409 };
  }

  if (paidAmount === null) {
    notifyOps(alertSecurity(
        `Montant absent de la réponse FeexPay — commande ${attempt.orderId} ` +
          `(${attempt.amount} FCFA attendus). Confirmée sur la référence seule : ` +
          `à vérifier sur le tableau de bord FeexPay.`,
      ),
    );
  }

  const confirmed = await confirmOrderPayment(attempt.orderId, trimmed);
  if (!confirmed.ok) {
    // On ne marque PAS la tentative en échec : l'argent est bien encaissé.
    // Le cron la reprendra, et l'alerte fait remonter le cas à l'équipe.
    notifyOps(alertSecurity(
        `Paiement encaissé mais commande non confirmée — ${attempt.orderId} : ` +
          `${confirmed.error}. Intervention manuelle requise.`,
      ),
    );
    return confirmed;
  }

  await prisma.paymentAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "SUCCESS",
      settledAt: new Date(),
      lastRawResponse: rawResponse,
    },
  });

  return { ok: true, orderId: attempt.orderId };
}
