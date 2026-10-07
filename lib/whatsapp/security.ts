import { phonesMatch } from "@/lib/crm/phone";

export const WHATSAPP_INBOUND_TEXT_MAX = 2000;

export function clampInboundText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= WHATSAPP_INBOUND_TEXT_MAX) return trimmed;
  return trimmed.slice(0, WHATSAPP_INBOUND_TEXT_MAX);
}

/** En production, refuser tout webhook non signé si le secret Kapso est requis. */
export function kapsoWebhookSecretConfigured(): boolean {
  return Boolean(
    process.env.KAPSO_WEBHOOK_SECRET?.trim() ||
      process.env.WEBHOOK_SECRET?.trim(),
  );
}

export function requireKapsoWebhookSecretInProduction(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return kapsoWebhookSecretConfigured();
}

export function isAllowedKapsoPhoneNumberId(
  payloadPhoneNumberId: string | undefined,
): boolean {
  const expected = process.env.KAPSO_PHONE_NUMBER_ID?.trim();
  if (!expected || !payloadPhoneNumberId) return true;
  return payloadPhoneNumberId.trim() === expected;
}

/**
 * Anti-usurpation : si Meta/Kapso envoie `from` et `conversation.phone_number`,
 * ils doivent désigner le même abonné.
 */
export function inboundPhonesConsistent(
  conversationPhone: string | undefined,
  messageFrom: string | undefined,
): boolean {
  const a = conversationPhone?.trim();
  const b = messageFrom?.trim();
  if (!a || !b) return true;
  return phonesMatch(a, b);
}

/** Références FeexPay / mock — pas de motif hex générique (énumération). */
export function extractPaymentReferenceStrict(text: string): string | null {
  const raw = text.trim();
  if (raw.length > 120) return null;
  const fp = raw.match(/\b(FP-[A-Za-z0-9-]{4,64}|MOCK-[A-Za-z0-9-]{4,96})\b/i);
  return fp ? fp[1] : null;
}
