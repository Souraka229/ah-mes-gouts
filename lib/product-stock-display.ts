import type { Product } from "@/types/product";

/**
 * Stock réellement disponible pour un produit.
 *
 * Pourquoi cette fonction existe : un produit **à variantes** ne décrémente pas
 * `Product.stockRemaining` à la commande — c'est le stock de la variante qui
 * descend (voir `decrementStockForClaim`). Lire directement
 * `product.stockRemaining` fait donc passer un produit à variantes pour
 * toujours disponible, et aucune alerte d'épuisement ne remonte jamais.
 *
 * Retourne `null` quand le stock n'est pas suivi : ces produits (fleurs,
 * nounours, chocolats…) sont montés à la demande et restent commandables.
 * `null` n'est donc PAS « zéro » — c'est « illimité ».
 */
export function getEffectiveStock(product: Product): number | null {
  const activeVariants = (product.variants ?? []).filter((v) => v.isActive);

  if (activeVariants.length > 0) {
    // Une seule variante non suivie suffit à rendre le produit toujours
    // commandable : le total n'aurait alors aucun sens.
    if (activeVariants.some((v) => v.stockRemaining === null)) return null;
    return activeVariants.reduce((sum, v) => sum + (v.stockRemaining ?? 0), 0);
  }

  return product.stockRemaining;
}

/** Vrai quand le stock est suivi et qu'il touche le seuil d'alerte. */
export function isLowStock(product: Product): boolean {
  const remaining = getEffectiveStock(product);
  if (remaining === null) return false;
  return remaining > 0 && remaining <= product.stockMinimum;
}

/** Vrai quand le stock est suivi et entièrement écoulé. */
export function isExhausted(product: Product): boolean {
  return getEffectiveStock(product) === 0;
}

export function getLowStockLabel(product: Product): string {
  const n = getEffectiveStock(product);
  if (n === null) return "Disponible";
  return n === 1 ? "Plus qu'1 disponible" : `Plus que ${n} disponibles`;
}
