"use client";

import { formatFulfillmentSummary } from "@/lib/delivery/fulfillment-summary";
import { formatPrice } from "@/lib/format";
import {
  getZoneCost,
  getZoneName,
  useDeliveryConfig,
} from "@/lib/hooks/use-delivery-config";
import { useCartTotals } from "@/lib/cart-store";
import { useCheckoutStore } from "@/lib/checkout-store";
import { RECEPTION_MODE_LABELS, type ReceptionMode } from "@/types/order";

export function CheckoutSummary() {
  const mode = useCheckoutStore((state) => state.mode);
  const zoneId = useCheckoutStore((state) => state.zoneId);
  const scheduledSlot = useCheckoutStore((state) => state.scheduledSlot);
  const cartTotals = useCartTotals();
  const { zones } = useDeliveryConfig();

  const zoneName = getZoneName(zones, zoneId);
  const deliveryFee = getDeliveryFee(mode, getZoneCost(zones, zoneId));
  const total = cartTotals.subtotal + deliveryFee;

  const fulfillmentLine =
    scheduledSlot && mode
      ? formatFulfillmentSummary({
          mode,
          zoneName,
          scheduledSlotStart: scheduledSlot.start,
          scheduledSlotEnd: scheduledSlot.end,
        })
      : null;

  return (
    <aside className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-semibold text-primary">
        Récapitulatif
      </h2>
      <dl className="mt-4 space-y-3 font-body text-sm">
        <div className="flex justify-between text-muted-foreground">
          <dt>Sous-total</dt>
          <dd>{formatPrice(cartTotals.subtotal)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Mode</dt>
          <dd>{mode === null ? "—" : RECEPTION_MODE_LABELS[mode]}</dd>
        </div>
        {mode === "delivery" && (
          <div className="flex justify-between text-muted-foreground">
            <dt>Frais de livraison</dt>
            <dd>{zoneId ? formatPrice(deliveryFee) : "Localité à choisir"}</dd>
          </div>
        )}
        {zoneName && mode === "delivery" && (
          <p className="text-xs text-muted-foreground">{zoneName}</p>
        )}
        {fulfillmentLine && (
          <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs leading-relaxed text-text">
            {fulfillmentLine}
          </p>
        )}
        <div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-text">
          <dt>Total</dt>
          <dd>{formatPrice(total)}</dd>
        </div>
      </dl>
    </aside>
  );
}

export function getDeliveryFee(
  mode: ReceptionMode | null,
  zonePrice: number,
): number {
  if (mode !== "delivery") return 0;
  return zonePrice;
}

export function useCheckoutTotal() {
  const mode = useCheckoutStore((state) => state.mode);
  const zoneId = useCheckoutStore((state) => state.zoneId);
  const cartTotals = useCartTotals();
  const { zones } = useDeliveryConfig();
  const deliveryFee = getDeliveryFee(mode, getZoneCost(zones, zoneId));

  return {
    subtotal: cartTotals.subtotal,
    deliveryFee,
    tax: 0,
    total: cartTotals.subtotal + deliveryFee,
    itemCount: cartTotals.itemCount,
    zoneName: getZoneName(zones, zoneId),
  };
}
