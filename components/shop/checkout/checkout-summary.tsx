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
import { useCheckoutQuoteStore } from "@/lib/checkout-quote-store";
import { RECEPTION_MODE_LABELS, type ReceptionMode } from "@/types/order";

export function CheckoutSummary() {
  const mode = useCheckoutStore((state) => state.mode);
  const zoneId = useCheckoutStore((state) => state.zoneId);
  const scheduledSlot = useCheckoutStore((state) => state.scheduledSlot);
  const cartTotals = useCartTotals();
  const { zones } = useDeliveryConfig();
  const quote = useCheckoutQuoteStore((state) => state.quote);
  const quoteLoading = useCheckoutQuoteStore((state) => state.loading);
  const quoteError = useCheckoutQuoteStore((state) => state.error);

  const zoneName = quote?.zoneName ?? getZoneName(zones, zoneId);
  const fallbackFee = getDeliveryFee(mode, getZoneCost(zones, zoneId));
  const subtotal = quote?.subtotal ?? cartTotals.subtotal;
  const deliveryFee = quote?.deliveryFee ?? fallbackFee;
  const total = quote?.total ?? subtotal + deliveryFee;

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
          <dd>{formatPrice(subtotal)}</dd>
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
        <p className="text-xs text-muted-foreground">
          {quoteLoading
            ? "Actualisation du montant…"
            : quoteError
              ? "Montant estimé — vérification finale au paiement"
              : "Montant vérifié par le serveur"}
        </p>
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
  const quote = useCheckoutQuoteStore((state) => state.quote);
  const quoteLoading = useCheckoutQuoteStore((state) => state.loading);
  const fallbackFee = getDeliveryFee(mode, getZoneCost(zones, zoneId));
  const deliveryFee = quote?.deliveryFee ?? fallbackFee;
  const subtotal = quote?.subtotal ?? cartTotals.subtotal;

  return {
    subtotal,
    deliveryFee,
    tax: 0,
    total: quote?.total ?? subtotal + deliveryFee,
    itemCount: cartTotals.itemCount,
    zoneName: quote?.zoneName ?? getZoneName(zones, zoneId),
    quoteLoading,
  };
}
