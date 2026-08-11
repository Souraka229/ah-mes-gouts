import { NextResponse } from "next/server";
import { z } from "zod";

import { isNextDayOrderingOpen } from "@/lib/business-date";
import { formatFulfillmentSummary } from "@/lib/delivery/fulfillment-summary";
import { getSlotsForDate } from "@/lib/delivery/slots";
import { resolveDeliveryDisplayName } from "@/lib/delivery-zones";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getDeliveryConfig, getZoneById } from "@/lib/server/delivery-config-repository";
import {
  rememberIdempotentOrder,
  resolveIdempotentOrder,
} from "@/lib/server/order-idempotency";
import { priceOrderItems } from "@/lib/server/order-pricing";
import {
  getServerOrder,
  saveServerOrderWithSlotReservation,
  SlotFullError,
} from "@/lib/server/order-repository";
import {
  orderPaymentMethodSchema,
  validateOrderClientPayload,
} from "@/lib/validation/order-server";
import { withRetry } from "@/lib/server/retry";
import {
  assertSlotIsOrderable,
  buildSlotKey,
  findNextAvailableSlot,
  isSlotAvailable,
} from "@/lib/server/slot-bookings";
import type { SavedOrder } from "@/types/order";

const orderItemsSchema = z
  .array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().int().positive().max(99),
      supplements: z.array(z.string()).default([]),
      slug: z.string().optional(),
    }),
  )
  .min(1);

const ORDER_RATE_LIMIT = 5;
const ORDER_RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = await checkRateLimit(
    `orders:create:${ip}`,
    ORDER_RATE_LIMIT,
    ORDER_RATE_WINDOW_MS,
  );

  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques instants." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      },
    );
  }

  const idempotencyKey = request.headers.get("idempotency-key")?.trim();

  if (idempotencyKey) {
    const existing = await resolveIdempotentOrder(idempotencyKey);
    if (existing) {
      const prior = await getServerOrder(existing.orderId);
      if (prior) {
        return NextResponse.json({
          ok: true,
          orderId: prior.id,
          duplicate: true,
          fulfillmentSummary: formatFulfillmentSummary(prior),
        });
      }
    }
  }

  let order: SavedOrder;

  try {
    order = (await request.json()) as SavedOrder;
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  if (!order.id || !order.client?.phone) {
    return NextResponse.json(
      { error: "Commande incomplète" },
      { status: 400 },
    );
  }

  const parsedItems = orderItemsSchema.safeParse(order.items);
  if (!parsedItems.success) {
    return NextResponse.json(
      { error: "Panier invalide" },
      { status: 400 },
    );
  }

  if (!order.scheduledSlotStart || !order.scheduledSlotEnd) {
    return NextResponse.json(
      { error: "Créneau horaire requis" },
      { status: 400 },
    );
  }

  const mode = order.mode ?? order.fulfillmentType;
  if (mode !== "delivery" && mode !== "pickup" && mode !== "dinein") {
    return NextResponse.json({ error: "Mode invalide" }, { status: 400 });
  }

  const clientValidation = validateOrderClientPayload({
    mode,
    client: order.client,
    isGift: order.isGift,
    gift: order.gift,
  });
  if (!clientValidation.ok) {
    return NextResponse.json({ error: clientValidation.error }, { status: 400 });
  }

  const paymentParsed = orderPaymentMethodSchema.safeParse(order.paymentMethod);
  if (!paymentParsed.success) {
    return NextResponse.json({ error: "Mode de paiement invalide" }, { status: 400 });
  }

  const slotStart = order.scheduledSlotStart;
  const slotEnd = order.scheduledSlotEnd;
  // Menu journalier : aujourd'hui, et le lendemain seulement à partir de 20 h.
  if (!assertSlotIsOrderable(slotStart) || !assertSlotIsOrderable(slotEnd)) {
    return NextResponse.json(
      {
        error: isNextDayOrderingOpen()
          ? "Choisissez un créneau d’aujourd’hui ou de demain."
          : "Le menu est journalier : choisissez un créneau d’aujourd’hui. Les créneaux de demain ouvrent à 20 h.",
      },
      { status: 409 },
    );
  }

  const fulfillmentType = mode;
  const scheduleType = fulfillmentType === "delivery" ? "delivery" : "pickup";

  try {
    const { schedules, options } = await getDeliveryConfig();
    const slots = getSlotsForDate(
      schedules,
      scheduleType,
      new Date(slotStart),
    );
    const matching = slots.find(
      (s) => s.start === slotStart && s.end === slotEnd,
    );
    if (!matching) {
      const nextSlot = await findNextAvailableSlot(scheduleType, slotStart);
      return NextResponse.json(
        {
          error: "SLOT_UNAVAILABLE",
          nextSlot,
        },
        { status: 409 },
      );
    }

    const slotKey = buildSlotKey(scheduleType, slotStart);

    if (!(await isSlotAvailable(slotKey))) {
      const nextSlot = await findNextAvailableSlot(scheduleType, slotStart);
      return NextResponse.json(
        {
          error: "SLOT_FULL",
          nextSlot,
        },
        { status: 409 },
      );
    }

    const priced = await priceOrderItems(parsedItems.data);
    if (!priced.ok) {
      return NextResponse.json(
        {
          error: priced.issues.map((i) => `${i.name} : ${i.message}`).join(" — "),
          issues: priced.issues,
        },
        { status: 409 },
      );
    }

    let deliveryFee = 0;
    let zoneId: string | null = null;
    let zoneName: string | null = null;

    if (fulfillmentType === "delivery") {
      const requestedZoneId = order.deliveryZoneId ?? order.zoneId;
      if (!requestedZoneId) {
        return NextResponse.json(
          { error: "Zone de livraison requise" },
          { status: 400 },
        );
      }
      const zone = await getZoneById(requestedZoneId);
      if (!zone || !zone.isActive) {
        return NextResponse.json(
          { error: "Zone de livraison indisponible" },
          { status: 400 },
        );
      }
      deliveryFee = zone.cost;
      zoneId = zone.id;
      // Un seul quartier (ex. Segbèya) — jamais la liste des destinations.
      zoneName = resolveDeliveryDisplayName(
        zone.id,
        order.zoneName,
        order.client?.landmark,
      );
    }

    const subtotal = priced.data.subtotal;
    const total = subtotal + deliveryFee;

    order = {
      ...order,
      mode,
      fulfillmentType,
      items: priced.data.items,
      subtotal,
      deliveryFee,
      total,
      zoneId,
      deliveryZoneId: zoneId,
      zoneName,
      paymentMethod: paymentParsed.data,
      status: "recue",
    };

    try {
      await withRetry(
        () =>
          saveServerOrderWithSlotReservation(order, {
            scheduledSlotStart: new Date(slotStart),
            fulfillmentType: scheduleType,
            maxOrdersPerSlot: options.maxOrdersPerSlot,
          }),
        {
          label: "saveServerOrderWithSlotReservation",
          maxAttempts: 3,
          baseDelayMs: 150,
          shouldRetry: (err) => !(err instanceof SlotFullError),
        },
      );
    } catch (err) {
      if (err instanceof SlotFullError) {
        const nextSlot = await findNextAvailableSlot(scheduleType, slotStart);
        return NextResponse.json(
          {
            error: "SLOT_FULL",
            nextSlot,
          },
          { status: 409 },
        );
      }
      throw err;
    }

    if (idempotencyKey) {
      await rememberIdempotentOrder(idempotencyKey, order.id);
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      status: order.status,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      fulfillmentSummary: formatFulfillmentSummary(order),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur serveur lors de la commande";
    console.error("[orders] POST échoué:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
