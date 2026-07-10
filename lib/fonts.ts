import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";

export const fontDisplay = Cormorant_Garamond({
  variable: "--font-family-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const fontBody = Plus_Jakarta_Sans({
  variable: "--font-family-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const fontVariables = `${fontDisplay.variable} ${fontBody.variable}`;
