"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Heart, Square } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { GoldRibbon, RIBBON_S } from "@/components/shop/landing/gold-ribbon";
import { MaskLine, Reveal } from "@/components/shop/landing/reveal";
import { NightDaySection } from "@/components/shop/landing/night-day-section";

type Format = {
  id: string;
  label: string;
  index: string;
  image: string;
  detail: string;
  Icon: LucideIcon;
};

const FORMATS: readonly Format[] = [
  {
    id: "coeur",
    label: "En cœur",
    index: "01",
    image: "/images/produits/gift/caramel-cappuccino-baileys-11.20.43-1.webp",
    detail: "La forme qui touche — kinder, caramel, baileys.",
    Icon: Heart,
  },
  {
    id: "carre",
    label: "En carré",
    index: "02",
    image: "/images/produits/gift/caramel-cappuccino-11.20.49.webp",
    detail: "L’élégance géométrique — cappuccino, chocolat, signatures.",
    Icon: Square,
  },
] as const;

function FormatPanel({
  format,
  aspect,
  className,
}: {
  format: Format;
  aspect: string;
  className?: string;
}) {
  const { Icon } = format;
  return (
    <Link
      href="/catalogue"
      aria-label={`Voir les entremets ${format.label}`}
      className={`group relative block overflow-hidden rounded-[2px] bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${aspect} ${className ?? ""}`}
    >
      <Image
        src={format.image}
        alt={format.label}
        fill
        sizes="(max-width: 1024px) 100vw, 40vw"
        className="object-cover transition-transform duration-[700ms] ease-out group-hover:scale-[1.05] motion-reduce:group-hover:scale-100"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(36,23,38,0.85) 0%, rgba(36,23,38,0.15) 48%, transparent 72%)",
        }}
        aria-hidden
      />
      {/* Filet doré qui se resserre au survol */}
      <span
        className="pointer-events-none absolute inset-3 rounded-[1px] border border-accent/0 transition-all duration-500 group-hover:inset-2.5 group-hover:border-accent/60"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
        <span className="flex items-center gap-2 font-body text-[10px] font-semibold uppercase tracking-[0.26em] text-accent">
          <Icon className="size-3.5" strokeWidth={1.6} aria-hidden />
          Format · {format.index}
        </span>
        <p className="mt-2 font-display text-3xl font-semibold leading-none text-bg sm:text-4xl">
          {format.label}
        </p>
        <p className="mt-2 max-w-xs font-body text-sm text-bg/70">
          {format.detail}
        </p>
      </div>
    </Link>
  );
}

/** Catalogue teaser — la dualité cœur / carré comme motif structurel, asymétrie assumée. */
export function RadicalFormatsSection() {
  return (
    <NightDaySection
      tone="creme"
      ariaLabel="Formats En cœur et En carré"
      innerClassName="py-[14vh] lg:py-[16vh]"
    >
      {/* Marques de format fantômes — décor structurel, pas illustration */}
      <Heart
        className="pointer-events-none absolute -right-10 top-10 size-64 -rotate-12 text-accent/[0.06] lg:size-96"
        strokeWidth={0.5}
        aria-hidden
      />
      <Square
        className="pointer-events-none absolute -left-16 bottom-24 size-52 rotate-6 text-primary/[0.05] lg:size-80"
        strokeWidth={0.5}
        aria-hidden
      />

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
        {/* Colonne titre — décalée vers le bas */}
        <div className="lg:col-span-4 lg:pt-[9vh]">
          <p className="flex items-center gap-3 font-body text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            <span className="h-px w-8 bg-accent" aria-hidden />
            La carte
          </p>
          <h2 className="mt-4 font-display text-primary">
            <MaskLine>
              <span
                className="block font-light italic leading-[0.95]"
                style={{ fontSize: "clamp(2.2rem, 5vw, 3.75rem)" }}
              >
                En cœur.
              </span>
            </MaskLine>
            <MaskLine delay={0.08}>
              <span
                className="block font-black uppercase leading-[0.9]"
                style={{ fontSize: "clamp(2rem, 4.6vw, 3.25rem)" }}
              >
                En carré.
              </span>
            </MaskLine>
          </h2>
          <Reveal delay={0.14}>
            <p className="mt-5 max-w-xs font-body text-base leading-relaxed text-muted-foreground">
              Deux silhouettes, une même exigence. Chaque pièce se décline dans
              le format qui lui va.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <Link
              href="/catalogue"
              className="group mt-7 inline-flex items-center gap-2 font-body text-sm font-semibold text-primary transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <span className="relative">
                Voir toute la carte
                <span
                  className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-accent transition-transform duration-500 ease-out group-hover:scale-x-100"
                  aria-hidden
                />
              </span>
              <ArrowUpRight className="size-4 transition-transform duration-500 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </Link>
          </Reveal>
        </div>

        {/* Cœur — grand, haut */}
        <Reveal direction="up" className="lg:col-span-5 lg:col-start-5">
          <FormatPanel format={FORMATS[0]} aspect="aspect-[4/5]" />
        </Reveal>

        {/* Carré — plus petit, poussé vers le bas (rupture de rythme) */}
        <Reveal
          direction="up"
          delay={0.1}
          className="lg:col-span-3 lg:col-start-10 lg:mt-[20vh]"
        >
          <FormatPanel format={FORMATS[1]} aspect="aspect-[3/4]" />
        </Reveal>
      </div>

      {/* Ruban horizontal reliant les deux formats */}
      <GoldRibbon
        path={RIBBON_S}
        viewBox="0 0 1000 80"
        opacity={0.4}
        className="pointer-events-none mt-16 hidden h-16 w-full lg:block"
      />
    </NightDaySection>
  );
}
