import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  const safeToken = token && /^[a-zA-Z0-9-]{20,100}$/.test(token) ? token : "";
  const startUrl = safeToken ? `/livreur/${safeToken}` : "/livreur";

  return NextResponse.json(
    {
      id: "/livreur",
      name: "Ah Mes Goûts Livreur",
      short_name: "Livreur",
      lang: "fr",
      start_url: startUrl,
      scope: "/livreur/",
      display: "standalone",
      background_color: "#FAF7F5",
      theme_color: "#6B8F71",
      icons: [
        {
          src: "/pwa/driver-icon.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any",
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
