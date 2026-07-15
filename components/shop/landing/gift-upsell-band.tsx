"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Gift } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { getProductAltText } from "@/lib/seo/images";
import type { GiftTeaserSectionContent } from "@/types/site-content";
import type { Product } from "@/types/product";

import { GoldRibbon, RIBBON_S } from "@/components/shop/landing/gold-ribbon";
import { MaskLine, Reveal } from "@/components/shop/landing/reveal";
import { NightDaySection } from "@/components/shop/landing/night-day-section";

/** Décalages verticaux — casse la symétrie du trio. */
const OFFSETS = ["lg:mt-0", "lg:mt-10", "lg:mt-4"] as const;

export function GiftUpsellBandSection({
  content,
  products,
}: {
  content: GiftTeaserSectionContent;
  products: Product[];
}) {
  const router = useRouter();
  const goToGifts = () => router.push("/catalogue?cadeaux=1#cadeaux");

  return (
    <NightDaySection
      tone="bluegray"
      id="cadeaux-accueil"
      ariaLabel="Idées cadeaux"
      innerClassName="py-[13vh] lg:py-[15vh]"
    >
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        {/* ── L'intention ── */}
        <div>
          <p className="flex items-center gap-2.5 font-body text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            <Gift className="size-3.5 text-accent" strokeWidth={1.6} aria-hidden />
            Une attention
          </p>
          <h2 className="mt-4 font-display text-primary">
            <MaskLine>
              <span
                className="block font-light italic leading-[1]"
                style={{ fontSize: "clamp(2rem, 4.8vw, 3.5rem)" }}
              >
                {content.title}
              </span>
            </MaskLine>
          </h2>
          <Reveal delay={0.12}>
            <p className="mt-5 max-w-sm font-body text-base leading-relaxed text-muted-foreground">
              Un nounours, un bouquet, une carte — glissé avec votre commande.
              Un geste, rien de plus.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                type="button"
                onClick={goToGifts}
                className="group inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-full bg-accent px-7 py-3 font-body text-sm font-semibold text-text transition-shadow duration-500 hover:shadow-[0_18px_40px_-12px_rgba(201,169,110,0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                Ajouter un cadeau
                <ArrowUpRight className="size-4 transition-transform duration-500 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              </button>
              <Link
                href="/catalogue"
                className="font-body text-sm text-muted-foreground transition-colors hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                — ou simplement la carte
              </Link>
            </div>
          </Reveal>
        </div>

        {/* ── Le trio, noué d'un ruban ── */}
        <div className="relative">
          <GoldRibbon
            path={RIBBON_S}
            viewBox="0 0 1000 80"
            opacity={0.45}
            className="pointer-events-none absolute -top-8 left-0 hidden h-16 w-full lg:block"
          />
          {products.length > 0 ? (
            <div className="grid grid-cols-3 gap-4 sm:gap-6">
              {products.slice(0, 3).map((product, i) => (
                <Reveal
                  key={product.slug}
                  direction="up"
                  delay={i * 0.08}
                  className={OFFSETS[i] ?? ""}
                >
                  <button
                    type="button"
                    onClick={goToGifts}
                    aria-label={`Voir ${product.name} dans les cadeaux`}
                    className="group block w-full cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                  >
                    <div className="relative">
                      <div
                        className="pointer-events-none absolute -inset-3 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                        style={{
                          background:
                            "radial-gradient(closest-side, rgba(243,201,206,0.6), transparent 72%)",
                        }}
                        aria-hidden
                      />
                      <div className="relative aspect-[4/5] overflow-hidden rounded-[2px] border border-accent/30 p-1.5 transition-transform duration-500 ease-out group-hover:-translate-y-1">
                        <div className="relative h-full w-full overflow-hidden rounded-[1px] bg-photo-bg">
                          <Image
                            src={product.imageUrl}
                            alt={getProductAltText(product.name)}
                            fill
                            sizes="(max-width: 640px) 33vw, 22vw"
                            className="object-cover object-center transition-transform duration-[600ms] ease-out group-hover:scale-[1.05] motion-reduce:group-hover:scale-100"
                            unoptimized={product.imageUrl.endsWith(".svg")}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 truncate font-display text-base font-semibold text-primary">
                      {product.name}
                    </p>
                    <p className="font-body text-sm text-muted-foreground">
                      {formatPrice(product.price)}
                    </p>
                  </button>
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="font-body text-sm text-muted-foreground">
              Sélection cadeaux à découvrir sur la carte.
            </p>
          )}
        </div>
      </div>
    </NightDaySection>
  );
}
