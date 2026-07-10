"use client";

import Image from "next/image";
import Link from "next/link";
import { useId } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

import { LandingMenuBadge } from "@/components/shop/landing/landing-menu-badge";
import { MENU_DU_JOUR_CATALOGUE_HREF } from "@/lib/landing-data";
import { SITE_NAME, SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";
import type { HeroSectionContent } from "@/types/site-content";

const HERO_IMAGE_ROTATION = -7;
const CTA_SIZE_PX = 90;
const CTA_LEFT_OFFSET_PX = -(CTA_SIZE_PX * 0.75);

const CTA_GOLD_SHADOW =
  "0 10px 32px rgba(201, 169, 110, 0.38), 0 3px 12px rgba(201, 169, 110, 0.22)";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

function HeroBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        background:
          "radial-gradient(circle at 20% 30%, rgba(243, 201, 206, 0.25) 0%, transparent 60%)",
      }}
      aria-hidden
    />
  );
}

function HeroGrainOverlay() {
  const filterId = useId();

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[2]"
      style={{ opacity: 0.04, mixBlendMode: "multiply" }}
      aria-hidden
    >
      <svg className="h-full w-full" preserveAspectRatio="none">
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="4"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    </div>
  );
}

function HeroCurvedCta({ href, label }: { href: string; label: string }) {
  const pathId = useId();

  return (
    <Link
      href={href}
      className="relative flex cursor-pointer items-center justify-center rounded-full bg-accent transition-transform duration-200 hover:scale-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      style={{
        width: CTA_SIZE_PX,
        height: CTA_SIZE_PX,
        minWidth: CTA_SIZE_PX,
        minHeight: CTA_SIZE_PX,
        boxShadow: CTA_GOLD_SHADOW,
      }}
      aria-label={label}
    >
      <svg
        viewBox="0 0 90 90"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        <path id={pathId} d="M 14 48 A 31 31 0 1 1 76 48" fill="none" />
        <text
          className="fill-text font-body font-bold uppercase"
          style={{ fontSize: "7.5px", letterSpacing: "0.22em" }}
        >
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {label}
          </textPath>
        </text>
      </svg>
    </Link>
  );
}

export function RadicalHeroSection({ content }: { content: HeroSectionContent }) {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  const imageY = useTransform(scrollY, (value) => {
    if (reduceMotion) return 0;
    const halfViewport =
      typeof window !== "undefined" ? window.innerHeight * 0.5 : 400;
    const progress = Math.min(Math.max(value / halfViewport, 0), 1);
    return progress * 40;
  });

  const titleDelay = 0;
  const sublineDelay = reduceMotion ? 0 : 0.15;
  const ctaDelay = reduceMotion ? 0 : 0.35;

  return (
    <section
      className="relative min-h-[100dvh] w-full overflow-hidden lg:h-[100vh] lg:max-h-[100vh]"
      aria-label={`Accueil ${SITE_NAME_WITH_CREDIT}`}
    >
      <HeroBackground />
      <HeroGrainOverlay />

      <div
        className="pointer-events-none absolute z-[3] hidden rounded-full border-[1.5px] border-accent lg:block"
        style={{ width: 300, height: 300, right: -110, bottom: -95 }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute z-[3] hidden rounded-full border border-secondary/55 lg:block"
        style={{ width: 228, height: 228, right: -74, bottom: -59 }}
        aria-hidden
      />

      {/* Mobile-first : texte puis image — jamais de chevauchement badge/titre */}
      <div className="relative z-10 flex min-h-[100dvh] flex-col px-5 pt-[12vh] sm:px-8 lg:grid lg:min-h-[100vh] lg:grid-cols-2 lg:items-center lg:gap-10 lg:px-[8vw] lg:pt-[14vh]">
        <div className="max-w-2xl shrink-0">
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            custom={0}
            variants={fadeUp}
            style={{ marginBottom: "24px" }}
          >
            <LandingMenuBadge
              label={content.menuBadgeLabel}
              href={MENU_DU_JOUR_CATALOGUE_HREF}
            />
          </motion.div>

          <motion.h1
            className="font-display font-bold leading-[0.88] tracking-[-0.03em] text-primary"
            style={{
              fontSize: "clamp(3rem, 12vw, 11rem)",
              textAlign: "left",
            }}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            custom={titleDelay}
            variants={fadeUp}
          >
            {content.titleLine1}
            <br />
            {content.titleLine2}
          </motion.h1>

          <motion.p
            className="mt-6 font-body text-[1.1rem] font-semibold tracking-[0.08em] uppercase"
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            custom={sublineDelay}
            variants={fadeUp}
          >
            <span className="text-primary">{content.sublinePrefix}</span>{" "}
            <span className="bg-secondary/55 px-2 py-0.5 text-primary">
              {content.sublineHighlight}
            </span>
          </motion.p>
        </div>

        <div className="relative mt-10 w-full min-w-0 pb-16 lg:mt-0 lg:pb-0">
          <motion.div
            style={{ y: imageY }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <Link
              href={MENU_DU_JOUR_CATALOGUE_HREF}
              className="relative block aspect-[4/5] w-full overflow-hidden rounded-[2rem] shadow-[0_24px_64px_rgba(59,31,77,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              aria-label="Voir le menu du jour"
            >
              <Image
                src={content.imageUrl}
                alt={`Création glacée signature ${SITE_NAME} — Mango Passion`}
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 45vw"
                unoptimized={content.imageUrl.endsWith(".svg")}
                className="object-cover object-center"
                style={{
                  transform: `rotate(${HERO_IMAGE_ROTATION}deg) scale(1.08)`,
                }}
              />
            </Link>

            <motion.div
              className="absolute top-[68%] z-20 -translate-y-1/2"
              style={{ left: CTA_LEFT_OFFSET_PX }}
              initial={reduceMotion ? false : "hidden"}
              animate="visible"
              custom={ctaDelay}
              variants={fadeUp}
            >
              <HeroCurvedCta href={content.ctaHref} label={content.ctaLabel} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
