import type { Metadata, Viewport } from "next";

import { fontVariables } from "@/lib/fonts";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Barre système alignée sur le noir de marque, pas sur le bleu d'action :
  // une fois installée, l'application doit lire « maison de pâtisserie ».
  themeColor: "#17181B",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Glaces & entremets premium à Cotonou`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Glacier premium à Cotonou, Bénin. Commandez glaces artisanales et entremets en ligne avec livraison rapide.",
  applicationName: SITE_NAME,
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/pwa/icon.svg", type: "image/svg+xml" },
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    // iOS n'a pas de theme_color : la barre de statut se règle ici.
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: true,
    email: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={fontVariables}>{children}</body>
    </html>
  );
}
