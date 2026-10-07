import { getPrisma } from "@/lib/prisma";



import type { BotIntent } from "./intents";



function phoneLast4(phone: string): string | null {

  const digits = phone.replace(/\D/g, "");

  if (digits.length < 4) return null;

  return digits.slice(-4);

}



/** Un seul insert par tour — ne bloque pas le webhook. */

export function logWhatsAppTurn(input: {

  phone: string;

  inboundText: string;

  replyText: string;

  intent?: BotIntent;

  tier?: string;

  usedLlm?: boolean;

  llmProvider?: string;

  kapsoMessageId?: string;

}): void {

  void persistTurn(input).catch((err) => console.warn("[whatsapp/log]", err));

}



async function persistTurn(input: {

  phone: string;

  inboundText: string;

  replyText: string;

  intent?: BotIntent;

  tier?: string;

  usedLlm?: boolean;

  llmProvider?: string;

  kapsoMessageId?: string;

}): Promise<void> {

  const prisma = getPrisma();

  await prisma.whatsAppBotLog.create({

    data: {

      direction: "outbound",

      phoneLast4: phoneLast4(input.phone),

      intent: input.intent,

      tier: input.tier,

      bodyPreview: input.inboundText.slice(0, 500),

      replyPreview: input.replyText.slice(0, 500),

      usedLlm: input.usedLlm ?? false,

      llmProvider: input.llmProvider,

      kapsoMessageId: input.kapsoMessageId,

    },

  });

}



export async function isWebhookAlreadyProcessed(
  idempotencyKey: string,
): Promise<boolean> {
  if (!idempotencyKey.trim()) return false;
  try {
    const prisma = getPrisma();
    const row = await prisma.whatsAppWebhookDedup.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    return Boolean(row);
  } catch {
    return true;
  }
}

/** Réserve la clé avant traitement — évite double exécution concurrente. */
export async function tryClaimWebhookIdempotencyKey(
  idempotencyKey: string,
  eventName: string | null,
): Promise<boolean> {
  if (!idempotencyKey.trim()) return true;
  try {
    const prisma = getPrisma();
    await prisma.whatsAppWebhookDedup.create({
      data: {
        idempotencyKey,
        eventName: eventName ?? undefined,
      },
    });
    return true;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code
        : "";
    if (code === "P2002") return false;
    console.warn("[whatsapp/dedup-claim]", err);
    return false;
  }
}



export async function isKapsoMessageAlreadyHandled(

  kapsoMessageId: string,

): Promise<boolean> {

  if (!kapsoMessageId.trim()) return false;

  try {

    const prisma = getPrisma();

    const row = await prisma.whatsAppBotLog.findFirst({

      where: { kapsoMessageId },

      select: { id: true },

    });

    return Boolean(row);

  } catch {

    return false;

  }

}



export async function markWebhookProcessed(

  idempotencyKey: string,

  eventName: string | null,

): Promise<void> {

  if (!idempotencyKey.trim()) return;

  try {

    const prisma = getPrisma();

    await prisma.whatsAppWebhookDedup.create({

      data: {

        idempotencyKey,

        eventName: eventName ?? undefined,

      },

    });

  } catch (err) {

    const code =

      err && typeof err === "object" && "code" in err

        ? (err as { code: string }).code

        : "";

    if (code !== "P2002") {

      console.warn("[whatsapp/dedup]", err);

    }

  }

}



export type WhatsAppBotDayStats = {

  total: number;

  llmCount: number;

  deterministicRate: number;

};



export async function getWhatsAppBotStatsToday(): Promise<WhatsAppBotDayStats> {

  const start = new Date();

  start.setHours(0, 0, 0, 0);

  try {

    const prisma = getPrisma();

    const whereBase = {

      direction: "outbound" as const,

      createdAt: { gte: start },

    };

    const [total, llmCount] = await Promise.all([

      prisma.whatsAppBotLog.count({ where: whereBase }),

      prisma.whatsAppBotLog.count({

        where: { ...whereBase, usedLlm: true },

      }),

    ]);

    const deterministicRate =

      total === 0 ? 100 : Math.round(((total - llmCount) / total) * 100);

    return { total, llmCount, deterministicRate };

  } catch {

    return { total: 0, llmCount: 0, deterministicRate: 100 };

  }

}


