import { Hand, Heart, Sunrise, Truck } from "lucide-react";

import { BRAND_VALUES } from "@/lib/business-info";

/**
 * Repères — quatre cartes blanches sur fond muted.
 *
 * Pastilles alternées : crème + icône rouge, puis bleu clair + icône bleue.
 * Le rouge est ici purement iconographique, à petite dose et sans concurrencer
 * le CTA — choix validé sur maquette.
 */
const ICONS = [Sunrise, Hand, Truck, Heart] as const;

export function LandingBrandValues() {
  return (
    <section className="bg-muted py-20 sm:py-24" aria-label="Nos repères">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="max-w-[20ch] font-display text-[clamp(1.9rem,4vw,2.75rem)] font-semibold leading-tight text-balance text-primary">
          Pourquoi la maison plaît
        </h2>

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BRAND_VALUES.map((value, index) => {
            const Icon = ICONS[index % ICONS.length]!;
            const isBlue = index % 2 === 1;

            return (
              <li
                key={value.id}
                className="shadow-soft rounded-3xl bg-white p-7 transition-[transform,box-shadow] duration-400 hover:-translate-y-1.5 hover:shadow-lift motion-reduce:hover:translate-y-0"
              >
                <span
                  className={`mb-5 flex size-13 items-center justify-center rounded-2xl ${
                    isBlue
                      ? "bg-bluegray text-secondary"
                      : "bg-muted text-accent"
                  }`}
                  aria-hidden
                >
                  <Icon className="size-6" strokeWidth={1.7} />
                </span>
                <h3 className="font-display text-lg font-semibold text-primary">
                  {value.title}
                </h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                  {value.detail}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
