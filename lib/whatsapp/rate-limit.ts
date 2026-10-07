import { normalizeBeninPhone } from "@/lib/crm/phone";
import { checkRateLimit } from "@/lib/rate-limit";

export async function checkWhatsAppInboundRateLimit(
  chatPhone: string,
): Promise<boolean> {
  const key = normalizeBeninPhone(chatPhone) ?? chatPhone.replace(/\D/g, "").slice(-12);
  const { allowed } = await checkRateLimit(
    `whatsapp:inbound:${key}`,
    25,
    60_000,
  );
  return allowed;
}

export async function checkWhatsAppPaymentRateLimit(
  chatPhone: string,
): Promise<boolean> {
  const key = normalizeBeninPhone(chatPhone) ?? chatPhone.replace(/\D/g, "").slice(-12);
  const { allowed } = await checkRateLimit(
    `whatsapp:pay:${key}`,
    8,
    60_000,
  );
  return allowed;
}

export async function checkWhatsAppWebhookRateLimit(ip: string): Promise<boolean> {
  const { allowed } = await checkRateLimit(
    `whatsapp:webhook:${ip}`,
    120,
    60_000,
  );
  return allowed;
}
