import type { NextConfig } from "next";
import path from "path";

/**
 * Hôte Supabase Storage — les images importées depuis le back-office y
 * atterrissent. Sans ce host dans `remotePatterns`, `/_next/image` renvoie 400
 * et la page n'affiche que le texte alternatif.
 */
const supabaseHostname = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@base-ui/react",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // 85 pour les photos produit : à 75, les dégradés de glaçage et la feuille
    // d'or partent en aplats. Next refuse toute valeur absente de cette liste.
    qualities: [65, 75, 85],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // 1920 et 2048 pour les écrans retina : plafonné à 1200, le hero était
    // servi en 1200 px puis agrandi par le navigateur.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    // Aucun SVG distant n'est affiché : l'autoriser ouvrait un vecteur XSS
    // via /_next/image sur n'importe quel hôte de remotePatterns.
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      // Projet Supabase courant + filet de sécurité si l'URL du projet change.
      ...(supabaseHostname
        ? [{ protocol: "https" as const, hostname: supabaseHostname }]
        : []),
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    // CSP — 'unsafe-inline' sur script-src est requis par le bootstrap inline
    // de Next.js. Le reste est verrouillé : pas de frame, pas de form-action
    // externe, connexions limitées à Supabase.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co https://images.unsplash.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src 'self' https://www.google.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      {
        // Le back-office ne doit jamais être indexé ni mis en cache partagé.
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store, private" },
        ],
      },
      {
        // Un service worker mis en cache par le CDN fige la version installée
        // chez les clientes : il doit toujours être revalidé.
        source: "/shop-sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/admin-sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/admin/" },
        ],
      },
      {
        source: "/driver-sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/livreur/" },
        ],
      },
      {
        source: "/manifest-admin.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
