import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdministratorAsync } from "@/lib/server/admin-role";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import {
  getBoutiqueSettings,
  saveBoutiqueSettings,
} from "@/lib/server/site-settings-repository";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  whatsappBotEnabled: z.boolean().optional(),
  whatsappBotPausedMessage: z.string().max(500).optional(),
});

export async function GET() {
  if (!(await isAdminAuthorizedAsync()) || !(await isAdministratorAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const settings = await getBoutiqueSettings();
  return NextResponse.json({
    whatsappBotEnabled: settings.whatsappBotEnabled !== false,
    whatsappBotPausedMessage: settings.whatsappBotPausedMessage ?? "",
  });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthorizedAsync()) || !(await isAdministratorAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const settings = await saveBoutiqueSettings(parsed.data);
  return NextResponse.json({
    whatsappBotEnabled: settings.whatsappBotEnabled !== false,
    whatsappBotPausedMessage: settings.whatsappBotPausedMessage ?? "",
  });
}
