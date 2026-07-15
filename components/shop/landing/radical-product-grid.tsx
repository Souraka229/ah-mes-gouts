"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Square } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { menuPacks } from "@/lib/landing-data";
import {
  BOUTIQUE_HOURS,
  PRODUCT_SHAPE_BY_SLUG,
  type ProductShapeId,
} from "@/lib/business-info";
import type { MenuShowcaseItem } from "@/lib/server/shop-catalog";
import type { ProductGridSectionContent } from "@/types/site-content";

import { GoldRibbon } from "@/components/shop/landing/gold-ribbon";
import { MaskLine, Reveal } from "@/components/shop/landing/reveal";
import { MenuPackCard } from "@/components/shop/landing/menu-pack-card";
import { NightDaySection } from "@/components/shop/landing/night-day-section";

function resolveShape(item: MenuShowcaseItem): ProductShapeId | undefined {
  return item.product.shape ?? PRODUCT_SHAPE_BY_SLUG[item.slug];
}

/** Marqueur de format — cœur / carré, la dualité structurelle de la maison. */
function FormatMark({ shape }: { shape: ProductShapeId | undefined }) {
  if (!shape) return null;
  const Icon = shape === "coeur" ? Heart : Square;
  const label = shape === "coeur" ? "Cœur" : "Carré";
  return (
    <span className="inline-flex items-center gap-1.5 text-accent/80">
      <Icon className="size-3" strokeWidth={1.6} aria-hidden />
      <span className="font-body text-[10px] font-semibold uppercase tracking-[0.22em]">
        {label}
      </span>
    </span>
  );
}

/** Pièce dans son petit cadre doré, halo rose ambiant — même langage que le hero. */
function PieceFrame({
  src,
  alt,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        className="pointer-events-none absolute -inset-3 opacity-70 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(closest-side, rgba(243,201,206,0.55), transparent 72%)",
        }}
        aria-hidden
      />
      <div className="relative h-full w-full overflow-hidden rounded-[2px] border border-accent/35 p-1">
        <div className="relative h-full w-full overflow-hidden rounded-[1px]">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 22vw, 40vw"
            priority={priority}
            unoptimized={src.endsWith(".svg")}
            className="object-cover object-center transition-transform duration-[600ms] ease-out group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
          />
        </div>
      </div>
    </div>
  );
}

export function RadicalProductGridSection({
  content,
  showcase,
}: {
  content: ProductGridSectionContent;
  showcase: MenuShowcaseItem[];
}) {
  if (showcase.length === 0) return null;

  const [featured, ...rest] = showcase;

  return (
    <NightDaySection
      tone="creme"
      id="carte"
      ariaLabel="Menu du jour"
      innerClassName="py-[12vh] lg:py-[14vh]"
    >
      {/* Fil rouge — gouttière gauche */}
      <GoldRibbon className="pointer-events-none absolute -left-2 top-0 hidden h-full w-16 lg:block" />

      {/* En-tête — carte de maison */}
      <div className="flex flex-col gap-6 border-b border-accent/20 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-3 font-body text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            <span className="h-px w-8 bg-accent" aria-hidden />
            {content.eyebrow}
          </p>
          <h2 className="mt-4 font-display text-primary">
            <MaskLine>
              <span
                className="block font-light italic leading-[0.95]"
                style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}
              >
                {content.titleLine1}
              </span>
            </MaskLine>
            <MaskLine delay={0.08}>
              <span
                className="block font-black uppercase leading-[0.9] tracking-[-0.01em]"
                style={{ fontSize: "clamp(2rem, 5vw, 3.75rem)" }}
              >
                {content.titleLine2}
              </span>
            </MaskLine>
          </h2>
        </div>
        <Reveal
          delay={0.15}
          className="flex items-center gap-2.5 self-start rounded-full border border-accent/30 px-4 py-2 lg:self-auto"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          <span className="font-body text-[10px] font-semibold uppercase tracking-[0.24em] text-text/70">
            Disponible la veille · {BOUTIQUE_HOURS.label}
          </span>
        </Reveal>
      </div>

      {/* Pièce du jour — rupture de rythme : une entrée mise en scène */}
      <Reveal
        direction="up"
        className="group mt-12 grid grid-cols-1 items-center gap-8 md:grid-cols-[minmax(0,20rem)_1fr] lg:mt-16"
      >
        <Link
          href={`/produit/${featured.slug}`}
          aria-label={`Voir ${featured.name}`}
          className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <PieceFrame
            src={featured.image}
            alt={featured.name}
            priority
            className="aspect-[4/5] w-full"
          />
        </Link>
        <div>
          <span className="font-body text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">
            La pièce du jour
          </span>
          <h3
            className="mt-3 font-display font-semibold leading-[0.98] text-primary"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.25rem)" }}
          >
            {featured.name}
          </h3>
          <p className="mt-3 max-w-md font-body text-sm leading-relaxed text-muted-foreground">
            {featured.keyword}
          </p>
          <div className="mt-6 flex items-center gap-6">
            <span className="font-display text-2xl font-semibold text-primary">
              {formatPrice(featured.price)}
            </span>
            <FormatMark shape={resolveShape(featured)} />
          </div>
        </div>
      </Reveal>

      {/* Le reste de la carte — liste éditoriale, lignes de conduite pointillées */}
      {rest.length > 0 && (
        <ul className="mt-14 lg:mt-20">
          {rest.map((item, i) => (
            <li key={item.id}>
              <Reveal direction="up" delay={i * 0.06}>
                <Link
                  href={`/produit/${item.slug}`}
                  aria-label={`Voir ${item.name}`}
                  className="group flex items-center gap-5 border-b border-accent/15 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <PieceFrame
                    src={item.image}
                    alt={item.name}
                    className="aspect-square w-16 shrink-0 sm:w-20"
                  />
                  <div className="min-w-0">
                    <h4 className="truncate font-display text-xl font-semibold text-primary transition-colors group-hover:text-accent sm:text-2xl">
                      {item.name}
                    </h4>
                    <span className="mt-1 flex items-center gap-3">
                      <span className="truncate font-body text-xs text-muted-foreground">
                        {item.keyword}
                      </span>
                      <FormatMark shape={resolveShape(item)} />
                    </span>
                  </div>
                  {/* Ligne de conduite (menu leader) */}
                  <span
                    className="mx-2 hidden flex-1 -translate-y-1 border-b border-dotted border-text/25 sm:block"
                    aria-hidden
                  />
                  <span className="shrink-0 font-display text-xl font-semibold text-primary sm:text-2xl">
                    {formatPrice(item.price)}
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      )}

      {/* Formules — présentées comme un encart, pas une grille e-commerce */}
      <div className="mt-20 lg:mt-24">
        <Reveal>
          <h3 className="font-display text-2xl font-light italic text-primary sm:text-3xl">
            {content.packsSectionTitle}
          </h3>
        </Reveal>
        <div
          className="mt-7 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-3"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {menuPacks.map((pack, i) => (
            <Reveal key={pack.id} delay={i * 0.07} className="shrink-0">
              <MenuPackCard pack={pack} />
            </Reveal>
          ))}
        </div>
      </div>
    </NightDaySection>
  );
}
