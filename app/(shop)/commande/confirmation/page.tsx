import { Suspense } from "react";
import type { Metadata } from "next";

import ConfirmationContent from "./confirmation-content";
import { createPageMetadata } from "@/lib/seo/metadata";
import { SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  title: "Confirmation de commande",
  description: `Votre commande ${SITE_NAME_WITH_CREDIT} a été confirmée.`,
  path: "/commande/confirmation",
  noIndex: true,
});

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-20 text-center font-body text-muted-foreground">
          Chargement de votre confirmation...
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
