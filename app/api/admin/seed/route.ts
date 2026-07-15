import { NextResponse } from "next/server";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { getAdminContextAsync, isDevAdminOpen } from "@/lib/server/admin-auth";
import { reseedDemoOrders } from "@/lib/server/order-repository";
import { reseedMenus } from "@/lib/server/menu-repository";

export const dynamic = "force-dynamic";

/**
 * Recharge les commandes de démo — opération DESTRUCTIVE (supprime toutes les
 * commandes et menus existants). Réservée au mode dev/démo : renvoie 404 en
 * production (l'existence même de la route est masquée), et exige le rôle
 * administrateur.
 */
export async function POST() {
  // Barrière décisive : jamais disponible en production.
  if (!isDevAdminOpen()) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const context = await getAdminContextAsync();
  if (!context) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (context.role !== "administrateur") {
    return NextResponse.json({ error: "Réservé aux administrateurs" }, { status: 403 });
  }

  const orders = await reseedDemoOrders();
  const menus = await reseedMenus();

  await appendAdminActionLog({
    adminName: context.name,
    source: "manual",
    action: "reseed_demo_orders",
    summary: `${orders.length} commandes + ${menus.length} menus rechargés`,
  });

  return NextResponse.json({
    ok: true,
    count: orders.length,
    menuCount: menus.length,
    orderIds: orders.map((o) => o.id),
  });
}
