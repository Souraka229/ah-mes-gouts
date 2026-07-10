import { PICKUP_ADDRESS } from "@/lib/delivery/constants";
import {
  formatSlotDateShort,
  formatSlotRange,
} from "@/lib/delivery/slots";
import type { ReceptionMode } from "@/types/order";

type FulfillmentInfo = {
  mode: ReceptionMode;
  zoneName: string | null;
  scheduledSlotStart?: string | null;
  scheduledSlotEnd?: string | null;
};

export function formatFulfillmentSummary(order: FulfillmentInfo): string | null {
  if (!order.scheduledSlotStart || !order.scheduledSlotEnd) return null;

  const dateLabel = formatSlotDateShort(order.scheduledSlotStart);
  const timeLabel = formatSlotRange(
    order.scheduledSlotStart,
    order.scheduledSlotEnd,
  );

  if (order.mode === "delivery") {
    const zone = order.zoneName ?? "votre adresse";
    return `Livraison prévue le ${dateLabel} entre ${timeLabel} à ${zone}`;
  }

  return `Retrait prévu le ${dateLabel} entre ${timeLabel} en boutique (${PICKUP_ADDRESS})`;
}
