"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IceCreamCone, Search } from "lucide-react";

import { EmptyState } from "@/components/shop/empty-state";
import {
  CatalogueFiltersDrawer,
  CatalogueFiltersSidebar,
} from "@/components/shop/catalogue-filters";
import { ProductCard } from "@/components/shop/product-card";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatTodayFrench } from "@/lib/format-date";
import {
  filterProducts,
  getPriceBounds,
  getProductCategory,
} from "@/lib/catalog-utils";
import { cn } from "@/lib/utils";
import {
  defaultCatalogueFilters,
  type CatalogueFilters,
} from "@/types/product";
import type { Product } from "@/types/product";

type CatalogueTab = "menu" | "nounours" | "carte" | "all";

type CatalogueViewProps = {
  menuProducts?: Product[];
  allProducts?: Product[];
};

export function CatalogueView({
  menuProducts: menuProductsProp,
  allProducts: allProductsProp,
}: CatalogueViewProps) {
  const searchParams = useSearchParams();
  const initialPromotionsOnly = searchParams.get("promotions") === "1";
  const initialGiftsOnly = searchParams.get("cadeaux") === "1";

  const fullCatalog = useMemo(() => allProductsProp ?? [], [allProductsProp]);
  const menuCatalog = useMemo(
    () => menuProductsProp ?? fullCatalog.filter((p) => p.isMenuDuJour),
    [menuProductsProp, fullCatalog],
  );

  const [activeTab, setActiveTab] = useState<CatalogueTab>("menu");

  const [minPrice, maxPrice] = useMemo(
    () => getPriceBounds(fullCatalog),
    [fullCatalog],
  );

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [filters, setFilters] = useState<CatalogueFilters>(() => ({
    ...defaultCatalogueFilters(minPrice, maxPrice),
    promotionsOnly: initialPromotionsOnly,
    giftsOnly: initialGiftsOnly,
  }));

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      promotionsOnly: searchParams.get("promotions") === "1",
      giftsOnly: searchParams.get("cadeaux") === "1",
    }));
  }, [searchParams]);

  const activeFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const filteredMenu = useMemo(
    () => filterProducts(menuCatalog, activeFilters),
    [menuCatalog, activeFilters],
  );

  const filteredAll = useMemo(
    () => filterProducts(fullCatalog, activeFilters),
    [fullCatalog, activeFilters],
  );

  const nounoursCatalog = useMemo(
    () =>
      fullCatalog.filter(
        (p) => getProductCategory(p) === "Nounours",
      ),
    [fullCatalog],
  );

  const carteCatalog = useMemo(
    () =>
      fullCatalog.filter((p) => {
        const cat = getProductCategory(p);
        return cat === "Carte" || cat === "Cadeaux";
      }),
    [fullCatalog],
  );

  const filteredNounours = useMemo(
    () => filterProducts(nounoursCatalog, activeFilters),
    [nounoursCatalog, activeFilters],
  );

  const filteredCarte = useMemo(
    () => filterProducts(carteCatalog, activeFilters),
    [carteCatalog, activeFilters],
  );

  const activeCount =
    activeTab === "menu"
      ? filteredMenu.length
      : activeTab === "nounours"
        ? filteredNounours.length
        : activeTab === "carte"
          ? filteredCarte.length
          : filteredAll.length;

  const filterPanelProps = {
    filters,
    minPrice,
    maxPrice,
    onFiltersChange: setFilters,
    resultCount: activeCount,
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash === "#menu-du-jour") {
      setActiveTab("menu");
      window.requestAnimationFrame(() => {
        document
          .getElementById("menu-du-jour")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else if (initialGiftsOnly) {
      const el = document.getElementById("cadeaux");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [initialGiftsOnly]);

  const todayLabel = formatTodayFrench();

  const renderProductGrid = (products: Product[], priorityFirst = false) =>
    products.length > 0 ? (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:gap-6">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            priority={priorityFirst && index < 4}
            keyword={activeTab === "menu" ? "Du jour" : undefined}
          />
        ))}
      </div>
    ) : (
      <EmptyState
        icon={IceCreamCone}
        title="Aucune création ne correspond"
        description="Élargissez vos filtres ou consultez une autre section du catalogue."
      />
    );

  return (
    <div id="cadeaux" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-semibold text-primary sm:text-5xl">
          Catalogue
        </h1>
        <p className="mt-3 max-w-2xl font-body text-muted-foreground">
          Explorez nos créations artisanales et trouvez la glace qui vous
          ressemble.
        </p>
      </div>

      <div className="relative mb-6">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Rechercher une glace..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-12 cursor-text pl-11 font-body"
          aria-label="Rechercher dans le catalogue"
        />
      </div>

      <div className="mb-6">
        <CatalogueFiltersDrawer {...filterPanelProps} />
      </div>

      <div
        className="mb-8 flex gap-2 overflow-x-auto rounded-full border border-border bg-muted/50 p-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Sections du catalogue"
      >
        {(
          [
            ["menu", "Menu du jour"],
            ["nounours", "Nounours"],
            ["carte", "Carte"],
            ["all", "Toute la carte"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={cn(
              "shrink-0 cursor-pointer rounded-full px-4 py-2.5 font-body text-sm font-semibold transition-colors",
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-primary",
            )}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-8">
        <CatalogueFiltersSidebar {...filterPanelProps} />

        <div className="min-w-0 flex-1">
          {activeTab === "menu" && (
            <section id="menu-du-jour" aria-labelledby="menu-du-jour-title">
              <div className="mb-8 rounded-2xl border border-secondary/60 bg-secondary/15 px-5 py-6 sm:px-8">
                <p className="font-body text-xs font-semibold tracking-[0.28em] text-muted-foreground uppercase">
                  Sélection du jour
                </p>
                <h2
                  id="menu-du-jour-title"
                  className="mt-2 font-display text-3xl font-bold text-primary sm:text-4xl"
                >
                  Le menu du jour
                </h2>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  {todayLabel} — stock limité, renouvelé chaque jour.
                </p>
              </div>
              {renderProductGrid(filteredMenu, true)}
            </section>
          )}

          {activeTab === "nounours" && (
            <section aria-labelledby="nounours-title">
              <div className="mb-8 border-b border-border pb-6">
                <h2
                  id="nounours-title"
                  className="font-display text-3xl font-bold text-primary sm:text-4xl"
                >
                  Nounours
                </h2>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  Toujours disponibles — parfaits en cadeau ou en upsell.
                </p>
              </div>
              {renderProductGrid(filteredNounours)}
            </section>
          )}

          {activeTab === "carte" && (
            <section aria-labelledby="carte-title">
              <div className="mb-8 border-b border-border pb-6">
                <h2
                  id="carte-title"
                  className="font-display text-3xl font-bold text-primary sm:text-4xl"
                >
                  Carte & cadeaux
                </h2>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  Cartes cadeau et surprises — commandables sans limite de stock.
                </p>
              </div>
              {renderProductGrid(filteredCarte)}
            </section>
          )}

          {activeTab === "all" && (
            <section aria-labelledby="toute-la-carte-title">
              <div className="mb-8 border-b border-border pb-6">
                <h2
                  id="toute-la-carte-title"
                  className="font-display text-3xl font-bold text-primary sm:text-4xl"
                >
                  Toute la carte
                </h2>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  L&apos;intégralité de nos créations artisanales.
                </p>
              </div>
              {renderProductGrid(filteredAll)}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
