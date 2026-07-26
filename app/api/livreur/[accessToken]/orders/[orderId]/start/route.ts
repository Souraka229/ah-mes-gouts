import { NextResponse } from "next/server";

import { getDriverByAccessToken } from "@/lib/server/driver-repository";
import { driverStartDelivery } from "@/lib/server/order-repository";
import { appendAdminActionLog } from "@/lib/server/admin-action-log";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ accessToken: string; orderId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { accessToken, orderId } = await context.params;
  const driver = await getDriverByAccessToken(accessToken);

  if (!driver || !driver.isActive) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 404 });
  }

  try {
    const order = await driverStartDelivery(driver.id, orderId);
    await appendAdminActionLog({
      adminName: driver.name,
      source: "driver",
      action: "started",
      summary: `${driver.name} démarre la commande ${orderId}`,
      details: { driverId: driver.id, orderId },
    }).catch(() => undefined);
    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Action impossible.",
      },
      { status: 400 },
    );
  }
}
