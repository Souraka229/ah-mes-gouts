import { NextResponse } from "next/server";

import { getAdminContextAsync } from "@/lib/server/admin-auth";
import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { assignOrderDriver } from "@/lib/server/order-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await getAdminContextAsync();
  if (!admin) {
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
    if (body.driverId) {
      await appendAdminActionLog({
        adminName: admin.name,
        source: "driver",
        action: "assigned",
        summary: `${order.driverName ?? "Livreur"} affecté à la commande ${orderId}`,
        details: { driverId: body.driverId, orderId },
      }).catch(() => undefined);
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
