import {
  getFeexPayConfig,
  getFeexPayTransactionStatus,
} from "@/lib/payments/feexpay";
import { getServerOrder } from "@/lib/server/order-repository";

/**
 * Vérifie auprès de FeexPay + commande locale avant confirmation.
 * Ne fait jamais confiance au seul body webhook.
 */
export async function verifyFeexPayPaymentForOrder(input: {
  orderId: string;
  reference?: string;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const order = await getServerOrder(input.orderId);
  if (!order) {
    return { ok: false, error: "Commande introuvable.", status: 404 };
  }

  if (order.status !== "recue") {
    return { ok: false, error: "Commande déjà traitée.", status: 409 };
  }

  const reference = input.reference?.trim();
  if (!reference) {
    return {
      ok: false,
      error: "Référence FeexPay requise pour confirmer le paiement.",
      status: 400,
    };
  }

  const config = getFeexPayConfig();
  if (!config) {
    return {
      ok: false,
      error: "FeexPay non configuré.",
      status: 503,
    };
  }

  const tx = await getFeexPayTransactionStatus(reference, config);
  if (tx.status !== "SUCCESS") {
    return {
      ok: false,
      error: "Paiement non confirmé par FeexPay.",
      status: 409,
    };
  }

  const raw = tx.rawResponse as { amount?: number; montant?: number } | undefined;
  const paidAmount = Math.round(raw?.amount ?? raw?.montant ?? 0);
  if (paidAmount > 0 && paidAmount !== order.total) {
    return {
      ok: false,
      error: "Montant FeexPay incompatible avec la commande.",
      status: 409,
    };
  }

  return { ok: true };
}
