import { getPrisma } from "@/lib/prisma";

import { getWhatsAppBotStatsToday } from "@/lib/whatsapp/bot-log";
import { getBoutiqueSettings } from "@/lib/server/site-settings-repository";

export type WhatsAppLogRow = {
  id: string;
  direction: string;
  phoneLast4: string | null;
  intent: string | null;
  tier: string | null;
  bodyPreview: string;
  replyPreview: string | null;
  usedLlm: boolean;
  llmProvider: string | null;
  createdAt: Date;
};

export async function getWhatsAppAdminPanelData(limit = 40): Promise<{
  logs: WhatsAppLogRow[];
  stats: Awaited<ReturnType<typeof getWhatsAppBotStatsToday>>;
  kapsoInboxUrl: string | null;
  pendingWhatsappPayments: number;
  inboundQueuePending: number;
  outboundQueuePending: number;
  whatsappBotEnabled: boolean;
  whatsappBotPausedMessage: string;
}> {
  const stats = await getWhatsAppBotStatsToday();
  const boutique = await getBoutiqueSettings().catch(() => null);
  let pendingWhatsappPayments = 0;
  let inboundQueuePending = 0;
  let outboundQueuePending = 0;
  const kapsoInboxUrl =
    process.env.KAPSO_INBOX_URL?.trim() ||
    (process.env.KAPSO_PROJECT_SLUG?.trim()
      ? `https://app.kapso.ai/inbox`
      : null);

  try {
    const prisma = getPrisma();
    const logs = await prisma.whatsAppBotLog.findMany({
      where: { direction: "outbound" },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const [payPending, inQ, outQ] = await Promise.all([
      prisma.order.count({
        where: { salesChannel: "whatsapp", status: "RECUE" },
      }),
      prisma.whatsAppInboundQueue.count({ where: { status: "pending" } }),
      prisma.whatsAppOutboundQueue.count({ where: { status: "pending" } }),
    ]);
    pendingWhatsappPayments = payPending;
    inboundQueuePending = inQ;
    outboundQueuePending = outQ;
    return {
      logs,
      stats,
      kapsoInboxUrl,
      pendingWhatsappPayments,
      inboundQueuePending,
      outboundQueuePending,
      whatsappBotEnabled: boutique?.whatsappBotEnabled !== false,
      whatsappBotPausedMessage: boutique?.whatsappBotPausedMessage ?? "",
    };
  } catch {
    return {
      logs: [],
      stats,
      kapsoInboxUrl,
      pendingWhatsappPayments: 0,
      inboundQueuePending: 0,
      outboundQueuePending: 0,
      whatsappBotEnabled: boutique?.whatsappBotEnabled !== false,
      whatsappBotPausedMessage: boutique?.whatsappBotPausedMessage ?? "",
    };
  }
}
