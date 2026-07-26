"use client";

import { useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import {
  getProductPrice,
  getMaxOrderQuantity,
  isProductAvailable,
} from "@/lib/catalog-utils";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

type ProductPurchasePanelProps = {
  product: Product;
};

export function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const available = isProductAvailable(product);
  const baseUnitPrice = getProductPrice(product);
  const maxQuantity = getMaxOrderQuantity(product);

  const unitPrice = baseUnitPrice;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = async () => {
    if (!available || isAdding) return;

    setIsAdding(true);
    await new Promise((resolve) => window.setTimeout(resolve, 450));

    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      baseUnitPrice,
      supplements: [],
      quantity,
    });

    setIsAdding(false);
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 1200);
  };

  if (!available) {
    return (
      <div className="rounded-2xl border border-border bg-muted/60 p-6">
        <p className="font-display text-2xl font-semibold text-primary">
          Produit épuisé
        </p>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          Cette création n&apos;est plus disponible pour le moment. Revenez
          bientôt ou explorez nos autres parfums.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="font-body text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Prix de base
        </p>
        <p className="mt-2 font-display text-4xl font-semibold text-primary">
          {formatPrice(baseUnitPrice)}
        </p>
        <p className="mt-4 font-body leading-relaxed text-muted-foreground">
          {product.description}
        </p>
      </div>

      <div>
        <Label className="font-display text-xl font-semibold text-primary">
          Quantité
        </Label>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex items-center rounded-full border border-border bg-card">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted"
              aria-label="Diminuer la quantité"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-10 text-center font-body text-base font-semibold">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((value) =>
                  Math.min(maxQuantity, value + 1),
                )
              }
              disabled={quantity >= maxQuantity}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Augmenter la quantité"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between font-body">
          <span className="text-muted-foreground">Total</span>
          <span className="text-2xl font-semibold text-text">
            {formatPrice(totalPrice)}
          </span>
        </div>
      </div>

      <Button
        className={cn(
          "h-12 w-full cursor-pointer text-base font-semibold transition-all duration-200",
          addedFeedback
            ? "bg-success text-primary-foreground hover:bg-success/90"
            : "bg-accent text-text hover:bg-accent/90",
        )}
        disabled={isAdding}
        onClick={handleAddToCart}
      >
        {isAdding ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Ajout en cours...
          </>
        ) : addedFeedback ? (
          "Ajouté au panier"
        ) : (
          "Ajouter au panier"
        )}
      </Button>
    </div>
  );
}
