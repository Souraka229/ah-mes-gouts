import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { isAdministratorAsync } from "@/lib/server/admin-role";
import {
  buildTelegramConnectUrl,
  linkTelegramChat,
} from "@/lib/notifications/telegram";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Lien / état Telegram (admin only).
 * GET → URL de connexion + abonnés
 * POST { chatId, label? } → liaison manuelle (secours)
 */
export async function GET() {
  if (!(await isAdminAuthorizedAsync()) || !(await isAdministratorAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const linkToken =
    process.env.TELEGRAM_LINK_SECRET?.trim() ||
    createHash("sha256")
      .update(process.env.TELEGRAM_BOT_TOKEN ?? randomBytes(8).toString("hex"))
      .digest("hex")
      .slice(0, 24);

  const connectUrl = buildTelegramConnectUrl(`link_${linkToken}`);

  try {
    const prisma = getPrisma();
    const subscribers = await prisma.telegramSubscriber.findMany({
      orderBy: { linkedAt: "desc" },
      select: {
        id: true,
        chatId: true,
        label: true,
        isActive: true,
        linkedAt: true,
      },
    });

    return NextResponse.json({
      connectUrl,
      botUsername: process.env.TELEGRAM_BOT_USERNAME ?? null,
      configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      subscribers,
      highValueThresholdFcfa: Number(
        process.env.TELEGRAM_HIGH_VALUE_FCFA ?? "25000",
      ),
    });
  } catch (err) {
    console.error("[telegram/settings]", err);
    return NextResponse.json({
      connectUrl,
      botUsername: process.env.TELEGRAM_BOT_USERNAME ?? null,
      configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      subscribers: [],
      highValueThresholdFcfa: 25000,
    });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthorizedAsync()) || !(await isAdministratorAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { chatId?: string; label?: string };
    const chatId = body.chatId?.trim();
    if (!chatId || !/^-?\d+$/.test(chatId)) {
      return NextResponse.json({ error: "chatId invalide" }, { status: 400 });
    }
    await linkTelegramChat(chatId, body.label ?? "Équipe");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Liaison impossible";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
