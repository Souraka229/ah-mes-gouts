import { NextResponse } from "next/server";

import { analyzeAssistantResponse } from "@/lib/admin-assistant/build-preview";
import { PASTE_MAX_LENGTH } from "@/lib/admin-assistant/extract-json";
import { isAdministratorAsync } from "@/lib/server/admin-role";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!await isAdministratorAsync()) {
    return NextResponse.json(
      { error: "Réservé aux administrateurs." },
      { status: 403 },
    );
  }

  let body: { pasted?: string };
  try {
    body = (await request.json()) as { pasted?: string };
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const pasted = body.pasted ?? "";
  if (!pasted.trim()) {
    return NextResponse.json(
      { error: "Collez la réponse de ChatGPT." },
      { status: 400 },
    );
  }

  if (pasted.length > PASTE_MAX_LENGTH) {
    return NextResponse.json(
      {
        error: `Texte trop long (max ${PASTE_MAX_LENGTH} caractères).`,
      },
      { status: 400 },
    );
  }

  try {
    const preview = await analyzeAssistantResponse(pasted);
    return NextResponse.json({ preview });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Analyse impossible.",
      },
      { status: 400 },
    );
  }
}
