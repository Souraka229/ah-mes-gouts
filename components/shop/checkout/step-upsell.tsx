"use client";

import Image from "next/image";
import { Gift, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getNextStep, useCheckoutStore } from "@/lib/checkout-store";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import {
  getProductPrice,
  getUpsellProducts,
  isGiftCardProduct,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function StepUpsell() {
  const setStep = useCheckoutStore((state) => state.setStep);
  const mode = useCheckoutStore((state) => state.mode);
  const isGift = useCheckoutStore((state) => state.isGift);
  const gift = useCheckoutStore((state) => state.gift);
  const setGiftMessage = useCheckoutStore((state) => state.setGiftMessage);
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);

  const upsellProducts = getUpsellProducts(
    cartItems.map((item) => item.productId),
  );

  const handleSkip = () => {
    const next = getNextStep("upsell", mode);
    if (next) setStep(next);
  };

  const handleAdd = (product: (typeof upsellProducts)[number]) => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      baseUnitPrice: getProductPrice(product),
      supplements: [],
      quantity: 1,
    });

    if (
      isGift &&
      isGiftCardProduct(product) &&
      product.giftCardMessage &&
      !gift.giftMessage.trim()
    ) {
      setGiftMessage(product.giftCardMessage);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
          Et si vous vous faisiez plaisir ?
        </h1>
        <p className="mt-2 font-body text-muted-foreground">
          {isGift
            ? "Ajoutez une carte cadeau pour personnaliser votre surprise."
            : "Quelques créations qui accompagnent parfaitement votre commande."}
        </p>
      </div>

      {isGift && gift.giftMessage.trim() && (
        <div className="rounded-2xl border border-secondary bg-secondary/20 px-4 py-3 font-body text-sm text-text">
          Message cadeau pré-rempli — modifiable à l&apos;étape précédente si besoin.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {upsellProducts.map((product) => {
          const isCard = isGiftCardProduct(product);

          return (
            <article
              key={product.id}
              className={cn(
                "flex gap-4 rounded-2xl border bg-card p-4",
                isCard && isGift
                  ? "border-secondary ring-2 ring-secondary/30"
                  : "border-border",
              )}
            >
              <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-bg">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  sizes="96px"
                  unoptimized={product.imageUrl.endsWith(".svg")}
                  className="object-contain object-center"
                />
                {isCard && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                    <Gift className="size-6 text-primary" aria-hidden />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="font-display text-lg font-semibold text-primary">
                  {product.name}
                </p>
                <p className="mt-1 font-body text-sm text-muted-foreground">
                  {formatPrice(getProductPrice(product))}
                </p>
                {isCard && isGift && product.giftCardMessage && (
                  <p className="mt-2 line-clamp-2 font-body text-xs text-muted-foreground italic">
                    &ldquo;{product.giftCardMessage}&rdquo;
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-auto w-fit cursor-pointer gap-1"
                  onClick={() => handleAdd(product)}
                >
                  <Plus className="size-4" aria-hidden />
                  Ajouter
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="h-11 flex-1 cursor-pointer bg-accent text-text hover:bg-accent/90"
          onClick={handleSkip}
        >
          Continuer vers le paiement
        </Button>
        <Button
          variant="ghost"
          className="h-11 cursor-pointer font-body text-muted-foreground"
          onClick={handleSkip}
        >
          Passer cette étape
        </Button>
      </div>
    </div>
  );
}
