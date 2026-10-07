import { normalizeBeninPhone } from "@/lib/crm/phone";

import { getWhatsAppCustomerContext } from "./customer-context";
import { getOrderDraft } from "./order-draft";
import { getPaySession } from "./pay-session";
import { detectIntent, type BotIntent } from "./intents";
import type { OutboundWhatsAppReply } from "./process-message";
import {
  siteHabitueGuidanceForIntent,
  isExplicitWhatsAppOrderTrigger,
  isWhatsAppPaymentOrStatusTrigger,
} from "./replies";

/**
 * Clientes déjà habituées au site : réponses courtes, sans LLM,
 * tant qu'elles ne sont pas dans un flux commande/paiement WhatsApp actif.
 */
export async function trySiteHabitueQuietLane(input: {
  fromPhone: string;
  text: string;
}): Promise<OutboundWhatsAppReply | null> {
  const paySession = await getPaySession(input.fromPhone);
  if (paySession && paySession.state !== "idle") {
    return null;
  }

  const draft = await getOrderDraft(input.fromPhone);
  if (draft) {
    return null;
  }

  const text = input.text.trim();
  if (isExplicitWhatsAppOrderTrigger(text) || isWhatsAppPaymentOrStatusTrigger(text)) {
    return null;
  }

  const phone = normalizeBeninPhone(input.fromPhone) ?? input.fromPhone;
  const tierInfo = await getWhatsAppCustomerContext(phone);
  if (tierInfo.tier !== "site_habitue") {
    return null;
  }

  const intent = detectIntent(text);
  if (intent === "order_status") {
    return null;
  }

  const guidance = siteHabitueGuidanceForIntent(intent, tierInfo.firstName);
  if (!guidance) {
    return null;
  }

  return {
    text: guidance,
    deterministic: true,
    intent: intent as BotIntent,
    tier: "site_habitue",
  };
}
