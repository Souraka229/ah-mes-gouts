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
