import { NextResponse } from "next/server";

import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { assignOrderDriver } from "@/lib/server/order-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { orderId } = await context.params;

  let body: { driverId?: string | null };
  try {
    body = (await request.json()) as { driverId?: string | null };
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  try {
    const order = await assignOrderDriver(
      orderId,
      body.driverId ?? null,
    );
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Assignation impossible.",
      },
      { status: 400 },
    );
  }
}
