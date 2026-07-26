import { createHash } from "crypto";
import { NextResponse } from "next/server";

import { linkTelegramChat, sendTelegramMessage } from "@/lib/notifications/telegram";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function expectedLinkPayload(): string {
  const secret =
    process.env.TELEGRAM_LINK_SECRET?.trim() ||
    createHash("sha256")
      .update(process.env.TELEGRAM_BOT_TOKEN ?? "")
      .digest("hex")
      .slice(0, 24);
  return `link_${secret}`;
}

/**
 * Webhook Telegram Bot API — /start link_<secret> lie le chat de la cheffe.
 * Répond toujours 200 (sauf secret webhook invalide) pour éviter les retries.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await checkRateLimit(`telegram:webhook:${ip}`, 40, 60_000);
  if (!allowed) {
    return NextResponse.json({ ok: true });
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  try {
    const update = (await request.json()) as {
      message?: {
        chat?: { id?: number; first_name?: string };
        text?: string;
      };
    };

    const text = update.message?.text?.trim() ?? "";
    const chatId = update.message?.chat?.id;
    if (!chatId || !text.startsWith("/start")) {
      return NextResponse.json({ ok: true });
    }

    const payload = text.replace(/^\/start\s*/, "").trim();
    if (payload !== expectedLinkPayload()) {
      return NextResponse.json({ ok: true });
    }

    const label = update.message?.chat?.first_name ?? "Cheffe";
    await linkTelegramChat(String(chatId), label);
    await sendTelegramMessage(
      `✅ Connecté à Gift & ENTREMETS.\nVous recevrez les alertes commandes / stock / sécurité.`,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram/webhook]", err);
    return NextResponse.json({ ok: true });
  }
}
