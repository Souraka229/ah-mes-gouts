import { NextResponse } from "next/server";

import {
  getShopDateKey,
  getTomorrowShopDateKey,
  isNextDayOrderingOpen,
} from "@/lib/business-date";
import type { FulfillmentType } from "@/lib/delivery/types";
import { getAvailableSlots } from "@/lib/server/slot-bookings";

export const dynamic = "force-dynamic";

/**
 * Créneaux encore libres (heure Cotonou + capacité réelle) : ceux du jour, plus
 * ceux de demain dès 20 h. Le front n'affiche que cette liste — plus de créneau
 * « fantôme » plein.
 */
export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type");
  if (type !== "delivery" && type !== "pickup") {
    return NextResponse.json(
      { error: "Paramètre type requis (delivery|pickup)." },
      { status: 400 },
    );
  }

  const now = new Date();
  const slots = await getAvailableSlots(type as FulfillmentType, now);

  return NextResponse.json({
    dateKey: getShopDateKey(now),
    tomorrowDateKey: getTomorrowShopDateKey(now),
    nextDayOpen: isNextDayOrderingOpen(now),
    slots,
  });
}
