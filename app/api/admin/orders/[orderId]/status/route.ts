import { NextResponse } from "next/server";
import { z } from "zod";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { getAdminDisplayNameAsync } from "@/lib/server/admin-role";
import { updateServerOrderStatus } from "@/lib/server/order-repository";
import type { OrderStatus } from "@/types/order";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ orderId: string }> };

const bodySchema = z.object({
  status: z.enum([
    "recue",
    "paiement_confirme",
    "preparation",
    "prete",
    "en_livraison",
    "livree",
    "annulee",
  ]),
});

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { orderId } = await context.params;

  try {
    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const status = parsed.data.status as OrderStatus;
    const order = await updateServerOrderStatus(orderId, status);
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    void appendAdminActionLog({
      adminName: await getAdminDisplayNameAsync(),
      source: "manual",
      action: "order_status",
      summary: `Statut ${orderId} → ${status}`,
      details: { orderId, status },
    });

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
}
