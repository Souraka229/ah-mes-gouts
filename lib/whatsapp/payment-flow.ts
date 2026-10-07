import { normalizeBeninPhone, phoneSearchVariants } from "@/lib/crm/phone";
import { initiateOrderPayment } from "@/lib/payments/initiate-order-payment";
import { settlePaymentByReference } from "@/lib/payments/settle-payment";
import { getPrisma } from "@/lib/prisma";
import { isPendingPaymentExpired } from "@/lib/orders/payment-expiration";
import { getServerOrder } from "@/lib/server/order-repository";
import { SITE_URL } from "@/lib/seo/site";
import type { PaymentMethod } from "@/types/order";

import {
  assertChatOwnsPayableOrder,
  assertChatOwnsPaymentReference,
} from "./order-access";
import {
  clearPaySession,
  getPaySession,
  getSavedPayPhone,
  rememberPayPhone,
  savePaySession,
  type PaySessionState,
} from "./pay-session";
import type { OutboundWhatsAppReply } from "./process-message";
import {
  checkWhatsAppPaymentRateLimit,
} from "./rate-limit";
import { extractPaymentReferenceStrict } from "./security";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  mtn_momo: "MTN MoMo",
  moov_money: "Moov Money",
  celtiis_cash: "Celtiis Cash",
  card: "Carte Visa/Mastercard",
};

const GENERIC_DENIED =
  "Action non autorisée pour ce numéro. Vérifiez que vous payez votre propre commande.";

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function parsePaymentMethod(text: string): PaymentMethod | null {
  const t = normalizeText(text);
  if (t === "1" || /\b(mtn|momo)\b/.test(t)) return "mtn_momo";
  if (t === "2" || /\bmoov\b/.test(t)) return "moov_money";
  if (t === "3" || /\bceltiis\b/.test(t)) return "celtiis_cash";
  if (t === "4" || /\b(carte|visa|mastercard)\b/.test(t)) return "card";
  return null;
}

function isConfirm(text: string): boolean {
  const t = normalizeText(text);
  return /^(oui|yes|ok|confirmer|confirme|valide|valider|c est bon|cest bon)\b/.test(
    t,
  );
}

function isCancel(text: string): boolean {
  const t = normalizeText(text);
  return /^(annuler|annule|stop|cancel)\b/.test(t);
}

function isPaymentTrigger(text: string): boolean {
  const t = normalizeText(text);
  return /\b(payer|paiement|regler|mobile money|momo|feexpay|recu|reçu)\b/.test(
    t,
  );
}

