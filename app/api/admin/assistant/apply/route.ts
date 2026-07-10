import { NextResponse } from "next/server";

import { applyAssistantAction } from "@/lib/admin-assistant/apply-action";
import { analyzeAssistantResponse } from "@/lib/admin-assistant/build-preview";
import { PASTE_MAX_LENGTH } from "@/lib/admin-assistant/extract-json";
import type { ParsedAssistantAction } from "@/lib/admin-assistant/types";
import { getAdminDisplayNameAsync, isAdministratorAsync } from "@/lib/server/admin-role";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!await isAdministratorAsync()) {
    return NextResponse.json(
      { error: "Réservé aux administrateurs." },
      { status: 403 },
    );
  }

  let body: { parsed?: ParsedAssistantAction; pasted?: string };
  try {
    body = (await request.json()) as {
      parsed?: ParsedAssistantAction;
      pasted?: string;
    };
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  let parsed = body.parsed;

  if (!parsed && body.pasted) {
    if (body.pasted.length > PASTE_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Texte trop long (max ${PASTE_MAX_LENGTH} caractères).` },
        { status: 400 },
      );
    }
    const preview = await analyzeAssistantResponse(body.pasted);
    if (!preview.canApply) {
      return NextResponse.json(
        { error: preview.blockedReason ?? "Action non applicable." },
        { status: 400 },
      );
    }
    parsed = preview.parsed;
  }

  if (!parsed) {
    return NextResponse.json(
      { error: "Action à appliquer manquante." },
      { status: 400 },
    );
  }

  if (parsed.confidence === "low" || parsed.action === "unknown") {
    return NextResponse.json(
      { error: "Cette action ne peut pas être appliquée automatiquement." },
      { status: 400 },
    );
  }

  try {
    const adminName = await getAdminDisplayNameAsync();
    const result = await applyAssistantAction(parsed, adminName);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Échec de l'application.",
      },
      { status: 400 },
    );
  }
}
