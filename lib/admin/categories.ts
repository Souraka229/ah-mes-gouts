export const PRODUCT_CATEGORIES = [
  "Glaces",
  "Entremets",
  "Cadeaux",
  "Boissons",
  "Promotions",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
