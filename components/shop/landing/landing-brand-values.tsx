import { BRAND_VALUES } from "@/lib/business-info";

/**
 * Bandeau repères — traitement typographique sobre (règle fine + texte),
 * volontairement sans icône ni pastille colorée : pas de "stickers".
 */
export function LandingBrandValues() {
  return (
    <section className="bg-bg py-12 sm:py-14" aria-label="Nos repères">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 sm:grid-cols-4 sm:gap-8 sm:px-6">
        {BRAND_VALUES.map((value) => (
          <div
            key={value.id}
            className="border-t-2 border-primary pt-3"
          >
            <p className="font-display text-base font-semibold text-primary sm:text-lg">
              {value.title}
            </p>
            <p className="mt-1 font-body text-sm leading-snug text-muted-foreground">
              {value.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
