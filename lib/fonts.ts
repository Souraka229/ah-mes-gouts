import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

/**
 * Display : Fraunces (variable) — sa plage opsz/wght porte à elle seule le
 * contraste graisse/italique de la direction « écrin de nuit ».
 */
export const fontDisplay = Fraunces({
  variable: "--font-family-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  preload: true,
});

export const fontBody = Plus_Jakarta_Sans({
  variable: "--font-family-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

export const fontVariables = `${fontDisplay.variable} ${fontBody.variable}`;
