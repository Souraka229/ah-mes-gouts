import { NextResponse } from "next/server";
import { z } from "zod";

import { fromPrismaOrder } from "@/lib/server/order-mapper";
import { getOrdersForDevice } from "@/lib/server/crm/customer-service";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  deviceKey: z.string().min(16).max(80),
});

/** Historique commandes pour l'appareil lié — sans auth, via deviceKey. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    deviceKey: searchParams.get("deviceKey"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "deviceKey requis" }, { status: 400 });
  }

  try {
    const result = await getOrdersForDevice(parsed.data.deviceKey);
    if (!result.linked) {
      return NextResponse.json({ linked: false, orders: [] });
    }

    return NextResponse.json({
      linked: true,
      customerId: result.customerId,
      orders: result.orders.map((row) =>
        fromPrismaOrder({
          ...row,
          driver: null,
        }),
      ),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
