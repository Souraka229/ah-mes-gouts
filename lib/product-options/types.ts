import { getProductCategory, isGiftCardProduct } from "@/lib/catalog-utils";
import type { Product } from "@/types/product";

/**
 * Options de personnalisation proposées sur la fiche produit.
 *
 * Rien n'est calculé ici : les prix viennent toujours des lignes catalogue,
 * que `priceOrderItems` refacture côté serveur. Ces helpers ne font que
 * décrire ce que la base ne sait pas dire et choisir quoi proposer.
 */

/** Le mot part dans `Order.giftMessage`, colonne `varchar(280)`. */
export const GIFT_MESSAGE_MAX = 280;

export type ProductRecommendation = {
  id: string;
  title: string;
  subtitle: string;
  /** Toujours de vrais produits du catalogue — jamais un slug inventé. */
  products: Product[];
};

/**
 * Le mot manuscrit est offert **sur les cartes uniquement**.
 *
 * La règle précédente (`!isMenuDuJour`) l'affichait sur presque tout le
 * catalogue, entremets et glaces compris, en annonçant « Offert » sur des
 * produits qui ne portent pas de carte. Le bloc de saisie ne doit apparaître
 * que là où la carte est réellement jointe.
 */
export function canCarryMessage(product: Product): boolean {
  if (isGiftCardProduct(product)) return true;
  return getProductCategory(product) === "Carte";
}
