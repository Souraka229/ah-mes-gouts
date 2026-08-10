import { Cake, Heart, Leaf, Sparkles } from "lucide-react";

import { BRAND_VALUES } from "@/lib/business-info";

const ICONS = {
  ingredients: Leaf,
  amour: Heart,
  saveurs: Sparkles,
  satisfaction: Cake,
} as const;

/** Bandeau valeurs de marque — fond bleu clair, 4 repères rapides. */
export function LandingBrandValues() {
  return (
    <section className="bg-secondary/12 py-10 sm:py-12" aria-label="Nos engagements">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:gap-8 sm:px-6">
        {BRAND_VALUES.map((value) => {
          const Icon = ICONS[value.id as keyof typeof ICONS];
          return (
            <div key={value.id} className="flex flex-col items-center gap-2 text-center">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-white">
                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="font-body text-sm font-semibold text-text">
                {value.title}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                {value.detail}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
