"use client";

import { formatPrice } from "@/lib/format";
import {
  NOUNOURS_SIZES,
  type NounoursSize,
  getNounoursTypeFromSlug,
} from "@/lib/constants/nounours-sizes";
import { cn } from "@/lib/utils";

type NounoursSizePickerProps = {
  value: number;
  onChange: (cm: number) => void;
  slug?: string;
};

export function NounoursSizePicker({ value, onChange, slug }: NounoursSizePickerProps) {
  const nounoursType = getNounoursTypeFromSlug(slug ?? "nounours");
  return (
    <div>
      <p className="font-display text-xl font-semibold text-primary">
        Nounours {nounoursType !== "Nounours" ? nounoursType : ""}
      </p>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        Choisissez la taille du nounours {nounoursType !== "Nounours" ? `— ${nounoursType}` : ""} — le prix s&apos;ajuste automatiquement.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {NOUNOURS_SIZES.map((size) => (
          <li key={size.cm}>
            <SizeOption
              size={size}
              selected={value === size.cm}
              onSelect={() => onChange(size.cm)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SizeOption({
  size,
  selected,
  onSelect,
}: {
  size: NounoursSize;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 text-primary"
          : "border-border bg-card text-primary hover:border-primary/40",
      )}
      aria-pressed={selected}
    >
      <span className="font-body text-sm font-semibold">{size.cm} cm</span>
      <span className="font-body text-sm tabular-nums text-muted-foreground">
        {formatPrice(size.price)}
      </span>
    </button>
  );
}
