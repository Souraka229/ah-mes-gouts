import { NextResponse } from "next/server";

import {
  getActiveZones,
  getDeliveryConfig,
} from "@/lib/server/delivery-config-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const config = await getDeliveryConfig();
  const activeZones = await getActiveZones();

  return NextResponse.json(
    {
      zones: activeZones,
      schedules: config.schedules,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
