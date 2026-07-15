"use client";

import { useId } from "react";
import type { ReactNode } from "react";

/**
 * Shell de section — gère l'alternance « nuit » (mur violet / bleu nuit) et
 * « jour » (respiration crème / bleu-gris) de la direction « écrin de nuit ».
 * Le grain soft-light n'apparaît que sur les aplats sombres.
 */

export type SectionTone = "violet" | "nuit" | "creme" | "bluegray";

const TONE: Record<SectionTone, { bg: string; text: string; dark: boolean }> = {
  violet: { bg: "bg-primary", text: "text-bg", dark: true },
  nuit: { bg: "bg-nuit", text: "text-bg", dark: true },
  creme: { bg: "bg-bg", text: "text-text", dark: false },
  bluegray: { bg: "bg-bluegray", text: "text-text", dark: false },
};

function Grain() {
  const id = useId();
  return (
    <div
      className="pointer-events-none absolute inset-0 mix-blend-soft-light"
      style={{ opacity: 0.1 }}
      aria-hidden
    >
      <svg className="h-full w-full" preserveAspectRatio="none">
        <filter id={id}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </div>
  );
}

export function NightDaySection({
  tone,
  children,
  id,
  ariaLabel,
  className,
  innerClassName,
  container = true,
}: {
  tone: SectionTone;
  children: ReactNode;
  id?: string;
  ariaLabel?: string;
  className?: string;
  innerClassName?: string;
  /** Enrobe le contenu dans un conteneur centré ; false = full-bleed. */
  container?: boolean;
}) {
  const t = TONE[tone];
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={`relative w-full overflow-hidden ${t.bg} ${t.text} ${className ?? ""}`}
    >
      {t.dark && <Grain />}
      {container ? (
        <div
          className={`relative z-10 mx-auto w-full max-w-[1400px] px-6 sm:px-10 lg:px-[6vw] ${innerClassName ?? ""}`}
        >
          {children}
        </div>
      ) : (
        <div className={`relative z-10 ${innerClassName ?? ""}`}>{children}</div>
      )}
    </section>
  );
}
