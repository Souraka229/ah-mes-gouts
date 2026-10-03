"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import {
  CATEGORY_FAMILIES,
  isDailyMenuCategory,
  normalizeProductCategory,
} from "@/lib/admin/categories";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PickableProduct = {
  id: string;
  name: string;
  category?: string;
};

type MenuProductPickerProps = {
  catalog: PickableProduct[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

type PickerFamily = "jour" | "permanente";

/**
 * Choix des pièces du menu — groupé par famille, avec recherche.
 * Les entremets sont proposés d’abord : c’est le cœur du menu du jour.
 */
export function MenuProductPicker({
  catalog,
  selectedIds,
  onToggle,
}: MenuProductPickerProps) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<PickerFamily>("jour");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((product) => {
      const inFamily =
        family === "jour"
          ? isDailyMenuCategory(product.category)
          : !isDailyMenuCategory(product.category);
      if (!inFamily) return false;
      if (!q) return true;
      return product.name.toLowerCase().includes(q);
    });
  }, [catalog, family, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PickableProduct[]>();
    for (const product of filtered) {
      const key = normalizeProductCategory(product.category);
      const list = map.get(key) ?? [];
      list.push(product);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

  const familyDef =
    family === "jour" ? CATEGORY_FAMILIES.jour : CATEGORY_FAMILIES.permanente;

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-full border border-border bg-muted/50 p-1">
        {(["jour", "permanente"] as const).map((id) => {
          const def = CATEGORY_FAMILIES[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFamily(id)}
              className={cn(
                "min-h-10 flex-1 cursor-pointer rounded-full px-3 py-1.5 font-body text-xs font-semibold transition-colors",
                family === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-primary",
              )}
            >
              {def.label}
            </button>
          );
        })}
      </div>

      <p className="font-body text-xs text-muted-foreground">{familyDef.hint}</p>

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une création…"
          className="h-11 cursor-text pl-10"
          aria-label="Rechercher dans le catalogue"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">
          Aucune création dans ce groupe.
        </p>
      ) : (
        <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
          {familyDef.categories.map((category) => {
            const items = grouped.get(category);
            if (!items?.length) return null;
            return (
              <div key={category}>
                {family === "permanente" && (
                  <p className="mb-1.5 font-body text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    {category}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {items.map((product) => {
                    const selected = selectedIds.includes(product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => onToggle(product.id)}
                        className={cn(
                          "cursor-pointer rounded-full border px-3 py-1.5 font-body text-xs font-medium transition-colors",
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        {product.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
