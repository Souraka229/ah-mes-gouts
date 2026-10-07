import { isNextDayOrderingOpen } from "@/lib/business-date";
import { resolveDeliveryDisplayName } from "@/lib/delivery-zones";
import { resolveDeliveryAreaPrice } from "@/lib/server/delivery-area-repository";
import { getSlotsForDate } from "@/lib/delivery/slots";
import {
  generateOrderId,
  generateTrackingToken,
} from "@/lib/server/order-id";
import { priceOrderItems } from "@/lib/server/order-pricing";
import { optionSelectionsSchema } from "@/lib/product-options/schema";
import {
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
  getMaxOrdersPerSlot,
  isSlotAvailable,
} from "@/lib/server/slot-bookings";
import { getDeliveryConfig, getZoneById } from "@/lib/server/delivery-config-repository";
import type { PaymentMethod, SavedOrder } from "@/types/order";
import { z } from "zod";

const orderItemsSchema = z
  .array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().int().positive().max(99),
      supplements: z.array(z.string()).default([]),
      options: optionSelectionsSchema,
      slug: z.string().optional(),
      variantCode: z.string().min(1).max(40).optional(),
      sizeCm: z.number().int().positive().optional(),
    }),
  )
  .min(1);

export type CreateCheckoutOrderInput = {
  mode: "delivery" | "pickup" | "dinein";
  paymentMethod: PaymentMethod;
  scheduledSlotStart: string;
  scheduledSlotEnd: string;
  client: SavedOrder["client"];
  items: z.infer<typeof orderItemsSchema>;
  isGift?: boolean;
  gift?: SavedOrder["gift"];
  deliveryZoneId?: string | null;
  /** Quartier officiel — tarif au lieu (comme le devis site). */
  deliveryLocality?: string | null;
  zoneName?: string | null;
  salesChannel?: "web" | "whatsapp";
};

export type CreateCheckoutOrderResult =
  | { ok: true; order: SavedOrder }
  | {
      ok: false;
      error: string;
      code?: "SLOT_UNAVAILABLE" | "SLOT_FULL" | "PRICING" | "VALIDATION";
    };

export async function createCheckoutOrder(
  input: CreateCheckoutOrderInput,
): Promise<CreateCheckoutOrderResult> {
  const parsedItems = orderItemsSchema.safeParse(input.items);
  if (!parsedItems.success) {
    return { ok: false, error: "Panier invalide.", code: "VALIDATION" };
  }

  const mode = input.mode;
  const clientValidation = validateOrderClientPayload({
    mode,
    client: input.client,
    isGift: input.isGift,
    gift: input.gift,
  });
  if (!clientValidation.ok) {
    return { ok: false, error: clientValidation.error, code: "VALIDATION" };
  }

  const paymentParsed = orderPaymentMethodSchema.safeParse(input.paymentMethod);
  if (!paymentParsed.success) {
    return { ok: false, error: "Mode de paiement invalide.", code: "VALIDATION" };
  }

  const slotStart = input.scheduledSlotStart;
  const slotEnd = input.scheduledSlotEnd;

  if (!assertSlotIsOrderable(slotStart) || !assertSlotIsOrderable(slotEnd)) {
    return {
      ok: false,
      error: isNextDayOrderingOpen()
        ? "Créneau non disponible (menu du jour)."
        : "Créneau demain disponible à partir de 20 h.",
      code: "SLOT_UNAVAILABLE",
    };
  }

  const fulfillmentType = mode;
  const scheduleType = fulfillmentType === "delivery" ? "delivery" : "pickup";

  const { schedules } = await getDeliveryConfig();
  const slots = getSlotsForDate(schedules, scheduleType, new Date(slotStart));
  const matching = slots.find((s) => s.start === slotStart && s.end === slotEnd);
  if (!matching) {
    return {
      ok: false,
      error: "Créneau indisponible.",
      code: "SLOT_UNAVAILABLE",
    };
  }

  const slotKey = buildSlotKey(scheduleType, slotStart);
  if (!(await isSlotAvailable(slotKey))) {
    return { ok: false, error: "Créneau complet.", code: "SLOT_FULL" };
  }

  const priced = await priceOrderItems(parsedItems.data);
  if (!priced.ok) {
    return {
      ok: false,
      error: priced.issues.map((i) => i.message).join(" — "),
      code: "PRICING",
    };
  }

  let deliveryFee = 0;
  let zoneId: string | null = null;
  let zoneName: string | null = null;

  if (fulfillmentType === "delivery") {
    const requestedZoneId = input.deliveryZoneId;
    if (!requestedZoneId) {
      return {
        ok: false,
        error: "Zone de livraison requise.",
        code: "VALIDATION",
      };
    }
    const zone = await getZoneById(requestedZoneId);
    if (!zone || !zone.isActive) {
      return {
        ok: false,
        error: "Zone indisponible.",
        code: "VALIDATION",
      };
    }
    zoneId = zone.id;
    const locality = input.deliveryLocality?.trim() || null;
    if (locality) {
      const areaPrice = await resolveDeliveryAreaPrice(zone.id, locality);
      if (areaPrice === undefined) {
        return {
          ok: false,
          error: "Ce quartier n'est plus desservi. Choisissez-en un autre.",
          code: "VALIDATION",
        };
      }
      deliveryFee = areaPrice;
    } else {
      deliveryFee = zone.cost;
    }
    zoneName = resolveDeliveryDisplayName(
      zone.id,
      input.zoneName,
      locality ?? input.client.landmark,
    );
  }

  const subtotal = priced.data.subtotal;
  const total = subtotal + deliveryFee;

  const order: SavedOrder = {
    id: generateOrderId(),
    createdAt: new Date().toISOString(),
    trackingToken: generateTrackingToken(),
    status: "recue",
    mode,
    fulfillmentType,
    scheduledSlotStart: slotStart,
    scheduledSlotEnd: slotEnd,
    zoneId,
    deliveryZoneId: zoneId,
    zoneName,
    deliveryFee,
    subtotal,
    total,
    client: input.client,
    isGift: input.isGift ?? false,
    gift: input.gift ?? null,
    paymentMethod: paymentParsed.data,
    salesChannel: input.salesChannel ?? "web",
    items: priced.data.items,
  };

  const slotCapacity = await getMaxOrdersPerSlot(scheduleType);

  try {
    await withRetry(
      () =>
        saveServerOrderWithSlotReservation(order, {
          scheduledSlotStart: new Date(slotStart),
          fulfillmentType: scheduleType,
          maxOrdersPerSlot: slotCapacity,
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
      const next = await findNextAvailableSlot(scheduleType, slotStart);
      return {
        ok: false,
        error: next
          ? "Créneau complet — réessayez un autre horaire."
          : "Plus de créneau libre aujourd'hui.",
        code: "SLOT_FULL",
      };
    }
    throw err;
  }

  return { ok: true, order };
}
