import { NextResponse } from "next/server";

import { getDriverByAccessToken } from "@/lib/server/driver-repository";
import { driverMarkUnreachable } from "@/lib/server/order-repository";
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
    const order = await driverMarkUnreachable(driver.id, orderId);
    await appendAdminActionLog({
      adminName: driver.name,
      source: "driver",
      action: "unreachable",
      summary: `${driver.name} signale le client injoignable pour ${orderId}`,
      details: { driverId: driver.id, orderId },
    }).catch(() => undefined);
    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Action impossible.",
      },
      { status: 400 },
    );
  }
}
