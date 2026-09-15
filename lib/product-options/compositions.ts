/**
 * Compositions de roses, côté catalogue.
 *
 * Les prédicats purs (slug, nombre de roses, contenu du bouquet) vivent dans
 * `lib/constants/rose-compositions.ts`. Ici on les confronte au catalogue réel
 * pour produire les paliers affichables — avec leurs prix, qui viennent
 * toujours des lignes produit.
 */

import { getProductPrice, isProductAvailable } from "@/lib/catalog-utils";
import {
  getBouquetIncludes,
  ROSE_COMPOSITION_SLUGS,
} from "@/lib/constants/rose-compositions";
import type { Product } from "@/types/product";

export type RoseCompositionOption = {
  slug: string;
  name: string;
  price: number;
  includes: string[];
};

/**
 * Paliers affichables, dans l'ordre du catalogue.
 *
 * Une composition absente du catalogue est omise — on ne propose jamais un
 * bouquet qui n'existe pas. En revanche le stock ne les masque pas : les
 * fleurs sont montées à la demande et ne sont pas suivies en stock
 * (`UNLIMITED_STOCK_CATEGORIES`).
 */
export function getRoseCompositionOptions(
  catalog: Product[],
): RoseCompositionOption[] {
  const bySlug = new Map(catalog.map((product) => [product.slug, product]));

  return ROSE_COMPOSITION_SLUGS.flatMap((slug) => {
    const product = bySlug.get(slug);
    if (!product || !isProductAvailable(product)) return [];

    return [
      {
        slug,
        name: product.name,
        price: getProductPrice(product),
        includes: getBouquetIncludes(slug),
      },
    ];
  });
}
