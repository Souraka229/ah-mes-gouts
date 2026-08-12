import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  const safeToken = token && /^[a-zA-Z0-9-]{20,100}$/.test(token) ? token : "";
  const startUrl = safeToken ? `/livreur/${safeToken}` : "/livreur";

  return NextResponse.json(
    {
      id: "/livreur",
      name: "Gift & ENTREMETS — Livreur",
      short_name: "G&E Livreur",
      description: "Tournées du jour et confirmations de livraison.",
      lang: "fr",
      dir: "ltr",
      start_url: startUrl,
      scope: "/livreur/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#FAF7F5",
      theme_color: "#0077B3",
      icons: [
        {
          src: "/pwa/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/pwa/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/pwa/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "private, no-store",
      },
    },
  );
}
