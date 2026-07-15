"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

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

export function CartDrawer() {
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const totals = useCartTotals();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col border-l border-white/40 bg-card/75 p-0 shadow-2xl backdrop-blur-xl sm:max-w-md",
        )}
      >
        <SheetHeader className="border-b border-border/60 px-6 py-5">
          <SheetTitle className="font-display text-2xl text-primary">
            Votre panier
          </SheetTitle>
          <SheetDescription className="font-body">
            {totals.itemCount === 0
              ? "Votre panier est vide pour l'instant."
              : `${totals.itemCount} article${totals.itemCount > 1 ? "s" : ""}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Votre panier attend ses premières douceurs"
              description="Parcourez notre carte et composez l'assortiment qui fera plaisir — livraison rapide à Cotonou."
              className="border-0 bg-transparent"
            >
              <Link
                href="/catalogue"
                onClick={closeCart}
                className={cn(buttonVariants(), "cursor-pointer")}
              >
                Découvrir la carte
              </Link>
            </EmptyState>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const unitPrice = getLineUnitPrice(item);
                return (
                  <li
                    key={item.lineId}
                    className="rounded-2xl border border-border/70 bg-white/50 p-4"
                  >
                    <div className="flex gap-3">
                      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-bg">
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
                          <div>
                            <p className="font-display text-lg font-semibold text-primary">
                              {item.name}
                            </p>
                            <p className="font-body text-sm text-muted-foreground">
                              {formatPrice(unitPrice)} / unité
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.lineId)}
                            className="flex size-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-destructive"
                            aria-label={`Retirer ${item.name} du panier`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>

                        {item.supplements.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {item.supplements.map((supplement) => (
                              <li
                                key={supplement.id}
                                className="font-body text-xs text-muted-foreground"
                              >
                                + {supplement.name} ({formatPrice(supplement.price)})
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center rounded-full border border-border bg-bg">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.lineId, item.quantity - 1)
                              }
                              className="flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted"
                              aria-label="Diminuer la quantité"
                            >
                              <Minus className="size-4" />
                            </button>
                            <span className="min-w-8 text-center font-body text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.lineId, item.quantity + 1)
                              }
                              className="flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted"
                              aria-label="Augmenter la quantité"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                          <p className="font-body text-sm font-semibold text-text">
                            {formatPrice(getLineTotal(item))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border/60 bg-white/40 px-6 py-5 backdrop-blur-sm">
            <dl className="space-y-2 font-body text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Sous-total</dt>
                <dd>{formatPrice(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Livraison</dt>
                <dd>
                  {totals.delivery === 0
                    ? "Selon le mode choisi"
                    : formatPrice(totals.delivery)}
                </dd>
              </div>
              {totals.tax > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <dt>TVA</dt>
                  <dd>{formatPrice(totals.tax)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-text">
                <dt>Total</dt>
                <dd>{formatPrice(totals.total)}</dd>
              </div>
            </dl>

            <Link
              href="/checkout"
              onClick={closeCart}
              className={cn(
                buttonVariants(),
                "mt-4 flex h-11 w-full cursor-pointer items-center justify-center bg-accent text-text hover:bg-accent/90",
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

type CartIconButtonProps = {
  className?: string;
  /** Sur hero sombre : pastille glass, pas disque blanc opaque */
  variant?: "default" | "onDark";
};

export function CartIconButton({
  className,
  variant = "default",
}: CartIconButtonProps) {
  const itemCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );
  const cartPulse = useCartStore((state) => state.cartPulse);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const acknowledgeCartPulse = useCartStore(
    (state) => state.acknowledgeCartPulse,
  );
  const onDark = variant === "onDark";

  return (
    <motion.button
      type="button"
      onClick={toggleCart}
      animate={
        cartPulse
          ? { scale: [1, 1.18, 1], rotate: [0, -8, 8, 0] }
          : { scale: 1, rotate: 0 }
      }
      transition={{ duration: 0.45, ease: "easeOut" }}
      onAnimationComplete={() => {
        if (cartPulse) acknowledgeCartPulse();
      }}
      className={cn(
        "relative flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        onDark
          ? "border border-white/25 bg-white/10 text-bg backdrop-blur-sm hover:bg-white/18 focus-visible:outline-accent"
          : "border border-border bg-card text-primary hover:bg-muted focus-visible:outline-primary",
        className,
      )}
      aria-label={`Panier, ${itemCount} article${itemCount > 1 ? "s" : ""}`}
    >
      <ShoppingBag className="size-[1.15rem]" strokeWidth={1.75} aria-hidden />
      {itemCount > 0 && (
        <motion.span
          key={itemCount}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-accent font-body text-[10px] font-bold text-text shadow-[0_1px_4px_rgba(0,0,0,0.2)]"
        >
          {itemCount > 9 ? "9+" : itemCount}
        </motion.span>
      )}
    </motion.button>
  );
}
