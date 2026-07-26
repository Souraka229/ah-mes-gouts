import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import {
  getDeliveryConfig,
} from "@/lib/server/delivery-config-repository";

/** Runtime only — évite le crash build si Postgres est injoignable au prerender. */
export const dynamic = "force-dynamic";

const getCachedDeliveryPayload = unstable_cache(
  async () => {
    const config = await getDeliveryConfig();
    return {
      zones: config.zones.filter((z) => z.isActive),
      schedules: config.schedules,
      options: config.options,
    };
  },
  ["delivery-config"],
  { revalidate: 60, tags: ["delivery-config"] },
);

export async function GET() {
  const payload = await getCachedDeliveryPayload();

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control":
        "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
