import {
  getProductCategory,
  getProductPrice,
  isProductAvailable,
} from "@/lib/catalog-utils";
import type { Product } from "@/types/product";

/**
 * Compléments qu'on peut ajouter à une création.
 *
 * Ce sont de vrais produits du catalogue, donc de vraies lignes de panier :
 * le serveur les refacture comme n'importe quel autre article. Aucun système
 * de supplément parallèle.
 */
const EXTRA_CATEGORIES = ["Chocolats"];

export function isExtraProduct(product: Product): boolean {
  return EXTRA_CATEGORIES.includes(getProductCategory(product));
}

export function getExtraProducts(catalog: Product[]): Product[] {
  return catalog
    .filter(isProductAvailable)
    .filter(isExtraProduct)
    .sort((a, b) => getProductPrice(a) - getProductPrice(b));
}
