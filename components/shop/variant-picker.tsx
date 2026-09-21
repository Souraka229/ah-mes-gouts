"use client";

import { Check } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductVariantView } from "@/types/product";

type VariantPickerProps = {
  /** Libellé du sélecteur : « Taille », « Format », « Personnes ». */
  label: string;
  variants: ProductVariantView[];
  /** Code de la variante sélectionnée. */
  value: string | undefined;
  onChange: (code: string) => void;
};

/**
 * Sélecteur de variante **générique** — tailles de nounours, formats de
 * bouquet, nombre de personnes d'un entremets.
 *
 * Les paliers viennent du serveur (base de données), pas d'une constante du
 * code : une taille désactivée au back-office disparaît d'ici, un prix modifié
 * s'y reflète. Le prix affiché est celui du serveur ; le serveur le recalcule
 * de toute façon au moment de la commande.
 */
export function VariantPicker({
  label,
  variants,
  value,
  onChange,
}: VariantPickerProps) {
  const active = variants
    .filter((variant) => variant.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

  if (active.length === 0) return null;

  return (
    <div>
      <p className="font-display text-xl font-semibold text-primary">{label}</p>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        Choisissez — le prix s&apos;ajuste automatiquement.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {active.map((variant) => (
          <li key={variant.id}>
            <VariantOption
              variant={variant}
              selected={value === variant.code}
              onSelect={() => onChange(variant.code)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function VariantOption({
  variant,
  selected,
  onSelect,
}: {
  variant: ProductVariantView;
  selected: boolean;
  onSelect: () => void;
}) {
  // Stock porté par la variante : une taille peut être épuisée sans que le
  // produit le soit.
  const soldOut = variant.stockRemaining !== null && variant.stockRemaining <= 0;
  const price = soldOut ? "Épuisé" : formatPrice(variant.price);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={soldOut}
      aria-pressed={selected}
      aria-label={`${variant.label} — ${price}`}
      className={cn(
        "group relative flex w-full flex-col gap-1 rounded-2xl border p-4 text-left transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none",
        soldOut
          ? "cursor-not-allowed border-dashed border-border bg-muted/40"
          : "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_28px_rgba(59,31,77,0.07)]",
        !soldOut &&
          selected &&
          "border-primary bg-primary/[0.04] shadow-[0_10px_28px_rgba(59,31,77,0.09)]",
      )}
    >
      {selected && !soldOut && (
        <span
          className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-hidden
        >
          <Check className="size-3" />
        </span>
      )}

      <span
        className={cn(
          "font-body text-sm font-semibold",
          soldOut ? "text-muted-foreground line-through" : "text-primary",
        )}
      >
        {variant.label}
      </span>

      <span
        className={cn(
          "font-display text-lg font-semibold tabular-nums",
          soldOut ? "text-muted-foreground" : "text-text",
        )}
      >
        {price}
      </span>
    </button>
  );
}
