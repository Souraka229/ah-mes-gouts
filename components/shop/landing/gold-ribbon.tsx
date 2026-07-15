"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * Fil rouge de la landing : un ruban doré sinueux qui se dessine au fil du
 * défilement (SVG `pathLength` piloté par la progression scroll de la section
 * hôte). Posé sur les gouttières, il relie visuellement les sections.
 * Fallback `prefers-reduced-motion` : tracé plein, statique.
 */

/** Ondulation verticale douce — pour les gouttières de section. */
export const RIBBON_VERTICAL =
  "M30 -10 C 8 120, 52 240, 30 360 C 8 480, 52 600, 30 720 C 14 820, 40 880, 30 960";

/** Grand S horizontal — pour relier deux blocs côte à côte. */
export const RIBBON_S =
  "M-10 40 C 180 -10, 320 90, 500 40 C 680 -10, 820 90, 1010 40";

export function GoldRibbon({
  className,
  path = RIBBON_VERTICAL,
  viewBox = "0 0 60 900",
  strokeWidth = 1.25,
  opacity = 0.5,
}: {
  className?: string;
  path?: string;
  viewBox?: string;
  strokeWidth?: number;
  opacity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const drawn = useTransform(scrollYProgress, [0, 0.82], [0, 1]);

  return (
    <div ref={ref} className={className} aria-hidden>
      <svg
        className="h-full w-full"
        viewBox={viewBox}
        fill="none"
        preserveAspectRatio="none"
      >
        <motion.path
          d={path}
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{ pathLength: reduceMotion ? 1 : drawn, opacity }}
        />
      </svg>
    </div>
  );
}
