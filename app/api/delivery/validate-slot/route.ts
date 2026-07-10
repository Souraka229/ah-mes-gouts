import { NextResponse } from "next/server";

import { getSlotsForDate } from "@/lib/delivery/slots";
import type { FulfillmentType } from "@/lib/delivery/types";
import { getDeliveryConfig } from "@/lib/server/delivery-config-repository";
import {
  buildSlotKey,
  findNextAvailableSlot,
  isSlotAvailable,
} from "@/lib/server/slot-bookings";

export const dynamic = "force-dynamic";

type ValidateBody = {
  type: FulfillmentType;
  slotStart: string;
  slotEnd: string;
};

export async function POST(request: Request) {
  let body: ValidateBody;

  try {
    body = (await request.json()) as ValidateBody;
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const { type, slotStart, slotEnd } = body;
  if (!type || !slotStart || !slotEnd) {
    return NextResponse.json(
      { error: "Créneau incomplet" },
      { status: 400 },
    );
  }

  const { schedules } = await getDeliveryConfig();
  const start = new Date(slotStart);
  const slots = getSlotsForDate(schedules, type, start);
  const matching = slots.find(
    (s) => s.start === slotStart && s.end === slotEnd,
  );

  if (!matching) {
    const alternative = await findNextAvailableSlot(type, slotStart);
    return NextResponse.json(
      {
        available: false,
        error: "Ce créneau n'est plus disponible.",
        nextSlot: alternative,
      },
      { status: 409 },
    );
  }

  const slotKey = buildSlotKey(type, slotStart);
  if (!(await isSlotAvailable(slotKey))) {
    const alternative = await findNextAvailableSlot(type, slotStart);
    return NextResponse.json(
      {
        available: false,
        error: "Ce créneau vient d'être réservé. Choisissez le suivant.",
        nextSlot: alternative,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ available: true, slotKey });
}
