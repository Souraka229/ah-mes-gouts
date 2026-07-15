"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * API d'animation unique de la landing « écrin de nuit ».
 * Easing « révélation sous la lumière » — sortie lente, cérémonieuse.
 * Toute animation passe par ici pour éviter les easings par défaut disséminés.
 */
export const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Révélation par masque — la ligne monte sous la lumière depuis une fenêtre
 * qui la découpe. Pour les titres display.
 */
export function MaskLine({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <span className={`block overflow-hidden pb-[0.08em] ${className ?? ""}`}>
      <motion.span
        className="block"
        initial={reduceMotion ? false : { y: "115%" }}
        whileInView={{ y: "0%" }}
        viewport={{ once: true, margin: "-12% 0px" }}
        transition={{ duration: 0.95, ease: EXPO, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

type RevealDirection = "up" | "down" | "left" | "right" | "none";

const OFFSET: Record<RevealDirection, { x?: number; y?: number }> = {
  up: { y: 28 },
  down: { y: -28 },
  left: { x: 36 },
  right: { x: -36 },
  none: {},
};

/**
 * Reveal au scroll — glissement + fondu discret. Le `stagger` se pilote par
 * `delay` (60–90 ms d'écart entre éléments d'une même section).
 */
export function Reveal({
  children,
  delay = 0,
  direction = "up",
  duration = 0.8,
  className,
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  direction?: RevealDirection;
  duration?: number;
  className?: string;
  once?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const offset = OFFSET[direction];
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: "-12% 0px" }}
      transition={{ duration, ease: EXPO, delay }}
    >
      {children}
    </motion.div>
  );
}
