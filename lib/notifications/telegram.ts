/**
 * Alertes Telegram — jamais bloquant pour une commande.
 * Si le bot / le réseau échoue, on log et on continue.
 */

import { getPrisma } from "@/lib/prisma";

export type TelegramEventKind =
  | "order_new"
  | "order_high_value"
  | "stock_low"
  | "order_stale"
  | "security_alert"
  | "daily_summary";

/** Événements qui méritent un push Telegram vs Cockpit seulement */
export const TELEGRAM_PUSH_EVENTS: TelegramEventKind[] = [
  "order_new",
  "order_high_value",
  "stock_low",
  "order_stale",
  "security_alert",
  "daily_summary",
];

const HIGH_VALUE_THRESHOLD_FCFA = Number(
  process.env.TELEGRAM_HIGH_VALUE_FCFA ?? "25000",
);

export function getHighValueThreshold(): number {
  return Number.isFinite(HIGH_VALUE_THRESHOLD_FCFA)
    ? HIGH_VALUE_THRESHOLD_FCFA
    : 25000;
}

async function listActiveChatIds(): Promise<string[]> {
  const fromEnv = process.env.TELEGRAM_CHAT_IDS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const prisma = getPrisma();
    const rows = await prisma.telegramSubscriber.findMany({
      where: { isActive: true },
      select: { chatId: true },
    });
    const fromDb = rows.map((r) => r.chatId);
    return [...new Set([...(fromEnv ?? []), ...fromDb])];
  } catch {
    return fromEnv ?? [];
  }
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token?.trim()) return false;

  try {
    const chatIds = await listActiveChatIds();
    if (chatIds.length === 0) return false;

    const results = await Promise.allSettled(
      chatIds.map(async (chatId) => {
        const res = await fetch(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              disable_web_page_preview: true,
            }),
          },
        );
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`Telegram ${res.status}: ${body.slice(0, 200)}`);
        }
      }),
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error("[telegram] partial failure", failed.length);
    }
    return failed.length < results.length;
  } catch (err) {
    console.error("[telegram] send failed", err);
    return false;
  }
}

/** Fire-and-forget — ne remonte jamais d'erreur au caller. */
export function notifyTelegramSafe(text: string): void {
  void sendTelegramMessage(text).catch((err) => {
    console.error("[telegram] notifySafe", err);
  });
}

export function formatNewOrderAlert(input: {
  orderId: string;
  total: number;
  mode: string;
  clientName: string;
}): string {
  const high =
    input.total >= getHighValueThreshold()
      ? `\n⭐ Commande importante (≥ ${getHighValueThreshold().toLocaleString("fr-FR")} F)`
      : "";
  return [
    `🆕 Nouvelle commande #${input.orderId}`,
    `${input.clientName} · ${input.mode}`,
    `${input.total.toLocaleString("fr-FR")} FCFA${high}`,
  ].join("\n");
}

export function formatSecurityAlert(detail: string): string {
  return `🔐 Alerte sécurité\n${detail}`;
}

export function formatDailySummary(input: {
  revenue: number;
  orders: number;
  visitors: number;
  alerts: number;
}): string {
  return [
    `📊 Résumé du jour — Gift & ENTREMETS`,
    `CA : ${input.revenue.toLocaleString("fr-FR")} FCFA`,
    `Commandes : ${input.orders}`,
    `Visiteurs uniques : ${input.visitors}`,
    `Alertes ops : ${input.alerts}`,
  ].join("\n");
}

export async function linkTelegramChat(
  chatId: string,
  label = "",
): Promise<void> {
  const prisma = getPrisma();
  await prisma.telegramSubscriber.upsert({
    where: { chatId },
    create: {
      chatId,
      label: label.trim() || "Cheffe",
      isActive: true,
    },
    update: {
      label: label.trim() || undefined,
      isActive: true,
      updatedAt: new Date(),
    },
  });
}

/** Deep link pour que la cheffe lie son Telegram sans intervention technique. */
export function buildTelegramConnectUrl(linkToken: string): string | null {
  const bot = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  if (!bot) return null;
  return `https://t.me/${bot}?start=${encodeURIComponent(linkToken)}`;
}
