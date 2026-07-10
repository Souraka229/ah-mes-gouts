import { NextResponse } from "next/server";

import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { setDriverActive } from "@/lib/server/driver-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: { isActive?: boolean };
  try {
    body = (await request.json()) as { isActive?: boolean };
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  if (typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive requis." }, { status: 400 });
  }

  const driver = await setDriverActive(id, body.isActive);
  if (!driver) {
    return NextResponse.json({ error: "Livreur introuvable." }, { status: 404 });
  }

  return NextResponse.json({ driver });
}
