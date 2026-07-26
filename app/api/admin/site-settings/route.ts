import { NextResponse } from "next/server";

import { isAdministratorAsync } from "@/lib/server/admin-role";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import {
  getBoutiqueSettings,
  saveBoutiqueSettings,
} from "@/lib/server/site-settings-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthorizedAsync()) || !(await isAdministratorAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const settings = await getBoutiqueSettings();
  return NextResponse.json(
    { settings },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthorizedAsync()) || !(await isAdministratorAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const settings = await saveBoutiqueSettings(body);
    return NextResponse.json({ settings });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
