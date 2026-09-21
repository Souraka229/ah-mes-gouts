"use client";

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

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={soldOut}
      className={cn(
        "flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors",
        soldOut
          ? "cursor-not-allowed border-border bg-muted/50 text-muted-foreground"
          : "cursor-pointer",
        !soldOut && selected
          ? "border-primary bg-primary/5 text-primary"
          : !soldOut && "border-border bg-card text-primary hover:border-primary/40",
      )}
      aria-pressed={selected}
    >
      <span className="font-body text-sm font-semibold">{variant.label}</span>
      <span className="font-body text-sm tabular-nums text-muted-foreground">
        {soldOut ? "Épuisé" : formatPrice(variant.price)}
      </span>
    </button>
  );
}
