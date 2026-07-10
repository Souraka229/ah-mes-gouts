import { NextResponse } from "next/server";

import { buildAssistantPrompt } from "@/lib/admin-assistant/build-prompt";
import { isAdministratorAsync } from "@/lib/server/admin-role";
import { getAdminCatalog } from "@/lib/server/admin-catalog-repository";
import { getDeliveryConfig } from "@/lib/server/delivery-config-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!await isAdministratorAsync()) {
    return NextResponse.json(
      { error: "Réservé aux administrateurs." },
      { status: 403 },
    );
  }

  let body: { input?: string };
  try {
    body = (await request.json()) as { input?: string };
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const input = body.input?.trim();
  if (!input) {
    return NextResponse.json(
      { error: "Décrivez l'action souhaitée." },
      { status: 400 },
    );
  }

  const [{ zones }, products] = await Promise.all([
    getDeliveryConfig(),
    getAdminCatalog(),
  ]);

  const prompt = buildAssistantPrompt({ userInput: input, zones, products });

  return NextResponse.json({ prompt });
}
