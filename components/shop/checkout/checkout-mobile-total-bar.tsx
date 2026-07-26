"use client";

import { formatPrice } from "@/lib/format";
import { useCheckoutTotal } from "@/components/shop/checkout/checkout-summary";

/** Total sticky en bas — visible pendant tout le checkout mobile. */
export function CheckoutMobileTotalBar() {
  const { total, itemCount } = useCheckoutTotal();

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
        <div>
          <p className="font-body text-xs text-muted-foreground">
            {itemCount} article{itemCount > 1 ? "s" : ""}
          </p>
          <p className="font-display text-xl font-semibold text-primary">
            {formatPrice(total)}
          </p>
        </div>
        <p className="max-w-[45%] text-right font-body text-[11px] leading-snug text-muted-foreground">
          Montant final — livraison incluse si choisie
        </p>
      </div>
    </div>
  );
}
