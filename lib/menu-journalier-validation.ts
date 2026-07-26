import type { Product } from "@/types/product";

export type OrderabilityResult = {
  isOrderable: boolean;
  reason?: string;
  isUpsell: boolean;
};

/**
 * Règle métier : Règle stricte des Menus Journalisés & Exceptions Upsell.
 * - Les produits Upsell / Cadeaux / Cartes Cadeaux (isGiftCard) sont TOUJOURS commandables.
 * - Les desserts du menu du jour ne peuvent être commandés QUE SI le menu correspondant est actif/journalisé.
 */
export function checkProductOrderability(
  product: Pick<Product, "id" | "slug" | "isMenuDuJour" | "isGiftCard"> & { keyword?: string },
  activeMenuProductIds: string[] = []
): OrderabilityResult {
  const keywordLower = typeof product.keyword === "string" ? product.keyword.toLowerCase() : "";
  const slugLower = typeof product.slug === "string" ? product.slug.toLowerCase() : "";

  // 🎁 EXCEPTION : Upsells, cartes cadeaux et coffrets sont TOUJOURS autorisés
  const isUpsell =
    Boolean(product.isGiftCard) ||
    slugLower.includes("cadeau") ||
    slugLower.includes("carte") ||
    keywordLower.includes("cadeau") ||
    keywordLower.includes("upsell") ||
    keywordLower.includes("accessoire");

  if (isUpsell) {
    return {
      isOrderable: true,
      isUpsell: true,
    };
  }

  // 🗓️ Règle Menu du Jour : Doit faire partie des IDs du menu actif si activeMenuProductIds est fourni
  if (activeMenuProductIds.length > 0) {
    const isIncludedInActiveMenu = activeMenuProductIds.includes(product.id) || activeMenuProductIds.includes(product.slug);
    if (!isIncludedInActiveMenu) {
      return {
        isOrderable: false,
        reason: "Produit hors menu du jour actif",
        isUpsell: false,
      };
    }
  }

  return {
    isOrderable: true,
    isUpsell: false,
  };
}
