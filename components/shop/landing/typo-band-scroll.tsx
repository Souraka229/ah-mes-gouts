"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";

const SCROLL_DURATION_S = 28;

type TypoBandScrollProps = {
  text: string;
  compact?: boolean;
};

/**
 * Défilement droite → gauche, ≥25s par cycle, pause au survol / bouton mobile.
 */
export function TypoBandScroll({ text, compact = false }: TypoBandScrollProps) {
  const [paused, setPaused] = useState(false);
  const duplicated = `${text}  ·  ${text}  ·  `;

  const textClass = compact
    ? "typo-band-scroll-text--compact"
    : "typo-band-scroll-text";

  return (
    <section
      className={cn(
        "relative overflow-x-hidden",
        compact ? "my-2 py-2" : "my-[6vh] py-[10vh]",
      )}
      aria-label="Signature de marque"
    >
      <div
        className={cn(
          "relative w-full max-w-[100vw] md:w-[110vw]",
          compact ? "py-2" : "py-[5vh]",
        )}
        style={{ transform: "translateX(0) rotate(-3deg)" }}
      >
        <div
          className={cn(
            "group relative bg-accent",
            compact ? "py-2" : "py-[4vh]",
          )}
        >
          <div
            className={cn(
              "typo-band-scroll-track flex w-max items-center",
              paused && "typo-band-scroll-paused",
            )}
            style={{ animationDuration: `${SCROLL_DURATION_S}s` }}
          >
            <p
              className={cn(
                "whitespace-nowrap px-[5vw] font-display font-bold tracking-[-0.02em] text-primary",
                textClass,
              )}
            >
              {duplicated}
            </p>
            <p
              className={cn(
                "whitespace-nowrap px-[5vw] font-display font-bold tracking-[-0.02em] text-primary",
                textClass,
              )}
              aria-hidden
            >
              {duplicated}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="absolute right-3 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-primary/30 bg-white/90 md:hidden"
            aria-label={paused ? "Reprendre" : "Pause"}
          >
            {paused ? (
              <Play className="size-3.5 text-primary" />
            ) : (
              <Pause className="size-3.5 text-primary" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
