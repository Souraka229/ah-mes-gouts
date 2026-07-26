import type { Metadata, Viewport } from "next";

import { fontVariables } from "@/lib/fonts";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF7F5",
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