function isPaidOnPhone(text: string): boolean {
  const t = normalizeText(text);
  return /\b(fait|valide|validé|j ai paye|j'ai paye|paye|payé)\b/.test(t);
}

async function findPayableOrder(chatPhone: string) {
  const prisma = getPrisma();
  const variants = phoneSearchVariants(chatPhone);
  const order = await prisma.order.findFirst({
    where: {
      clientPhone: { in: variants },
      status: "RECUE",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      total: true,
      createdAt: true,
      trackingToken: true,
      clientFirstName: true,
    },
  });
  if (!order) return null;
  if (isPendingPaymentExpired(order.createdAt)) return null;
  return order;
}

function reply(text: string, suppressSend = false): OutboundWhatsAppReply {
  return {
    text,
    deterministic: true,
    intent: "payment",
    tier: "assiste",
    suppressSend,
  };
}

export async function tryWhatsAppPaymentFlow(input: {
  fromPhone: string;
  text: string;
  phoneNumberId?: string;
}): Promise<OutboundWhatsAppReply | null> {
  const text = input.text.trim();
  const session = await getPaySession(input.fromPhone);
  const refFromText = extractPaymentReferenceStrict(text);

  const touchesPayment =
    Boolean(session && session.state !== "idle") ||
    isPaymentTrigger(text) ||
    parsePaymentMethod(text) ||
    Boolean(refFromText);

  if (touchesPayment && !(await checkWhatsAppPaymentRateLimit(input.fromPhone))) {
    return reply(
      "Trop de tentatives de paiement. Patientez une minute et réessayez.",
    );
  }

  if (refFromText && (!session || session.state === "idle")) {
    return verifyReferenceFlow(input.fromPhone, refFromText);
  }

  if (session && session.state !== "idle") {
    return continueSessionFlow(input, session.state, session);
  }

  if (isPaymentTrigger(text) || parsePaymentMethod(text)) {
    return startPaymentFlow(input.fromPhone);
  }

  return null;
}

async function startPaymentFlow(chatPhone: string): Promise<OutboundWhatsAppReply> {
  const order = await findPayableOrder(chatPhone);
  if (!order) {
    return reply(
      `Je ne vois pas de commande en attente de paiement sur ce numéro.\n\n` +
        `Passez d’abord commande sur ${SITE_URL}, puis revenez ici avec « payer ».`,
    );
  }

  const verifyLink =
    order.trackingToken != null
      ? `${SITE_URL}/suivi/${order.id}?t=${order.trackingToken}`
      : `${SITE_URL}/suivi/${order.id}`;

  await savePaySession(chatPhone, {
    state: "choose_method",
    orderId: order.id,
    amount: order.total,
  });

  const hi = order.clientFirstName?.trim()
    ? `${order.clientFirstName.trim()}, `
    : "";

  return reply(
    `${hi}commande ${order.id} · ${order.total.toLocaleString("fr-FR")} FCFA\n\n` +
      `Choisissez le paiement :\n` +
      `1 — MTN MoMo\n2 — Moov Money\n3 — Celtiis\n4 — Carte\n\n` +
      `Lien vérification : ${verifyLink}\n` +
      `(Répondez ANNULER pour quitter)`,
  );
}

async function continueSessionFlow(
  input: { fromPhone: string; text: string; phoneNumberId?: string },
  state: PaySessionState,
  session: NonNullable<Awaited<ReturnType<typeof getPaySession>>>,
): Promise<OutboundWhatsAppReply> {
  const text = input.text.trim();

  if (isCancel(text)) {
    await clearPaySession(input.fromPhone);
    return reply("Paiement annulé. Écrivez « payer » quand vous serez prête.");
  }

  if (session.orderId) {
    const access = await assertChatOwnsPayableOrder(
      input.fromPhone,
      session.orderId,
    );
    if (!access.ok) {
      await clearPaySession(input.fromPhone);
      if (access.reason === "forbidden") return reply(GENERIC_DENIED);
      return reply("Cette commande n’est plus payable. Recommencez sur le site.");
    }
    if (session.amount != null && session.amount !== access.total) {
      await savePaySession(input.fromPhone, {
        ...session,
        amount: access.total,
      });
    }
  }

  if (state === "choose_method") {
    const method = parsePaymentMethod(text);
    if (!method || !session.orderId) {
      return reply("Répondez 1, 2, 3 ou 4 pour choisir le mode de paiement.");
    }
    const saved = await getSavedPayPhone(input.fromPhone);
    await savePaySession(input.fromPhone, {
      ...session,
      state: "ask_pay_phone",
      method,
    });
    if (saved) {
      return reply(
        `Numéro ${METHOD_LABEL[method]} — répondez avec le numéro qui recevra la demande (ex. 0197310742),\n` +
          `ou tapez UTILISER pour ${saved.replace(/^\+229/, "0")}.`,
      );
    }
    return reply(
      `Numéro ${METHOD_LABEL[method]} — envoyez le numéro qui recevra la demande de paiement (10 chiffres, ex. 0197310742).`,
    );
  }

  if (state === "ask_pay_phone") {
    let payPhone: string | null = null;
    const t = normalizeText(text);
    if (t === "utiliser" || t === "meme" || t === "meme numero") {
      payPhone = (await getSavedPayPhone(input.fromPhone)) ?? input.fromPhone;
    } else {
      payPhone = normalizeBeninPhone(text);
      if (!payPhone) {
        return reply("Numéro invalide. Exemple : 0197310742");
      }
    }

    await savePaySession(input.fromPhone, {
      ...session,
      state: "confirm",
      payPhone,
    });
    const method = session.method as PaymentMethod;
    return reply(
      `Récapitulatif :\n` +
        `• ${session.amount?.toLocaleString("fr-FR") ?? "?"} FCFA\n` +
        `• ${METHOD_LABEL[method] ?? method}\n` +
        `• Numéro : ${payPhone}\n\n` +
        `Répondez OUI pour lancer le paiement.`,
    );
  }

  if (state === "confirm") {
    if (!isConfirm(text)) {
      return reply("Répondez OUI pour confirmer, ou ANNULER pour arrêter.");
    }
    if (!session.orderId || !session.method || !session.payPhone) {
      await clearPaySession(input.fromPhone);
      return reply("Session expirée. Recommencez avec « payer ».");
    }

    const access = await assertChatOwnsPayableOrder(
      input.fromPhone,
      session.orderId,
    );
    if (!access.ok) {
      await clearPaySession(input.fromPhone);
      return reply(GENERIC_DENIED);
    }

    const method = session.method as PaymentMethod;
    const result = await initiateOrderPayment({
      orderId: session.orderId,
      method,
      paymentPhone: session.payPhone,
      salesChannel: "whatsapp",
      authorizedChatPhone: input.fromPhone,
    });

    if (!result.ok) {
      return reply(`${result.error}\n\nRéessayez ou contactez-nous.`);
    }

    await rememberPayPhone(input.fromPhone, session.payPhone);

    if (result.status === "SUCCESS") {
      return reply("", true);
    }

    await savePaySession(input.fromPhone, {
      ...session,
      state: "waiting_operator",
      reference: result.reference,
    });

    const order = await getServerOrder(session.orderId);
    const verifyLink =
      order?.trackingToken != null
        ? `${SITE_URL}/suivi/${order.id}?t=${order.trackingToken}`
        : `${SITE_URL}/suivi/${session.orderId}`;

    let body =
      `Demande envoyée sur ${session.payPhone}.\n` +
      `${result.message ?? "Validez sur votre téléphone (USSD / notification)."}\n\n` +
      `Réf. ${result.reference}\n` +
      `Quand c’est fait, répondez OUI ou envoyez la référence.\n\n` +
      `Vérifier : ${verifyLink}`;

    if (result.paymentUrl) {
      body += `\n\nLien carte : ${result.paymentUrl}`;
    }

    return reply(body);
  }

  if (state === "waiting_operator") {
    const refCandidate =
      extractPaymentReferenceStrict(text) ?? session.reference ?? null;

    if (refCandidate && (isPaidOnPhone(text) || isConfirm(text) || refCandidate === session.reference)) {
      const owned = await assertChatOwnsPaymentReference(
        input.fromPhone,
        refCandidate,
      );
      if (!owned.ok) {
        return reply(GENERIC_DENIED);
      }
      if (session.reference && refCandidate !== session.reference) {
        return reply(GENERIC_DENIED);
      }

      const settled = await settlePaymentByReference(refCandidate);
      if (settled.ok) {
        return reply("", true);
      }
      if (settled.status === 202) {
        return reply(
          "Paiement pas encore confirmé par l’opérateur. Attendez quelques secondes et renvoyez OUI.",
        );
      }
      return reply(`${settled.error}\n\nRéessayez ou changez de mode (ANNULER puis « payer »).`);
    }

    return reply(
      "Dès que vous avez validé sur le téléphone, répondez OUI.\nVous pouvez aussi coller la référence de reçu (FP-…).",
    );
  }

  return reply("Écrivez « payer » pour régler une commande en attente.");
}

async function verifyReferenceFlow(
  chatPhone: string,
  reference: string,
): Promise<OutboundWhatsAppReply> {
  const owned = await assertChatOwnsPaymentReference(chatPhone, reference);
  if (!owned.ok) {
    return reply(
      owned.reason === "unknown_ref"
        ? "Référence inconnue. Vérifiez l’orthographe ou relancez « payer »."
        : GENERIC_DENIED,
    );
  }

  const settled = await settlePaymentByReference(reference.trim());
  if (settled.ok) {
    return reply("", true);
  }
  if (settled.status === 202) {
    return reply(
      "Référence reconnue, paiement encore en attente chez l’opérateur. Réessayez dans un instant.",
    );
  }
  return reply(
    `Impossible de valider cette référence pour le moment.\n` +
      `Écrivez « payer » pour relancer si besoin.`,
  );
}
