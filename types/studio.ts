import type { Product } from "@/types/product";

/** Édition du menu du jour dans le catalogue client (mode studio). */
export type CatalogueMenuEditor = {
  products: Product[];
  onReorder: (orderedProductIds: string[]) => void;
  onRemove: (productId: string) => void;
  /** Double-clic sur la zone vide ou le bandeau. */
  onRequestAdd: () => void;
};
