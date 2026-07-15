"use client";

import { useEffect } from "react";

import { trackActivity } from "@/lib/crm/track";

type ProductViewTrackerProps = {
  productId: string;
  productSlug: string;
  productName: string;
};

/** Enregistre une vue produit côté CRM (fire-and-forget). */
export function ProductViewTracker({
  productId,
  productSlug,
  productName,
}: ProductViewTrackerProps) {
  useEffect(() => {
    trackActivity({
      type: "product_view",
      productId,
      productSlug,
      productName,
    });
  }, [productId, productSlug, productName]);

  return null;
}
