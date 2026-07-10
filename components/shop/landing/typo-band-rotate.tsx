"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { SITE_NAME } from "@/lib/seo/site";
import { cn } from "@/lib/utils";

const ROTATE_INTERVAL_MS = 4000;

type TypoBandRotateProps = {
  messages: string[];
  compact?: boolean;
};

/**
 * Messages statiques en rotation — fade 4s, lisible et accessible.
 */
export function TypoBandRotate({
  messages,
  compact = false,
}: TypoBandRotateProps) {
  const reduceMotion = useReducedMotion();
  const items = messages.length > 0 ? messages : [SITE_NAME];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion || items.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [items.length, reduceMotion]);

  const displayText = reduceMotion ? items[0]! : items[index]!;

  return (
    <section
      className={cn(
        "relative overflow-x-hidden",
        compact ? "my-2 py-2" : "my-[6vh] py-[10vh]",
      )}
      aria-label="Signature de marque"
      aria-live="polite"
    >
      <div
        className={cn(
          "relative w-full max-w-[100vw] md:w-[110vw]",
          compact ? "py-2" : "py-[5vh]",
        )}
        style={{
          transform: "rotate(-3deg)",
        }}
      >
        <div
          className={cn(
            "flex min-h-[1.2em] items-center justify-center bg-accent text-center",
            compact ? "py-4 px-4" : "py-[4vh] px-[5vw]",
          )}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={displayText}
              initial={reduceMotion ? false : { opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={reduceMotion ? undefined : { opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.5 }}
              className={cn(
                "font-display font-bold tracking-[-0.02em] text-primary",
                compact ? "typo-band-rotate-text--compact" : "typo-band-rotate-text",
              )}
            >
              {displayText}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
