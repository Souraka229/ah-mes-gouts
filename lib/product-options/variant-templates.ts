import { NOUNOURS_SIZES } from "@/lib/constants/nounours-sizes";

/**
 * Modèles de variantes — la pièce **générique** du système.
 *
 * Un modèle n'est qu'un **préremplissage** : il évite de ressaisir dix paliers
 * à la main. Une fois appliqué, c'est la base qui fait foi — le back-office
 * peut modifier chaque prix, désactiver un palier, en ajouter d'autres.
 *
 * Ajouter une famille (bouquets, entremets, coffrets…) se limite donc à décrire
 * ici sa grille, sans toucher au schéma, à la facturation ni à l'affichage.
 *
 * NOTE : seuls les modèles dont les tarifs sont réellement connus sont listés.
 * On n'invente pas de prix — un modèle faux serait pire que pas de modèle.
 */
export type VariantTemplateEntry = {
  /** Identifiant stable envoyé par le client : « 150 », « grand », « 6 ». */
  code: string;
  /** Libellé affiché : « 150 cm », « Grand », « 6 personnes ». */
  label: string;
  price: number;
};

export type VariantTemplate = {
  id: string;
  /** Nom affiché dans le back-office. */
  name: string;
  /** Libellé qu'applique ce modèle au sélecteur du produit. */
  variantLabel: string;
  /** Catégories pour lesquelles ce modèle est proposé. */
  categories: string[];
  entries: VariantTemplateEntry[];
};

export const VARIANT_TEMPLATES: VariantTemplate[] = [
  {
    id: "nounours-tailles",
    name: "Taille nounours (20 → 150 cm)",
    variantLabel: "Taille",
    categories: ["Nounours"],
    entries: NOUNOURS_SIZES.map((size) => ({
      code: String(size.cm),
      label: `${size.cm} cm`,
      price: size.price,
    })),
  },
];

/** Modèles pertinents pour une catégorie donnée. */
export function templatesForCategory(category: string): VariantTemplate[] {
  return VARIANT_TEMPLATES.filter((template) =>
    template.categories.includes(category),
  );
}

export function getVariantTemplate(id: string): VariantTemplate | undefined {
  return VARIANT_TEMPLATES.find((template) => template.id === id);
}
