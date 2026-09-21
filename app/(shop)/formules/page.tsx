import type { Metadata } from "next";

import { CustomTierSelector } from "@/components/shop/tier-selector";
import { createPageMetadata } from "@/lib/seo/metadata";
import { PRICING_TIERS } from "@/lib/pricing-tiers";

export const metadata: Metadata = createPageMetadata({
  title: "Formules & paliers avantages (10 000 à 110 000 FCFA)",
  description:
    "Choisissez votre montant entre 10 000 FCFA et 110 000 FCFA et découvrez les avantages débloqués, sur toutes nos catégories : entremets, nounours, fleurs et cartes.",
  path: "/formules",
});

export default function FormulesPage() {
  const min = PRICING_TIERS[0]!.minPrice;
  const max = PRICING_TIERS[PRICING_TIERS.length - 1]!.maxPrice;

  return (
    <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-10">
        <h1 className="font-display text-3xl font-semibold text-primary sm:text-5xl">
          Paliers &amp; avantages
        </h1>
        <p className="mt-3 max-w-2xl font-body text-muted-foreground">
          Selon le montant de votre cadeau, des attentions supplémentaires se
          débloquent — carte personnalisée, livraison offerte, coffret prestige.
          Valable sur toutes nos catégories : entremets, nounours, fleurs et
          cartes cadeaux.
        </p>
      </div>

      <CustomTierSelector categoryName="Toutes catégories" />

      <section className="mt-10 rounded-2xl border border-border bg-muted/40 p-6">
        <h2 className="font-display text-lg font-semibold text-primary">
          Comment ça marche
        </h2>
        <ol className="mt-4 space-y-3 font-body text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="font-semibold text-primary tabular-nums">1.</span>
            Repérez le montant de votre cadeau — les paliers vont de{" "}
            {min.toLocaleString("fr-FR")} à {max.toLocaleString("fr-FR")} FCFA.
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-primary tabular-nums">2.</span>
            Les avantages associés s&apos;affichent immédiatement.
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-primary tabular-nums">3.</span>
            Composez votre cadeau : fleurs, nounours, entremets, chocolats — et
            votre mot manuscrit, offert.
          </li>
        </ol>
      </section>
    </div>
  );
}
