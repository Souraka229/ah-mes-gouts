import { BRAND_VALUES } from "@/lib/business-info";

/**
 * Bandeau repères — fond bleu clair (respiration visuelle, casse le crème/blanc
 * partout), traitement typographique sobre : règle fine + texte, pas d'icône
 * en pastille.
 */
export function LandingBrandValues() {
  return (
    <section className="bg-bluegray py-12 sm:py-14" aria-label="Nos repères">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 sm:grid-cols-4 sm:gap-8 sm:px-6">
        {BRAND_VALUES.map((value) => (
          <div
            key={value.id}
            className="border-t-2 border-primary pt-3"
          >
            <p className="font-display text-base font-semibold text-primary sm:text-lg">
              {value.title}
            </p>
            <p className="mt-1 font-body text-sm leading-snug text-text/70">
              {value.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
