import { normalizeBeninPhone } from "@/lib/crm/phone";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPrisma } from "@/lib/prisma";

import { hashOutboundBody } from "./inbound-queue";
import { prepareOutboundBody } from "./message-compose";

let cachedClient: import("@kapso/whatsapp-cloud-api").WhatsAppClient | null =
  null;

async function getClient() {
  const { WhatsAppClient } = await import("@kapso/whatsapp-cloud-api");
  const kapsoApiKey = process.env.KAPSO_API_KEY?.trim();
  if (!kapsoApiKey) return null;
  if (!cachedClient) {
    cachedClient = new WhatsAppClient({
      baseUrl: "https://api.kapso.ai/meta/whatsapp",
      kapsoApiKey,
    });
  }
  return cachedClient;
}

function phoneKey(raw: string): string {
  return normalizeBeninPhone(raw) ?? raw.replace(/\D/g, "").slice(-12);
}

/** Espacement entre 2 envois au même numéro — limite les flags Meta « spam ». */
async function respectOutboundSpacing(toPhone: string): Promise<void> {
  const key = phoneKey(toPhone);
  for (let i = 0; i < 4; i++) {
    const { allowed } = await checkRateLimit(
      `whatsapp:spacing:${key}`,
      1,
      1_400,
    );
    if (allowed) return;
    await new Promise((r) => setTimeout(r, 450));
  }
}

/** Plafond réponses bot par numéro (fenêtre glissante). */
async function outboundQuotaOk(toPhone: string): Promise<boolean> {
  const key = phoneKey(toPhone);
  const { allowed } = await checkRateLimit(
    `whatsapp:outbound:${key}`,
    12,
    5 * 60_000,
  );
  return allowed;
}

async function isDuplicateOutbound(toPhone: string, body: string): Promise<boolean> {
  const since = new Date(Date.now() - 90_000);
  const hash = hashOutboundBody(toPhone, body);
  try {
    const prisma = getPrisma();
    const dup = await prisma.whatsAppOutboundQueue.findFirst({
      where: {
        toPhone: phoneKey(toPhone),
        bodyHash: hash,
        createdAt: { gte: since },
        status: { in: ["pending", "sent"] },
      },
      select: { id: true },
    });
    return Boolean(dup);
  } catch {
    return false;
  }
}

async function rawKapsoSend(
  to: string,
  body: string,
  phoneNumberIdOverride?: string,
): Promise<void> {
  const client = await getClient();
  const phoneNumberId =
    phoneNumberIdOverride?.trim() ??
    process.env.KAPSO_PHONE_NUMBER_ID?.trim();

  if (!client || !phoneNumberId) {
    console.info("[whatsapp/kapso-dev-no-send]", {
      to,
      text: body.slice(0, 120),
    });
    return;
  }

  await client.messages.sendText({
    phoneNumberId,
    to,
    body: body.slice(0, 4096),
  });
}

function backoffMs(attempts: number): number {
  const steps = [8_000, 30_000, 90_000, 240_000];
  return steps[Math.min(attempts, steps.length - 1)] ?? 240_000;
}

export async function enqueueWhatsAppOutbound(input: {
  toPhone: string;
  body: string;
  phoneNumberId?: string;
}): Promise<void> {
  const body = input.body.trim();
  if (!body) return;

  const hash = hashOutboundBody(input.toPhone, body);
  try {
    const prisma = getPrisma();
    await prisma.whatsAppOutboundQueue.create({
      data: {
        toPhone: phoneKey(input.toPhone),
        body,
        phoneNumberId: input.phoneNumberId ?? null,
        bodyHash: hash,
        status: "pending",
      },
    });
  } catch (err) {
    console.warn("[whatsapp/outbound-queue]", err);
  }
}

/**
 * Envoi avec retry court + file d’attente si Kapso/réseau flaky.
 * Ne pas appeler en rafale — spacing intégré.
 */
export async function sendWhatsAppOutbound(input: {
  toPhone: string;
  body: string;
  phoneNumberId?: string;
  /** true = ne pas envoyer si même texte < 90s */
  dedupe?: boolean;
}): Promise<boolean> {
  const body = prepareOutboundBody(input.body);
  if (!body) return false;

  if (!(await outboundQuotaOk(input.toPhone))) {
    await enqueueWhatsAppOutbound(input);
    return false;
  }

  if (input.dedupe !== false && (await isDuplicateOutbound(input.toPhone, body))) {
    return true;
  }

  await respectOutboundSpacing(input.toPhone);

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await rawKapsoSend(input.toPhone, body, input.phoneNumberId);
      try {
        const prisma = getPrisma();
        await prisma.whatsAppOutboundQueue.create({
          data: {
            toPhone: phoneKey(input.toPhone),
            body,
            phoneNumberId: input.phoneNumberId ?? null,
            bodyHash: hashOutboundBody(input.toPhone, body),
            status: "sent",
          },
        });
      } catch {
        /* journal optionnel */
      }
      return true;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  console.error("[whatsapp/send]", lastErr);
  await enqueueWhatsAppOutbound(input);
  return false;
}

export async function drainWhatsAppOutboundQueue(limit = 20): Promise<number> {
  const prisma = getPrisma();
  const now = new Date();
  const rows = await prisma.whatsAppOutboundQueue.findMany({
    where: {
      status: "pending",
      nextAttemptAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  for (const row of rows) {
    const attempts = row.attempts + 1;
    try {
      if (!(await outboundQuotaOk(row.toPhone))) {
        await prisma.whatsAppOutboundQueue.update({
          where: { id: row.id },
          data: {
            nextAttemptAt: new Date(Date.now() + 60_000),
          },
        });
        continue;
      }
      await respectOutboundSpacing(row.toPhone);
      await rawKapsoSend(row.toPhone, row.body, row.phoneNumberId ?? undefined);
      await prisma.whatsAppOutboundQueue.update({
        where: { id: row.id },
        data: { status: "sent", lastError: null },
      });
    } catch (err) {
      const failed = attempts >= 6;
      await prisma.whatsAppOutboundQueue.update({
        where: { id: row.id },
        data: {
          status: failed ? "failed" : "pending",
          attempts,
          lastError: String(err).slice(0, 500),
          nextAttemptAt: new Date(Date.now() + backoffMs(attempts)),
        },
      });
    }
  }

  return rows.length;
}

export function isKapsoSendConfigured(): boolean {
  return Boolean(
    process.env.KAPSO_API_KEY?.trim() &&
      process.env.KAPSO_PHONE_NUMBER_ID?.trim(),
  );
}
