"use client";

import { SlidersHorizontal } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CatalogueFilters } from "@/types/product";

export type CatalogueFiltersPanelProps = {
  filters: CatalogueFilters;
  minPrice: number;
  maxPrice: number;
  onFiltersChange: (filters: CatalogueFilters) => void;
  resultCount: number;
};

function FiltersContent({
  filters,
  minPrice,
  maxPrice,
  onFiltersChange,
  resultCount,
}: CatalogueFiltersPanelProps) {
  const update = (partial: Partial<CatalogueFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="font-body text-sm font-medium text-text">
          Prix ({formatPrice(filters.priceRange[0])} –{" "}
          {formatPrice(filters.priceRange[1])})
        </Label>
        <Slider
          className="mt-4"
          min={minPrice}
          max={maxPrice}
          step={100}
          value={filters.priceRange}
          onValueChange={(value) => {
            if (Array.isArray(value) && value.length === 2) {
              update({ priceRange: [value[0]!, value[1]!] });
            }
          }}
        />
      </div>

      <Separator />

      <div className="space-y-4">
        <FilterCheckbox
          id="in-stock"
          label="Disponibles uniquement"
          checked={filters.inStockOnly}
          onCheckedChange={(checked) =>
            update({ inStockOnly: checked === true })
          }
        />
        <FilterCheckbox
          id="new-only"
          label="Nouveautés"
          checked={filters.newOnly}
          onCheckedChange={(checked) => update({ newOnly: checked === true })}
        />
        <FilterCheckbox
          id="promo-only"
          label="Promotions"
          checked={filters.promotionsOnly}
          onCheckedChange={(checked) =>
            update({ promotionsOnly: checked === true })
          }
        />
      </div>

      <p className="font-body text-sm text-muted-foreground">
        {resultCount} produit{resultCount > 1 ? "s" : ""} trouvé
        {resultCount > 1 ? "s" : ""}
      </p>
    </div>
  );
}

type FilterCheckboxProps = {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

function FilterCheckbox({
  id,
  label,
  checked,
  onCheckedChange,
}: FilterCheckboxProps) {
  return (
    <div className="flex items-center gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="cursor-pointer"
      />
      <Label
        htmlFor={id}
        className="cursor-pointer font-body text-sm text-text"
      >
        {label}
      </Label>
    </div>
  );
}

function ResetButton({
  filters,
  minPrice,
  maxPrice,
  onFiltersChange,
}: CatalogueFiltersPanelProps) {
  return (
    <Button
      variant="ghost"
      className="w-full cursor-pointer"
      onClick={() =>
        onFiltersChange({
          ...filters,
          priceRange: [minPrice, maxPrice],
          inStockOnly: false,
          newOnly: false,
          promotionsOnly: false,
          giftsOnly: false,
        })
      }
    >
      Réinitialiser
    </Button>
  );
}

export function CatalogueFiltersSidebar(props: CatalogueFiltersPanelProps) {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-24 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold text-primary">
          Filtres
        </h2>
        <div className="mt-6">
          <FiltersContent {...props} />
        </div>
        <ResetButton {...props} />
      </div>
    </aside>
  );
}

export function CatalogueFiltersDrawer(props: CatalogueFiltersPanelProps) {
  return (
    <div className="lg:hidden">
      <Drawer>
        <DrawerTrigger
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 w-full cursor-pointer gap-2",
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filtres
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="font-display text-primary">
              Filtres
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-2">
            <FiltersContent {...props} />
          </div>
          <DrawerFooter>
            <ResetButton {...props} />
            <DrawerClose
              className={cn(buttonVariants(), "cursor-pointer")}
            >
              Appliquer
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
