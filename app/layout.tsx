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
  // Les icônes ne sont pas déclarées ici : Next les génère depuis
  // app/favicon.ico, app/icon.png et app/apple-icon.png. Une déclaration
  // manuelle entrerait en conflit avec cette convention de fichiers.
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
