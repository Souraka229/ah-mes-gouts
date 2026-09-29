import type { SupplementOption } from "@/types/cart";

/**
 * Anciens suppléments, désormais **pilotés par la base**.
 *
 * Cette liste était la seule source de prix : ajouter une garniture demandait un
 * déploiement. Les options vivent maintenant dans les tables `OptionGroup` /
 * `Option`, éditables depuis le back-office
 * (`scripts/seed-product-options.mjs` reprend ces six lignes).
 *
 * Elle n'est conservée que comme **filet de sécurité** : des paniers déjà
 * ouverts dans un LocalStorage envoient encore des noms de suppléments, et des
 * commandes anciennes en portent en base. Les supprimer ferait échouer le
 * checkout de ces clientes avec « Supplément indisponible ».
 *
 * @deprecated Utiliser `getActiveOptionGroupsByProductIds` (`lib/server/option-repository.ts`).
 */
export const LEGACY_SUPPLEMENT_OPTIONS: SupplementOption[] = [
  { id: "chantilly", name: "Chantilly", price: 300 },
  { id: "chocolat", name: "Chocolat", price: 400 },
  { id: "caramel", name: "Caramel", price: 400 },
  { id: "double-boule", name: "Double boule", price: 1500 },
  { id: "coulis", name: "Coulis fruits", price: 350 },
  { id: "decoration", name: "Décoration premium", price: 500 },
];

/**
 * @deprecated Même contenu que `LEGACY_SUPPLEMENT_OPTIONS`, gardé sous son nom
 * historique le temps que les appelants migrent vers la lecture en base.
 */
export const supplementOptions = LEGACY_SUPPLEMENT_OPTIONS;

export function getSupplementById(id: string): SupplementOption | undefined {
  return LEGACY_SUPPLEMENT_OPTIONS.find((option) => option.id === id);
}

/**
 * Prix d'un ancien supplément, résolu par **nom** — c'est ce que transportaient
 * les paniers d'avant les options (`supplements: string[]`).
 */
const legacyPriceByName = new Map(
  LEGACY_SUPPLEMENT_OPTIONS.map((option) => [option.name, option.price]),
);

export function getLegacySupplementPriceByName(name: string): number | undefined {
  return legacyPriceByName.get(name);
}
