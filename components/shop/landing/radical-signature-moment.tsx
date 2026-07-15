"use client";

import Image from "next/image";
import { useMemo, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { LANDING_COPY, LANDING_IMAGES } from "@/lib/landing-data";
import { SLOGAN_PASSION } from "@/lib/business-info";
import { SITE_NAME } from "@/lib/seo/site";
import type { SignatureMomentSectionContent } from "@/types/site-content";

import { GoldRibbon } from "@/components/shop/landing/gold-ribbon";
import { MaskLine, Reveal } from "@/components/shop/landing/reveal";
import { NightDaySection } from "@/components/shop/landing/night-day-section";

export function RadicalSignatureMomentSection({
  content,
}: {
  content: SignatureMomentSectionContent;
}) {
  const lineRef = useRef<HTMLParagraphElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: lineRef,
    offset: ["start 0.85", "end 0.4"],
  });

  const words = useMemo(() => content.text.split(" "), [content.text]);

  return (
    <NightDaySection
      tone="nuit"
      ariaLabel="Signature & savoir-faire"
      innerClassName="py-[16vh] lg:py-[20vh]"
    >
      {/* Halo tendre (rose) — un peu de chaleur sur le bleu froid */}
      <div
        className="pointer-events-none absolute left-1/2 top-[22%] h-[80vmin] w-[80vmin] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(closest-side, rgba(243,201,206,0.16), transparent 70%)",
        }}
        aria-hidden
      />

      {/* ── Ligne signature — s'illumine mot à mot à la lecture ── */}
      <div className="relative">
        <span className="flex items-center gap-3 font-body text-[11px] font-semibold uppercase tracking-[0.34em] text-accent">
          <span className="h-px w-8 bg-accent" aria-hidden />
          Signature
        </span>
        <p
          ref={lineRef}
          className="mt-6 max-w-[min(94vw,20ch)] font-display font-light italic leading-[1.05] tracking-[-0.01em]"
          style={{ fontSize: "clamp(2.25rem, 6.5vw, 5.25rem)" }}
        >
          {words.map((word, index) => (
            <ScrollWord
              key={`${word}-${index}`}
              word={word}
              index={index}
              total={words.length}
              progress={scrollYProgress}
              reduceMotion={reduceMotion ?? false}
            />
          ))}
        </p>
      </div>

      {/* ── Savoir-faire — narratif texte + pièce, le ruban accompagne ── */}
      <div className="relative mt-[14vh] grid grid-cols-1 items-center gap-12 lg:mt-[16vh] lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-20">
        <GoldRibbon className="pointer-events-none absolute -left-4 top-0 hidden h-full w-16 lg:block" />

        <div>
          <h2 className="font-display text-bg">
            <MaskLine>
              <span
                className="block font-light italic leading-[0.98]"
                style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
              >
                Le savoir-faire
              </span>
            </MaskLine>
            <MaskLine delay={0.08}>
              <span
                className="block font-black uppercase leading-[0.9] tracking-[-0.01em]"
                style={{ fontSize: "clamp(1.6rem, 3.4vw, 2.6rem)" }}
              >
                d’une maison
              </span>
            </MaskLine>
          </h2>

          <Reveal delay={0.1}>
            <p className="mt-7 max-w-xl font-body text-base leading-relaxed text-bg/70">
              {LANDING_COPY.storyPlaceholder}
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <p className="mt-8 max-w-md border-l border-accent/50 pl-5 font-display text-xl font-light italic leading-snug text-bg/90 sm:text-2xl">
              « {SLOGAN_PASSION} »
            </p>
          </Reveal>
        </div>

        {/* La pièce — cadre doré, halo, sur le mur bleu */}
        <Reveal direction="left" delay={0.12} className="justify-self-center lg:justify-self-end">
          <figure className="relative w-[min(78vw,26rem)]">
            <div
              className="pointer-events-none absolute -inset-6 opacity-80"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(243,201,206,0.28), transparent 72%)",
              }}
              aria-hidden
            />
            <div className="relative rounded-[2px] border border-accent/25 p-2.5">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1px] border border-accent/45">
                <Image
                  src={LANDING_IMAGES.foretBlanche}
                  alt={`Création artisanale — ${SITE_NAME}`}
                  fill
                  sizes="(min-width: 1024px) 26rem, 78vw"
                  className="object-cover object-center"
                  unoptimized={LANDING_IMAGES.foretBlanche.endsWith(".svg")}
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(120% 90% at 50% 42%, transparent 55%, rgba(15,20,40,0.5) 100%)",
                  }}
                  aria-hidden
                />
              </div>
            </div>
          </figure>
        </Reveal>
      </div>
    </NightDaySection>
  );
}

type ScrollWordProps = {
  word: string;
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  reduceMotion: boolean;
};

/** Chaque mot s'allume quand le regard l'atteint — lire, c'est éclairer. */
function ScrollWord({
  word,
  index,
  total,
  progress,
  reduceMotion,
}: ScrollWordProps) {
  const start = (index / total) * 0.7;
  const end = start + 0.24;

  const opacity = useTransform(
    progress,
    [start, end],
    reduceMotion ? [1, 1] : [0.14, 1],
  );

  return (
    <motion.span style={{ opacity }} className="mr-[0.26em] inline-block">
      {word}
    </motion.span>
  );
}
