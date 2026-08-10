"use client";

import { ShoppingBag } from "lucide-react";

import { useCartStore } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

type CartIconButtonProps = {
  className?: string;
  /** Sur hero sombre : pastille glass, pas disque blanc opaque */
  variant?: "default" | "onDark";
};

/**
 * Bouton panier léger (sans Sheet / Framer) — le drawer est chargé à part.
 */
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
    <button
      type="button"
      onClick={toggleCart}
      onAnimationEnd={() => {
        if (cartPulse) acknowledgeCartPulse();
      }}
      className={cn(
        "relative flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        cartPulse && "animate-[cart-pulse_0.45s_ease-out]",
        onDark
          ? "border border-white/25 bg-white/10 text-bg backdrop-blur-sm hover:bg-white/18 focus-visible:outline-accent"
          : "border border-border bg-card text-primary hover:bg-muted focus-visible:outline-primary",
        className,
      )}
      aria-label={`Panier, ${itemCount} article${itemCount > 1 ? "s" : ""}`}
    >
      <ShoppingBag className="size-[1.15rem]" strokeWidth={1.75} aria-hidden />
      {itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-accent font-body text-[10px] font-bold text-accent-foreground shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      )}
    </button>
  );
}
