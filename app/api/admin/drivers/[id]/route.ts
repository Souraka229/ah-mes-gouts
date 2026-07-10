import { NextResponse } from "next/server";

import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import {
  countDriverDeliveriesToday,
  regenerateDriverToken,
  setDriverActive,
} from "@/lib/server/driver-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: { isActive?: boolean; regenerateToken?: boolean };
  try {
    body = (await request.json()) as {
      isActive?: boolean;
      regenerateToken?: boolean;
    };
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  if (body.regenerateToken) {
    const driver = await regenerateDriverToken(id);
    if (!driver) {
      return NextResponse.json({ error: "Livreur introuvable." }, { status: 404 });
    }
    const deliveriesToday = await countDriverDeliveriesToday(id);
    return NextResponse.json({ driver: { ...driver, deliveriesToday } });
  }

  if (typeof body.isActive !== "boolean") {
    return NextResponse.json(
      { error: "isActive ou regenerateToken requis." },
      { status: 400 },
    );
  }

  const driver = await setDriverActive(id, body.isActive);
  if (!driver) {
    return NextResponse.json({ error: "Livreur introuvable." }, { status: 404 });
  }

  const deliveriesToday = await countDriverDeliveriesToday(id);
  return NextResponse.json({ driver: { ...driver, deliveriesToday } });
}
