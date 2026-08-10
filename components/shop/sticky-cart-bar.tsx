"use client";

import { ArrowRight, ShoppingBag } from "lucide-react";

import { useCartItemCount, useCartStore, useCartTotals } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";

export function StickyCartBar() {
  const itemCount = useCartItemCount();
  const totals = useCartTotals();
  const openCart = useCartStore((state) => state.openCart);
  const isOpen = useCartStore((state) => state.isOpen);

  if (itemCount === 0 || isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-primary/95 p-3 text-white shadow-2xl backdrop-blur-md">
        <button
          type="button"
          onClick={openCart}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <div className="relative flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <ShoppingBag className="size-5" />
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-primary shadow">
              {itemCount}
            </span>
          </div>

          <div>
            <p className="font-body text-xs font-medium text-white/80">
              {itemCount} article{itemCount > 1 ? "s" : ""} sélectionné{itemCount > 1 ? "s" : ""}
            </p>
            <p className="font-display text-base font-bold text-accent">
              {formatPrice(totals.subtotal)}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCart}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-body text-xs font-bold text-accent-foreground transition-transform active:scale-95 shadow-md"
          >
            <span>Panier</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
