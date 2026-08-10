"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/shop/empty-state";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCartStore, useCartTotals } from "@/lib/cart-store";
import { getLineUnitPrice, getLineTotal } from "@/lib/cart-utils";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

function useIsMobileSheet() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return mobile;
}

function CartLineItem({
  item,
  onRemove,
  onDecrease,
  onIncrease,
}: {
  item: ReturnType<typeof useCartStore.getState>["items"][number];
  onRemove: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const unitPrice = getLineUnitPrice(item);

  return (
    <li className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-bg sm:size-20">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="80px"
            className="object-contain object-center"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold text-primary sm:text-lg">
                {item.name}
              </p>
              <p className="font-body text-xs text-muted-foreground sm:text-sm">
                {formatPrice(unitPrice)} / unité
              </p>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Retirer ${item.name}`}
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          {item.supplements.length > 0 && (
            <p className="mt-1 font-body text-xs text-muted-foreground">
              {item.supplements
                .map((s) => `+ ${s.name} (${formatPrice(s.price)})`)
                .join(" · ")}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center rounded-full border border-border bg-bg">
              <button
                type="button"
                onClick={onDecrease}
                className="flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted active:bg-muted"
                aria-label="Diminuer"
              >
                <Minus className="size-4" />
              </button>
              <span className="min-w-8 text-center font-body text-sm font-semibold">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={onIncrease}
                className="flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted active:bg-muted"
                aria-label="Augmenter"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <p className="font-body text-sm font-semibold text-text tabular-nums">
              {formatPrice(getLineTotal(item))}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

export function CartDrawer() {
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const totals = useCartTotals();
  const isMobile = useIsMobileSheet();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-0 overflow-hidden border-border bg-bg p-0 shadow-2xl",
          isMobile
            ? "inset-x-0 bottom-0 top-auto h-[min(88dvh,100%)] max-h-[88dvh] w-full rounded-t-2xl border-t"
            : "h-dvh max-h-dvh w-full sm:max-w-md",
        )}
      >
        <SheetHeader className="shrink-0 border-b border-border px-4 py-4 pr-14 sm:px-6">
          <SheetTitle className="font-display text-xl text-primary sm:text-2xl">
            Votre panier
          </SheetTitle>
          <SheetDescription className="font-body text-sm">
            {totals.itemCount === 0
              ? "Votre panier est vide pour l'instant."
              : `${totals.itemCount} article${totals.itemCount > 1 ? "s" : ""}`}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 sm:py-4">
          {items.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Votre panier attend ses premières douceurs"
              description="Parcourez la carte et composez votre assortiment."
              className="border-0 bg-transparent py-8"
            >
              <Link
                href="/catalogue"
                onClick={closeCart}
                className={cn(buttonVariants(), "min-h-11 cursor-pointer")}
              >
                Découvrir la carte
              </Link>
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <CartLineItem
                  key={item.lineId}
                  item={item}
                  onRemove={() => removeItem(item.lineId)}
                  onDecrease={() =>
                    updateQuantity(item.lineId, item.quantity - 1)
                  }
                  onIncrease={() =>
                    updateQuantity(item.lineId, item.quantity + 1)
                  }
                />
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="shrink-0 border-t border-border bg-bg px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(36,23,38,0.08)] sm:px-6">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="font-body text-xs text-muted-foreground">
                  Sous-total · livraison au checkout
                </p>
                <p className="font-display text-2xl font-semibold text-primary tabular-nums">
                  {formatPrice(totals.subtotal)}
                </p>
              </div>
              <p className="max-w-[40%] text-right font-body text-[11px] leading-snug text-muted-foreground">
                {totals.itemCount} article{totals.itemCount > 1 ? "s" : ""}
              </p>
            </div>

            <Link
              href="/checkout"
              onClick={closeCart}
              className={cn(
                buttonVariants(),
                "mt-4 flex min-h-12 w-full cursor-pointer items-center justify-center bg-accent text-base font-bold text-accent-foreground hover:bg-accent/90 active:scale-[0.99]",
              )}
            >
              Passer commande
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
