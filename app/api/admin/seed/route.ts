import { NextResponse } from "next/server";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { reseedDemoOrders } from "@/lib/server/order-repository";
import { reseedMenus } from "@/lib/server/menu-repository";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";

export const dynamic = "force-dynamic";

/** Recharge les commandes de démo (dev / démo admin). */
export async function POST() {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const orders = await reseedDemoOrders();
  const menus = await reseedMenus();

  await appendAdminActionLog({
    adminName: "Système",
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
