import type { Metadata } from "next";

import { CheckoutWizard } from "@/components/shop/checkout/checkout-wizard";
import { CheckoutErrorBoundary } from "@/components/shop/checkout/checkout-error-boundary";
import { createPageMetadata } from "@/lib/seo/metadata";
import { getUpsellCandidates } from "@/lib/server/shop-catalog";
import { SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";
import type { Product } from "@/types/product";

export const metadata: Metadata = createPageMetadata({
  title: "Checkout",
  description: `Finalisez votre commande ${SITE_NAME_WITH_CREDIT}.`,
  path: "/checkout",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  let upsellCandidates: Product[] = [];
  try {
    upsellCandidates = await getUpsellCandidates();
  } catch {
    upsellCandidates = [];
  }

  return (
    <CheckoutErrorBoundary>
      <CheckoutWizard upsellCandidates={upsellCandidates} />
    </CheckoutErrorBoundary>
  );
}
