"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Plus } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { getProductPrice } from "@/lib/catalog-utils";
import {
  hasProductImage,
  ProductImagePlaceholder,
} from "@/components/shop/product-image-placeholder";
import type { ProductRecommendation } from "@/lib/product-options/types";
import { cn } from "@/lib/utils";

type ProductExtrasProps = {
  recommendation: ProductRecommendation;
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
};

/**
 * « Ajoutez une petite douceur » — compléments de la fiche produit.
 *
 * Proposer, jamais imposer : chaque complément est un simple interrupteur,
 * décocher suffit à refuser, et « Non merci » masque le bloc. Les produits
 * affichés sont de vraies lignes catalogue, donc de vraies lignes de panier.
 */
export function ProductExtras({
  recommendation,
  selectedSlugs,
  onToggle,
}: ProductExtrasProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-semibold text-primary">
        {recommendation.title}
      </h2>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        {recommendation.subtitle}
      </p>

      <ul className="mt-4 space-y-2">
        {recommendation.products.map((product) => {
          const selected = selectedSlugs.includes(product.slug);

          return (
            <li key={product.slug}>
              <button
                type="button"
                onClick={() => onToggle(product.slug)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  selected
                    ? "border-success bg-success/10"
                    : "border-border hover:border-primary/40",
                )}
              >
                <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-bg">
                  {hasProductImage(product.imageUrl) ? (
                    <Image
                      src={product.imageUrl}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-contain object-center"
                    />
                  ) : (
                    <ProductImagePlaceholder compact className="absolute inset-0" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-body text-sm font-semibold text-primary">
                    {product.name}
                  </span>
                  <span className="block font-body text-xs tabular-nums text-muted-foreground">
                    + {formatPrice(getProductPrice(product))}
                  </span>
                </span>

                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 font-body text-xs font-semibold",
                    selected
                      ? "bg-success/20 text-text"
                      : "bg-muted text-primary",
                  )}
                >
                  {selected ? (
                    <>
                      <Check className="size-3.5" aria-hidden />
                      Ajouté
                    </>
                  ) : (
                    <>
                      <Plus className="size-3.5" aria-hidden />
                      Ajouter
                    </>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="mt-3 cursor-pointer font-body text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
      >
        Non merci
      </button>
    </section>
  );
}
