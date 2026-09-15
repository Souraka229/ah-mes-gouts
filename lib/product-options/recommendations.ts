/**
 * Suggestions contextuelles sur la fiche produit.
 *
 * Piloté par des données : une règle = une catégorie + des produits réels.
 * Aucune suggestion n'est écrite en dur dans un composant, et une règle ne
 * peut proposer qu'un produit présent au catalogue.
 *
 * Volontairement sobre : au plus {@link MAX_RECOMMENDED_PRODUCTS} produits, et
 * la cliente peut toujours ignorer — aucune étape obligatoire.
 */

import { getProductCategory, getProductPrice } from "@/lib/catalog-utils";
import { getExtraProducts } from "@/lib/product-options/extras";
import type { ProductRecommendation } from "@/lib/product-options/types";
import type { Product } from "@/types/product";

export const MAX_RECOMMENDED_PRODUCTS = 3;

type RecommendationRule = {
  id: string;
  /** Catégories du produit consulté qui déclenchent la règle. */
  forCategories: string[];
  title: string;
  subtitle: string;
  /** Sélectionne les produits à proposer, dans l'ordre de préférence. */
  pick: (catalog: Product[], current: Product) => Product[];
};

const RULES: RecommendationRule[] = [
  {
    id: "fleurs-duo",
    forCategories: ["Fleurs", "Cadeaux"],
    title: "Un duo rose + chocolat ?",
    subtitle: "Ajoutez une douceur pour compléter votre bouquet.",
    pick: (catalog) => getExtraProducts(catalog),
  },
  {
    id: "nounours-douceur",
    forCategories: ["Nounours"],
    title: "Une petite douceur en plus ?",
    subtitle: "Un peu de gourmandise à côté de la peluche.",
    pick: (catalog) => getExtraProducts(catalog),
  },
  {
    id: "entremets-douceur",
    forCategories: ["Entremets", "Sur commande"],
    title: "Pour accompagner votre création",
    subtitle: "Quelques chocolats à offrir avec l'entremets.",
    pick: (catalog) => getExtraProducts(catalog),
  },
];

/**
 * Suggestions pour le produit consulté — au plus trois, jamais le produit
 * lui-même, jamais deux fois le même.
 */
export function getProductRecommendations(input: {
  product: Product;
  catalog: Product[];
}): ProductRecommendation[] {
  const { product, catalog } = input;
  const category = getProductCategory(product);

  const rule = RULES.find((entry) => entry.forCategories.includes(category));
  if (!rule) return [];

  const picked = rule
    .pick(catalog, product)
    .filter((candidate) => candidate.slug !== product.slug);

  const unique = [...new Map(picked.map((p) => [p.slug, p])).values()].slice(
    0,
    MAX_RECOMMENDED_PRODUCTS,
  );

  if (unique.length === 0) return [];

  return [
    {
      id: rule.id,
      title: rule.title,
      subtitle: rule.subtitle,
      products: unique,
    },
  ];
}

/** Phrase d'accroche d'un produit proposé — « + 3 000 F ». */
export function formatExtraPriceDelta(product: Product): string {
  return `+ ${getProductPrice(product).toLocaleString("fr-FR")} F`;
}
