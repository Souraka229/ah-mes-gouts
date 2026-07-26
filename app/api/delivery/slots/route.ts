import { NextResponse } from "next/server";

import { getShopDateKey } from "@/lib/business-date";
import type { FulfillmentType } from "@/lib/delivery/types";
import { getAvailableSlotsToday } from "@/lib/server/slot-bookings";

export const dynamic = "force-dynamic";

/**
 * Créneaux du jour encore libres (heure Cotonou + capacité réelle).
 * Le front n'affiche que cette liste — plus de créneau « fantôme » plein.
 */
export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type");
  if (type !== "delivery" && type !== "pickup") {
    return NextResponse.json(
      { error: "Paramètre type requis (delivery|pickup)." },
      { status: 400 },
    );
  }

  const slots = await getAvailableSlotsToday(type as FulfillmentType);

  return NextResponse.json({
    dateKey: getShopDateKey(),
    slots,
  });
}
