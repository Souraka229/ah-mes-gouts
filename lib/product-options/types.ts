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
 * Le mot manuscrit est offert sur les créations cadeau. On l'écarte sur le
 * menu du jour : ce sont des pièces du jour, à consommer tout de suite, et un
 * bloc de saisie y serait du bruit.
 */
export function canCarryMessage(product: Product): boolean {
  return !product.isMenuDuJour;
}
