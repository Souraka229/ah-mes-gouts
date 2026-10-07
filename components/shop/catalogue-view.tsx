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
import { compareRoseOrder } from "@/lib/constants/rose-compositions";
import { cn } from "@/lib/utils";
import {
  defaultCatalogueFilters,
  type CatalogueFilters,
} from "@/types/product";
import type { Product } from "@/types/product";
import type { CatalogueMenuEditor } from "@/types/studio";
import { StudioMenuProductGrid } from "@/components/studio/studio-menu-product-grid";
import {
  CatalogueAlsoBrowse,
  CatalogueCategoryTabs,
  type CatalogueTabId,
} from "@/components/shop/catalogue-category-tabs";

type CatalogueTab = CatalogueTabId;

type CatalogueViewProps = {
  menuProducts?: Product[];
  allProducts?: Product[];
  /** Mode studio : même écran que le client, édition du menu du jour. */
  menuEditor?: CatalogueMenuEditor;
};

export function CatalogueView({
  menuProducts: menuProductsProp,
  allProducts: allProductsProp,
  menuEditor,
}: CatalogueViewProps) {
  const searchParams = useSearchParams();
  const initialPromotionsOnly = searchParams.get("promotions") === "1";
  const initialGiftsOnly = searchParams.get("cadeaux") === "1";

  const fullCatalog = useMemo(() => allProductsProp ?? [], [allProductsProp]);
  const menuCatalog = useMemo(
    () => menuProductsProp ?? fullCatalog.filter((p) => p.isMenuDuJour),
    [menuProductsProp, fullCatalog],
  );

  /** Aucun entremets commandable aujourd'hui : le menu du jour n'est pas publié. */
  const noMenuToday = menuCatalog.length === 0;

  const [activeTab, setActiveTab] = useState<CatalogueTab>(
    menuEditor ? "menu" : noMenuToday ? "fleurs" : "menu",
  );

  useEffect(() => {
    if (menuEditor) setActiveTab("menu");
  }, [menuEditor]);

  useEffect(() => {
    if (noMenuToday && !menuEditor && activeTab === "menu") {
      setActiveTab("fleurs");
    }
  }, [noMenuToday, menuEditor, activeTab]);

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

  const fleursCatalog = useMemo(
    () =>
      fullCatalog
        .filter((p) => getProductCategory(p) === "Fleurs")
        // Du plus petit bouquet au plus grand — l'ordre du catalogue est
        // alphabétique, donc « 10 roses » arrivait avant « 2 roses ».
        .sort(compareRoseOrder),
    [fullCatalog],
  );

  const nounoursCatalog = useMemo(
    () =>
      fullCatalog.filter(
        (p) => getProductCategory(p) === "Nounours",
      ),
    [fullCatalog],
  );

  const vinCatalog = useMemo(
    () =>
      fullCatalog.filter(
        (p) => getProductCategory(p) === "Vin / Spiritueux",
      ),
    [fullCatalog],
  );

  const carteCatalog = useMemo(
    () =>
      fullCatalog.filter((p) => {
        const cat = getProductCategory(p);
        return cat === "Carte" || cat === "Sur commande";
      }),
    [fullCatalog],
  );

  const filteredFleurs = useMemo(
    () => filterProducts(fleursCatalog, activeFilters),
    [fleursCatalog, activeFilters],
  );

  const filteredNounours = useMemo(
    () => filterProducts(nounoursCatalog, activeFilters),
    [nounoursCatalog, activeFilters],
  );

  const filteredVin = useMemo(
    () => filterProducts(vinCatalog, activeFilters),
    [vinCatalog, activeFilters],
  );

  const filteredCarte = useMemo(
    () => filterProducts(carteCatalog, activeFilters),
    [carteCatalog, activeFilters],
  );

  const activeCount =
    activeTab === "menu"
      ? filteredMenu.length
      : activeTab === "fleurs"
        ? filteredFleurs.length
        : activeTab === "nounours"
          ? filteredNounours.length
          : activeTab === "vin"
            ? filteredVin.length
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
      <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:gap-6">
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
    <div id="cadeaux" className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-primary sm:text-5xl">
          Catalogue
        </h1>
        <p className="mt-3 max-w-2xl font-body text-sm text-muted-foreground">
          Glaces, fleurs, nounours et carte cadeau — faites glisser les onglets
          ci-dessous.
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

      <CatalogueCategoryTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        hideMenuTab={noMenuToday && !menuEditor}
      />

      <div className="flex gap-8">
        <CatalogueFiltersSidebar {...filterPanelProps} />

        <div className="min-w-0 flex-1">
          {activeTab === "menu" && (
            <section
              id="menu-du-jour"
              aria-labelledby="menu-du-jour-title"
              onDoubleClick={
                menuEditor
                  ? (e) => {
                      if (e.target === e.currentTarget) menuEditor.onRequestAdd();
                    }
                  : undefined
              }
            >
              <div
                className={cn(
                  "mb-8 rounded-2xl border border-secondary/60 bg-secondary/15 px-5 py-6 sm:px-8",
                  menuEditor && "cursor-pointer ring-offset-2 hover:ring-2 hover:ring-secondary/50",
                )}
                onDoubleClick={menuEditor ? () => menuEditor.onRequestAdd() : undefined}
                title={menuEditor ? "Double-clic pour ajouter des créations" : undefined}
              >
                <p className="font-body text-xs font-semibold tracking-[0.28em] text-muted-foreground uppercase">
                  {menuEditor ? "Studio · aperçu client" : "Sélection du jour"}
                </p>
                <h2
                  id="menu-du-jour-title"
                  className="mt-2 font-display text-3xl font-bold text-primary sm:text-4xl"
                >
                  Le menu du jour
                </h2>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  {menuEditor
                    ? "Double-clic ici pour ajouter · glissez les cartes pour réordonner · corbeille au survol."
                    : noMenuToday
                      ? `${todayLabel} — la sélection d'aujourd'hui n'est pas encore en ligne.`
                      : `${todayLabel} — stock limité, renouvelé chaque jour.`}
                </p>
              </div>
              {menuEditor ? (
                menuEditor.products.length > 0 ? (
                  <StudioMenuProductGrid
                    products={menuEditor.products}
                    onReorder={menuEditor.onReorder}
                    onRemove={menuEditor.onRemove}
                  />
                ) : (
                  <button
                    type="button"
                    onDoubleClick={() => menuEditor.onRequestAdd()}
                    className="flex min-h-[220px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-secondary/70 bg-muted/30 px-6 text-center transition hover:border-secondary hover:bg-secondary/10"
                  >
                    <p className="font-display text-xl font-semibold text-primary">
                      Menu vide
                    </p>
                    <p className="mt-2 max-w-sm font-body text-sm text-muted-foreground">
                      Double-cliquez pour choisir les entremets de cette version.
                    </p>
                  </button>
                )
              ) : noMenuToday ? (
                <MenuUnavailableNotice
                  onBrowseAll={() => setActiveTab("all")}
                  onBrowseFleurs={() => setActiveTab("fleurs")}
                  onBrowseNounours={() => setActiveTab("nounours")}
                  onBrowseCarte={() => setActiveTab("carte")}
                />
              ) : (
                renderProductGrid(filteredMenu, true)
              )}
            </section>
          )}

          {activeTab === "fleurs" && (
            <section aria-labelledby="fleurs-title">
              <div className="mb-8 border-b border-border pb-6">
                <h2
                  id="fleurs-title"
                  className="font-display text-3xl font-bold text-primary sm:text-4xl"
                >
                  Fleurs &amp; bouquets
                </h2>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  Roses, gypsophile, bambou et bouquets composés — toujours
                  disponibles.
                </p>
                <CatalogueAlsoBrowse
                  className="mt-4"
                  exclude="fleurs"
                  hideMenu={noMenuToday && !menuEditor}
                  onSelect={setActiveTab}
                />
              </div>
              {renderProductGrid(filteredFleurs)}
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

          {activeTab === "vin" && (
            <section id="vin-spiritueux" aria-labelledby="vin-title">
              <div className="mb-8 border-b border-border pb-6">
                <h2
                  id="vin-title"
                  className="font-display text-3xl font-bold text-primary sm:text-4xl"
                >
                  Vin / Spiritueux
                </h2>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  Bouteilles à emporter ou à joindre à votre création.
                </p>
              </div>
              {renderProductGrid(filteredVin)}
            </section>
          )}

          {activeTab === "carte" && (
            <section aria-labelledby="carte-title">
              <div className="mb-8 border-b border-border pb-6">
                <h2
                  id="carte-title"
                  className="font-display text-3xl font-bold text-primary sm:text-4xl"
                >
                  Sur commande
                </h2>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  Grands entremets à la part — montés à la commande, 6 à 12 parts
                  selon la recette.
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

/**
 * Aucun menu du jour publié — message soigné plutôt qu'une grille vide.
 * On garde la cliente dans le catalogue en la renvoyant vers les sections
 * toujours disponibles (nounours, carte, cadeaux, grands entremets).
 */
function MenuUnavailableNotice({
  onBrowseAll,
  onBrowseFleurs,
  onBrowseNounours,
  onBrowseCarte,
}: {
  onBrowseAll: () => void;
  onBrowseFleurs: () => void;
  onBrowseNounours: () => void;
  onBrowseCarte: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-secondary/50 bg-gradient-to-b from-secondary/12 to-card px-6 py-14 text-center sm:px-12 sm:py-16">
      <p className="font-body text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
        Le fournil se prépare
      </p>
      <h3 className="mx-auto mt-4 max-w-xl text-balance font-display text-2xl font-semibold text-primary sm:text-3xl">
        Le menu du jour arrive bientôt
      </h3>
      <p className="mx-auto mt-4 max-w-md font-body text-sm leading-relaxed text-muted-foreground">
        Nos entremets glacés sont montés le matin même et mis en ligne dès leur
        sortie du laboratoire. La sélection du lendemain ouvre chaque soir à
        partir de 20&nbsp;h. En attendant, le reste de la maison vous attend.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onBrowseAll}
          className="cursor-pointer rounded-full bg-primary px-6 py-2.5 font-body text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Voir toute la carte
        </button>
        <button
          type="button"
          onClick={onBrowseFleurs}
          className="cursor-pointer rounded-full border border-border px-5 py-2.5 font-body text-sm font-semibold text-primary transition-colors hover:border-primary/40"
        >
          Fleurs
        </button>
        <button
          type="button"
          onClick={onBrowseNounours}
          className="cursor-pointer rounded-full border border-border px-5 py-2.5 font-body text-sm font-semibold text-primary transition-colors hover:border-primary/40"
        >
          Nounours
        </button>
        <button
          type="button"
          onClick={onBrowseCarte}
          className="cursor-pointer rounded-full border border-border px-5 py-2.5 font-body text-sm font-semibold text-primary transition-colors hover:border-primary/40"
        >
          Sur commande
        </button>
      </div>
    </div>
  );
}
