import { NextResponse } from "next/server";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import {
  getAdminDisplayNameAsync,
  isAdministratorAsync,
} from "@/lib/server/admin-role";
import { getAdminCatalog } from "@/lib/server/admin-catalog-repository";
import { getDeliveryConfig } from "@/lib/server/delivery-config-repository";
import { getAllServerOrders } from "@/lib/server/order-repository";
import { getAllSlotBookings } from "@/lib/server/slot-bookings";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!(await isAdministratorAsync())) {
    return NextResponse.json(
      { error: "Export réservé à l'administrateur" },
      { status: 403 },
    );
  }

  const [deliveryConfig, orders, catalog] = await Promise.all([
    getDeliveryConfig(),
    getAllServerOrders(),
    getAdminCatalog(),
  ]);

  void appendAdminActionLog({
    adminName: await getAdminDisplayNameAsync(),
    source: "manual",
    action: "data_export",
    summary: "Export données admin (/api/admin/data)",
    details: { ordersCount: orders.length, catalogCount: catalog.length },
  });

  return NextResponse.json(
    {
      deliveryConfig,
      catalog,
      orders: orders.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      slotBookings: getAllSlotBookings(),
      storage: {
        orders: "postgres (prisma) — Order",
        deliveryConfig: "postgres (prisma) — DeliveryZone + DeliverySchedule",
        catalog: "postgres (prisma) — Product",
        menus: "postgres (prisma) — Menu",
        siteContent: "postgres (prisma) — SiteContentStore",
        siteSettings: "postgres (prisma) — SiteSettingsStore",
        adminLog: "postgres (prisma) — AdminActionLog",
        slotBookings: "mémoire process (non persisté)",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
