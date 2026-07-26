import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

/**
 * Display : Fraunces (variable) — preload seul le body pour libérer la bande
 * passante LCP ; Fraunces charge en swap sans bloquer le hero.
 */
export const fontDisplay = Fraunces({
  variable: "--font-family-display",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

export const fontBody = Plus_Jakarta_Sans({
  variable: "--font-family-body",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const fontVariables = `${fontDisplay.variable} ${fontBody.variable}`;
