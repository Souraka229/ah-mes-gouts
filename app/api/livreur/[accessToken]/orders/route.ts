import { NextResponse } from "next/server";

import {
  getDriverByAccessToken,
  getDriverFirstName,
} from "@/lib/server/driver-repository";
import { getDriverOrdersForToday } from "@/lib/server/order-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ accessToken: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { accessToken } = await context.params;
  const driver = await getDriverByAccessToken(accessToken);

  if (!driver || !driver.isActive) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 404 });
  }

  const orders = await getDriverOrdersForToday(driver.id);

  return NextResponse.json({
    driver: {
      firstName: getDriverFirstName(driver.name),
      name: driver.name,
    },
    orders,
  });
}
