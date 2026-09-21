export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  /** Jusqu'à 3 images — imageUrl = imageUrls[0] */
  imageUrls?: string[];
  /** Mot-clé affiché sur la carte menu (ex: Solaire, Floral) */
  keyword?: string;
  /** Format entremets : en cœur ou en carré */
  shape?: "coeur" | "carre";
  stockRemaining: number;
  stockMinimum: number;
  isNew: boolean;
  isPromotion: boolean;
  promotionPrice?: number;
  isMenuDuJour: boolean;
  isPopular: boolean;
  updatedAt: string;
  /** Produit carte cadeau — message pré-rempli en mode cadeau */
  isGiftCard?: boolean;
  giftCardMessage?: string;
  /** Catégorie back-office (Entremets, Nounours, Carte…) */
  category?: string;
  /**
   * Visibilité éditoriale : `draft` | `published` | `hidden`.
   * Défaut `published` — un produit existant reste visible.
   */
  visibility?: ProductVisibility;
  /** Libellé du sélecteur de variante : « Taille », « Format », « Personnes ». */
  variantLabel?: string;
  /** Sous-type libre piloté par l'admin (nounours : stitch | teddy | labubu). */
  subtype?: string;
  /**
   * Variantes actives, quand le produit en a.
   *
   * Rempli par les lectures boutique ; le prix facturé est toujours recalculé
   * côté serveur, ces valeurs ne servent qu'à l'affichage.
   */
  variants?: ProductVariantView[];
};

export type ProductVisibility = "draft" | "published" | "hidden";

/** Variante telle que l'interface la consomme. */
export type ProductVariantView = {
  id: string;
  code: string;
  label: string;
  price: number;
  sortOrder: number;
  isActive: boolean;
  stockRemaining: number | null;
};

export type CatalogueFilters = {
  search: string;
  priceRange: [number, number];
  inStockOnly: boolean;
  newOnly: boolean;
  promotionsOnly: boolean;
  giftsOnly: boolean;
};

export const defaultCatalogueFilters = (
  minPrice: number,
  maxPrice: number,
): CatalogueFilters => ({
  search: "",
  priceRange: [minPrice, maxPrice],
  inStockOnly: false,
  newOnly: false,
  promotionsOnly: false,
  giftsOnly: false,
});
