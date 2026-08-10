/**
 * Source de vérité JS pour les design tokens Ah Mes Goûts.
 * Synchroniser avec le bloc @theme dans app/globals.css.
 */
export const colors = {
  bg: "#FAF7F5",
  primary: "#17181B",
  secondary: "#DCE9F2",
  accent: "#A6283A",
  text: "#221F1E",
  success: "#6B8F71",
  photoBg: "#E8DFD4",
} as const;

export const fonts = {
  display: "var(--font-family-display)",
  body: "var(--font-family-body)",
} as const;

export const radius = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.25rem",
  full: "9999px",
} as const;

export const motion = {
  fast: "200ms",
  normal: "250ms",
  slow: "400ms",
} as const;

export const designTokens = {
  colors,
  fonts,
  radius,
  motion,
} as const;

export type DesignColor = keyof typeof colors;
