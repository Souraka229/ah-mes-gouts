/** Paliers de taille — une seule fiche « Nounours », taille choisie à la commande. */
export const NOUNOURS_SIZES = [
  { cm: 20, price: 10_000 },
  { cm: 25, price: 15_000 },
  { cm: 30, price: 25_000 },
  { cm: 80, price: 35_000 },
  { cm: 90, price: 40_000 },
  { cm: 100, price: 45_000 },
  { cm: 120, price: 50_000 },
  { cm: 130, price: 70_000 },
  { cm: 140, price: 90_000 },
  { cm: 150, price: 100_000 },
] as const;

export const NOUNOURS_PRODUCT_SLUG = "nounours";

export type NounoursSize = (typeof NOUNOURS_SIZES)[number];

export function isNounoursProduct(slug: string): boolean {
  return slug === NOUNOURS_PRODUCT_SLUG || slug.startsWith("nounours-");
}

export function getNounoursTypeFromSlug(slug: string): string {
  const lower = slug.toLowerCase();
  if (lower.includes("stitch")) return "Stitch";
  if (lower.includes("teddy")) return "Teddy";
  if (lower.includes("labubu")) return "Labubu";
  return "Nounours";
}

export function getNounoursEntryPrice(): number {
  return NOUNOURS_SIZES[0]!.price;
}

export function getNounoursPriceRange(): { min: number; max: number } {
  const prices = NOUNOURS_SIZES.map((s) => s.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function getNounoursSizeByCm(cm: number): NounoursSize | undefined {
  return NOUNOURS_SIZES.find((s) => s.cm === cm);
}
