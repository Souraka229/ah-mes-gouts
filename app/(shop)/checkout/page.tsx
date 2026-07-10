import type { Metadata } from "next";

import { CheckoutWizard } from "@/components/shop/checkout/checkout-wizard";
import { CheckoutErrorBoundary } from "@/components/shop/checkout/checkout-error-boundary";
import { createPageMetadata } from "@/lib/seo/metadata";
import { SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  title: "Checkout",
  description: `Finalisez votre commande ${SITE_NAME_WITH_CREDIT}.`,
  path: "/checkout",
  noIndex: true,
});

export default function CheckoutPage() {
  return (
    <CheckoutErrorBoundary>
      <CheckoutWizard />
    </CheckoutErrorBoundary>
  );
}
