import { NextResponse } from "next/server";

import { getDriverByAccessToken } from "@/lib/server/driver-repository";
import { driverMarkUnreachable } from "@/lib/server/order-repository";

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
