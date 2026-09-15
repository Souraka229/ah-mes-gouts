"use client";

import { useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProductExtras } from "@/components/shop/product-extras";
import { ProductMessageCard } from "@/components/shop/product-message-card";
import { RoseCompositionPicker } from "@/components/shop/rose-composition-picker";
import { useCartStore } from "@/lib/cart-store";
import { useCheckoutStore } from "@/lib/checkout-store";
import { formatPrice } from "@/lib/format";
import { NounoursSizePicker } from "@/components/shop/nounours-size-picker";
import {
  getProductPrice,
  getMaxOrderQuantity,
  isProductAvailable,
} from "@/lib/catalog-utils";
import {
  getNounoursEntryPrice,
  getNounoursSizeByCm,
  isNounoursProduct,
  NOUNOURS_SIZES,
} from "@/lib/constants/nounours-sizes";
import type { ProductRecommendation } from "@/lib/product-options/types";
import type { RoseCompositionOption } from "@/lib/product-options/compositions";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

type ProductPurchasePanelProps = {
  product: Product;
  /** Paliers de composition — fiche des roses uniquement. */
  roseCompositions?: RoseCompositionOption[];
  /** Compléments contextuels proposés sur cette fiche. */
  recommendation?: ProductRecommendation | null;
  /** Le mot manuscrit n'a pas de sens sur une pièce du menu du jour. */
  allowMessage?: boolean;
};

export function ProductPurchasePanel({
  product,
  roseCompositions,
  recommendation,
  allowMessage = false,
}: ProductPurchasePanelProps) {
  const addItem = useCartStore((state) => state.addItem);
  const setIsGift = useCheckoutStore((state) => state.setIsGift);
  const setGiftMessage = useCheckoutStore((state) => state.setGiftMessage);

  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [selectedCm, setSelectedCm] = useState<number>(NOUNOURS_SIZES[0]!.cm);
  const [selectedExtraSlugs, setSelectedExtraSlugs] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const isNounours = isNounoursProduct(product.slug);

  const available = isProductAvailable(product);
  const maxQuantity = getMaxOrderQuantity(product);

  const selectedSize = isNounours ? getNounoursSizeByCm(selectedCm) : undefined;
  const baseUnitPrice = isNounours
    ? (selectedSize?.price ?? getNounoursEntryPrice())
    : getProductPrice(product);

  const extras = (recommendation?.products ?? []).filter((candidate) =>
    selectedExtraSlugs.includes(candidate.slug),
  );
  const extrasTotal = extras.reduce(
    (sum, extra) => sum + getProductPrice(extra),
    0,
  );

  const unitPrice = baseUnitPrice;
  const totalPrice = unitPrice * quantity + extrasTotal;
  const displayName =
    isNounours && selectedSize
      ? `${product.name} — ${selectedSize.cm} cm`
      : product.name;

  const toggleExtra = (slug: string) =>
    setSelectedExtraSlugs((current) =>
      current.includes(slug)
        ? current.filter((entry) => entry !== slug)
        : [...current, slug],
    );

  const handleAddToCart = async () => {
    if (!available || isAdding) return;

    setIsAdding(true);
    await new Promise((resolve) => window.setTimeout(resolve, 450));

    addItem({
      productId: product.id,
      slug: product.slug,
      name: displayName,
      imageUrl: product.imageUrl,
      baseUnitPrice,
      supplements: [],
      quantity,
      sizeCm: isNounours ? selectedCm : undefined,
    });

    // Les compléments sont de vraies lignes de panier, facturées par le
    // serveur comme le produit principal — pas un supplément opaque.
    for (const extra of extras) {
      addItem({
        productId: extra.id,
        slug: extra.slug,
        name: extra.name,
        imageUrl: extra.imageUrl,
        baseUnitPrice: getProductPrice(extra),
        supplements: [],
        quantity: 1,
      });
    }

    // Un mot manuscrit suppose un destinataire : on bascule la commande en
    // cadeau, et le checkout demandera à qui l'adresser.
    if (allowMessage && message.trim()) {
      setGiftMessage(message.trim());
      setIsGift(true);
    }

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
          {isNounours ? "Prix" : "Prix de base"}
        </p>
        <p className="mt-2 font-display text-4xl font-semibold text-primary">
          {isNounours && !selectedSize
            ? `À partir de ${formatPrice(getNounoursEntryPrice())}`
            : formatPrice(baseUnitPrice)}
        </p>
        <p className="mt-4 font-body leading-relaxed text-muted-foreground">
          {product.description}
        </p>
      </div>

      {roseCompositions && roseCompositions.length > 1 && (
        <RoseCompositionPicker
          options={roseCompositions}
          currentSlug={product.slug}
        />
      )}

      {isNounours && (
        <NounoursSizePicker value={selectedCm} onChange={setSelectedCm} />
      )}

      {recommendation && recommendation.products.length > 0 && (
        <ProductExtras
          recommendation={recommendation}
          selectedSlugs={selectedExtraSlugs}
          onToggle={toggleExtra}
        />
      )}

      {allowMessage && (
        <ProductMessageCard message={message} onChange={setMessage} />
      )}

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
        {extras.length > 0 && (
          <ul className="mb-3 space-y-1.5 border-b border-border pb-3">
            <li className="flex items-center justify-between font-body text-sm">
              <span className="text-muted-foreground">
                {displayName}
                {quantity > 1 ? ` × ${quantity}` : ""}
              </span>
              <span className="tabular-nums text-text">
                {formatPrice(unitPrice * quantity)}
              </span>
            </li>
            {extras.map((extra) => (
              <li
                key={extra.slug}
                className="flex items-center justify-between font-body text-sm"
              >
                <span className="text-muted-foreground">{extra.name}</span>
                <span className="tabular-nums text-text">
                  {formatPrice(getProductPrice(extra))}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between font-body">
          <span className="text-muted-foreground">Total</span>
          <span className="text-2xl font-semibold text-text">
            {formatPrice(totalPrice)}
          </span>
        </div>
      </div>

      <Button
        variant={addedFeedback ? "default" : "cta"}
        size="lg"
        className={cn(
          "w-full cursor-pointer transition-all duration-200",
          addedFeedback && "bg-success text-primary-foreground hover:bg-success/90",
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
