"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  type TargetAndTransition,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { BOUTIQUE_HOURS, BOUTIQUE_LOCATION, SLOGAN } from "@/lib/business-info";
import { ORIGIN_BRAND, SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";
import type { HeroSectionContent } from "@/types/site-content";

/** Easing « révélation sous la lumière » — sortie lente, cérémonieuse. */
const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

type HeroTone = "violet" | "nuit";

/**
 * Alternance dictée par le produit : le fond immersif prend la teinte froide
 * (bleu nuit) pour les pièces sombres/glacées, sinon le violet (âme de marque).
 */
const NUIT_IMAGE_HINTS = ["foret-noire", "speculos", "chocolat-menthe", "oreos"];

function resolveHeroTone(imageUrl: string): HeroTone {
  const f = imageUrl.toLowerCase();
  return NUIT_IMAGE_HINTS.some((hint) => f.includes(hint)) ? "nuit" : "violet";
}

const TONE_FIELD: Record<HeroTone, string> = {
  violet: "bg-primary",
  nuit: "bg-nuit",
};

const TONE_GRADIENT: Record<HeroTone, string> = {
  violet:
    "radial-gradient(ellipse 80% 60% at 70% 40%, rgba(243,201,206,0.25), transparent 60%), radial-gradient(ellipse 50% 40% at 20% 80%, rgba(201,169,110,0.12), transparent 55%)",
  nuit:
    "radial-gradient(ellipse 80% 60% at 70% 40%, rgba(120,160,200,0.2), transparent 60%), radial-gradient(ellipse 50% 40% at 20% 80%, rgba(243,201,206,0.15), transparent 55%)",
};

/**
 * Hero « écrin de nuit » — une seule pièce présentée dans une vitrine dorée,
 * sur un mur sombre. Trois froids/chauds à rôle distinct : le violet (ou bleu
 * nuit) est le mur, le rose est le halo tendre derrière la pièce, le doré est
 * le cadre + l'action. Rien ne se répète, tout se révèle sous la lumière.
 */
export function RadicalHeroSection({
  content,
}: {
  content: HeroSectionContent;
}) {
  const reduceMotion = useReducedMotion();
  const tone = resolveHeroTone(content.imageUrl);

  const initial = (
    hidden: TargetAndTransition,
  ): false | TargetAndTransition => (reduceMotion ? false : hidden);

  return (
    <section
      className={`relative min-h-[100dvh] w-full overflow-hidden ${TONE_FIELD[tone]} text-bg`}
      aria-label={`Accueil — ${SITE_NAME_WITH_CREDIT}`}
    >
      {/* Fond CSS pur — zéro WebGL, TTI minimal */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: TONE_GRADIENT[tone] }}
        aria-hidden
      />

      {/* Halo tendre (rose) — la lumière derrière la pièce */}
      <motion.div
        className="pointer-events-none absolute -right-[20%] top-1/2 h-[120vmin] w-[120vmin] -translate-y-1/2 lg:right-[2%]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(243,201,206,0.42), rgba(243,201,206,0.10) 45%, transparent 72%)",
        }}
        initial={initial({ opacity: 0, scale: 0.7 })}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: EXPO, delay: 0.1 }}
        aria-hidden
      />

      {/* Fuite de lumière froide (bleu nuit) — le second froid qui équilibre */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[45%]"
        style={{
          background:
            "linear-gradient(100deg, rgba(31,43,77,0.65), rgba(31,43,77,0.0) 70%)",
        }}
        aria-hidden
      />
      {/* Vignette basse — assied la composition */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
        style={{
          background:
            "linear-gradient(to top, rgba(20,12,26,0.55), transparent)",
        }}
        aria-hidden
      />

      {/* Ruban doré — fil rouge, se dessine sous la lumière */}
      <svg
        className="pointer-events-none absolute inset-y-0 left-[5vw] hidden h-full w-24 sm:block"
        viewBox="0 0 60 900"
        fill="none"
        preserveAspectRatio="xMidYMin slice"
        aria-hidden
      >
        <motion.path
          d="M30 -10 C 8 120, 52 240, 30 360 C 8 480, 52 600, 30 720 C 14 820, 40 880, 30 960"
          stroke="var(--color-accent)"
          strokeWidth="1.25"
          strokeLinecap="round"
          initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.9, ease: EXPO, delay: 0.35 }}
          style={{ opacity: 0.55 }}
        />
      </svg>

      <div className="relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-[1400px] grid-cols-1 items-center gap-y-12 px-6 pb-16 pt-28 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-x-10 lg:px-[6vw] lg:pt-24">
        {/* ── Colonne texte ── */}
        <div className="order-2 flex flex-col lg:order-1">
          <motion.p
            className="flex items-center gap-3 font-body text-[11px] font-semibold uppercase tracking-[0.34em] text-secondary sm:text-xs"
            initial={initial({ opacity: 0, y: 14 })}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EXPO, delay: 0.15 }}
          >
            <span className="h-px w-8 bg-accent" aria-hidden />
            Maison {ORIGIN_BRAND} · Cotonou
          </motion.p>

          <h1 className="mt-6 font-display text-bg">
            <MaskLine reduceMotion={reduceMotion} delay={0.28}>
              <span
                className="block font-light italic leading-[0.95] tracking-[-0.01em]"
                style={{ fontSize: "clamp(3rem, 8.5vw, 6.75rem)" }}
              >
                Gift
              </span>
            </MaskLine>
            <MaskLine reduceMotion={reduceMotion} delay={0.4}>
              <span
                className="block font-black uppercase leading-[0.86] tracking-[-0.02em]"
                style={{ fontSize: "clamp(2.6rem, 7.4vw, 6rem)" }}
              >
                <span className="text-accent">&</span> Entremets
              </span>
            </MaskLine>
          </h1>

          <motion.p
            className="mt-7 max-w-md font-display text-xl italic leading-snug text-bg/85 sm:text-2xl"
            initial={initial({ opacity: 0, y: 16 })}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EXPO, delay: 0.54 }}
          >
            {SLOGAN}.
          </motion.p>

          <motion.p
            className="mt-4 max-w-md font-body text-sm leading-relaxed text-bg/60"
            initial={initial({ opacity: 0, y: 16 })}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EXPO, delay: 0.62 }}
          >
            {content.sublinePrefix}{" "}
            <span className="text-bg/85">{content.sublineHighlight}</span>
          </motion.p>

          <motion.div
            className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4"
            initial={initial({ opacity: 0, y: 18 })}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EXPO, delay: 0.72 }}
          >
            <Link
              href={content.ctaHref}
              className="group relative inline-flex min-h-12 items-center gap-2.5 overflow-hidden rounded-full bg-accent px-8 py-3.5 font-body text-sm font-semibold text-text transition-shadow duration-500 hover:shadow-[0_18px_40px_-12px_rgba(201,169,110,0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              {/* Lueur interne qui respire + balayage au survol */}
              <span
                className="hero-cta-glow pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.7),transparent)]"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute inset-y-0 -left-full w-1/2 skew-x-[-18deg] bg-white/45 blur-md transition-transform duration-700 ease-out group-hover:translate-x-[320%]"
                aria-hidden
              />
              <span className="relative">{content.ctaLabel}</span>
              <ArrowUpRight
                className="relative size-4 transition-transform duration-500 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </Link>

            <Link
              href="/infos"
              className="group inline-flex items-center gap-1.5 font-body text-sm font-medium text-bg/75 transition-colors hover:text-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <span className="relative">
                La boutique
                <span
                  className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-accent transition-transform duration-500 ease-out group-hover:scale-x-100"
                  aria-hidden
                />
              </span>
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </motion.div>
        </div>

        {/* ── Vitrine : la pièce dans son cadre doré ── */}
        <motion.div
          className="order-1 mx-auto w-full max-w-[26rem] lg:order-2 lg:max-w-none lg:justify-self-end"
        >
          <motion.figure
            className="relative"
            initial={initial({ opacity: 0, y: 46, scale: 1.03 })}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.1, ease: EXPO, delay: 0.32 }}
          >
            {/* Passe-partout : double filet doré (le cadre = doré, détail) */}
            <div className="relative rounded-[2px] border border-accent/25 p-2.5 sm:p-3">
              <div className="relative aspect-[5/6] overflow-hidden rounded-[1px] border border-accent/45">
                <Image
                  src={content.imageUrl}
                  alt=""
                  fill
                  priority
                  quality={75}
                  sizes="(min-width: 1024px) 42vw, 88vw"
                  className="object-cover object-center"
                  unoptimized={content.imageUrl.endsWith(".svg")}
                />
                {/* Vignette interne — la lumière tombe au centre */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(120% 90% at 50% 42%, transparent 52%, rgba(20,12,26,0.5) 100%)",
                  }}
                  aria-hidden
                />
              </div>

              {/* Repères d'angle dorés — précision minérale */}
              <CornerTicks />
            </div>

            {/* Cartouche « menu du jour » — attaché à la vitrine */}
            <figcaption className="absolute -bottom-4 left-4 flex items-center gap-2.5 rounded-full border border-accent/30 bg-[rgba(20,12,26,0.55)] px-4 py-2 backdrop-blur-md sm:left-6">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <span className="font-body text-[10px] font-semibold uppercase tracking-[0.28em] text-bg/90">
                {content.menuBadgeLabel} · {BOUTIQUE_HOURS.label}
              </span>
            </figcaption>

            {/* Label vertical gravé sur la tranche */}
            <span
              className="absolute -left-3 top-1/2 hidden -translate-y-1/2 -rotate-90 font-body text-[10px] font-semibold uppercase tracking-[0.4em] text-accent/70 lg:block"
              aria-hidden
            >
              Édition Cotonou
            </span>
          </motion.figure>
        </motion.div>
      </div>

      {/* Ancre bas — lieu + invite au défilement */}
      <motion.div
        className="absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-3 px-6 text-bg/50 sm:bottom-8"
        initial={initial({ opacity: 0 })}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: EXPO, delay: 0.9 }}
      >
        <span className="h-px w-6 bg-bg/25" aria-hidden />
        <span className="font-body text-[10px] uppercase tracking-[0.3em]">
          {BOUTIQUE_LOCATION.short}
        </span>
        <span className="h-px w-6 bg-bg/25" aria-hidden />
      </motion.div>
    </section>
  );
}

/** Révélation par masque — la ligne monte sous la lumière. */
function MaskLine({
  children,
  delay,
  reduceMotion,
}: {
  children: React.ReactNode;
  delay: number;
  reduceMotion: boolean | null;
}) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className="block"
        initial={reduceMotion ? false : { y: "115%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.95, ease: EXPO, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** Repères d'angle en L — quatre coins de la vitrine. */
function CornerTicks() {
  const base = "pointer-events-none absolute h-4 w-4 border-accent/60";
  return (
    <>
      <span className={`${base} left-0 top-0 border-l border-t`} aria-hidden />
      <span className={`${base} right-0 top-0 border-r border-t`} aria-hidden />
      <span
        className={`${base} bottom-0 left-0 border-b border-l`}
        aria-hidden
      />
      <span
        className={`${base} bottom-0 right-0 border-b border-r`}
        aria-hidden
      />
    </>
  );
}
