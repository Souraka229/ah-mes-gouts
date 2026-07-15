"use client";

import { Clock, CreditCard, Heart, Leaf, Smartphone, Smile, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { BOUTIQUE_HOURS, BRAND_VALUES, SLOGAN_SOCIAL } from "@/lib/business-info";
import { BUSINESS } from "@/lib/seo/site";

import { MaskLine, Reveal } from "@/components/shop/landing/reveal";
import { NightDaySection } from "@/components/shop/landing/night-day-section";

const ICONS: Record<string, LucideIcon> = {
  ingredients: Leaf,
  amour: Heart,
  saveurs: Sparkles,
  satisfaction: Smile,
};

/** Réassurance — engagements + paiements + horaires, même exigence graphique. */
export function RadicalValuesBand() {
  return (
    <NightDaySection
      tone="creme"
      ariaLabel="Nos engagements"
      innerClassName="py-[13vh] lg:py-[15vh]"
    >
      <div className="max-w-2xl">
        <p className="flex items-center gap-3 font-body text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
          <span className="h-px w-8 bg-accent" aria-hidden />
          La maison
        </p>
        <h2 className="mt-4 font-display text-primary">
          <MaskLine>
            <span
              className="block font-light italic leading-[1.02]"
              style={{ fontSize: "clamp(1.8rem, 4.2vw, 3rem)" }}
            >
              {SLOGAN_SOCIAL}
            </span>
          </MaskLine>
        </h2>
      </div>

      {/* Engagements — numérotés, filets dorés, pas de pastilles identiques */}
      <ul className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
        {BRAND_VALUES.map((value, i) => {
          const Icon = ICONS[value.id] ?? Sparkles;
          return (
            <li key={value.id}>
              <Reveal direction="up" delay={i * 0.07}>
                <div className="lg:border-l lg:border-accent/25 lg:pl-6">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-3xl font-light italic text-accent/70 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Icon className="size-4 text-primary/40" strokeWidth={1.6} aria-hidden />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-semibold text-primary">
                    {value.title}
                  </h3>
                  <p className="mt-1.5 font-body text-sm leading-relaxed text-muted-foreground">
                    {value.detail}
                  </p>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>

      {/* Barre paiement & horaires — traitée, pas reléguée en gris */}
      <Reveal delay={0.1}>
        <div className="mt-16 flex flex-col gap-6 border-t border-accent/25 pt-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 font-body text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <Smartphone className="size-4 text-accent" strokeWidth={1.6} aria-hidden />
              <CreditCard className="size-4 text-accent" strokeWidth={1.6} aria-hidden />
              Paiement
            </span>
            <ul className="flex flex-wrap gap-2">
              {BUSINESS.paymentAccepted.map((method) => (
                <li
                  key={method}
                  className="rounded-full border border-primary/15 px-3 py-1 font-body text-xs font-medium text-text/80"
                >
                  {method}
                </li>
              ))}
            </ul>
          </div>
          <p className="flex items-center gap-2 font-body text-sm text-muted-foreground">
            <Clock className="size-4 text-accent" strokeWidth={1.6} aria-hidden />
            Boutique ouverte {BOUTIQUE_HOURS.daysLabel.toLowerCase()} ·{" "}
            <span className="font-semibold text-text">{BOUTIQUE_HOURS.label}</span>
          </p>
        </div>
      </Reveal>
    </NightDaySection>
  );
}
