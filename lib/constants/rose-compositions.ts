/**
 * Compositions de roses — prédicats purs, sans dépendance.
 *
 * Séparé de `lib/product-options/compositions.ts` volontairement : ce fichier
 * est importé par `lib/catalog-utils.ts`, qui ne peut pas dépendre de
 * `product-options` sans créer un cycle. Même découpage que
 * `lib/constants/nounours-sizes.ts`.
 *
 * Les PRIX ne sont pas ici : chaque composition est une vraie ligne catalogue
 * (`rose-unite`, `bouquet-1-rose`, …), déjà tarifée et déjà gérable en
 * back-office.
 */

/** Ordre d'affichage des compositions, du plus petit au plus grand. */
export const ROSE_COMPOSITION_SLUGS = [
  "rose-unite",
  "bouquet-1-rose",
  "bouquet-2-roses",
  "bouquet-3-roses",
  "bouquet-5-roses",
  "bouquet-7-roses",
  "bouquet-9-roses",
  "bouquet-10-roses",
  "bouquet-12-roses",
  "bouquet-15-roses",
  "bouquet-20-roses",
] as const;

export function isRoseProduct(slug: string): boolean {
  return slug === "rose-unite" || /^bouquet-\d+-roses?$/.test(slug);
}

/** Nombre de roses, lu dans le slug. `null` si ce n'est pas une composition. */
export function getRoseCount(slug: string): number | null {
  if (slug === "rose-unite") return 1;
  const match = slug.match(/^bouquet-(\d+)-roses?$/);
  return match?.[1] ? Number(match[1]) : null;
}

/** Libellé court du palier — « 7 roses », « 1 rose ». */
export function getRoseLabel(slug: string, fallback: string): string {
  const count = getRoseCount(slug);
  if (count === null) return fallback;
  return `${count} rose${count > 1 ? "s" : ""}`;
}

/**
 * Ce que contient concrètement la composition.
 *
 * Reprend les descriptions du catalogue : une cliente qui lit « sacoche
 * offerte » doit la recevoir.
 */
export function getBouquetIncludes(slug: string): string[] {
  const count = getRoseCount(slug);
  if (count === null) return [];

  if (slug === "rose-unite") {
    return ["1 rose fraîche", "Sans emballage"];
  }

  const roses = `${count} rose${count > 1 ? "s" : ""} parfumée${count > 1 ? "s" : ""}`;

  if (count === 1) return [roses, "Gypsophile", "Emballage"];
  if (count === 2) return [roses, "Gypsophile"];
  if (count === 3) return [roses, "Gypsophile", "Carte"];

  return [roses, "Gypsophile", "Carte emballée", "Sacoche offerte"];
}
