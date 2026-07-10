import { NextResponse } from "next/server";

import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { updateServerOrderStatus } from "@/lib/server/order-repository";
import type { OrderStatus } from "@/types/order";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ orderId: string }> };

const VALID: OrderStatus[] = [
  "recue",
  "paiement_confirme",
  "preparation",
  "prete",
  "en_livraison",
  "livree",
  "annulee",
];

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { orderId } = await context.params;

  try {
    const body = (await request.json()) as { status?: OrderStatus };
    if (!body.status || !VALID.includes(body.status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const order = await updateServerOrderStatus(orderId, body.status);
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
}
