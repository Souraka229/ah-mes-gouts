import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/site";

/** Jamais indexable : back-office, API, tunnel de commande, suivi client. */
const PRIVATE_PATHS = [
  "/admin/",
  "/api/",
  "/checkout",
  "/panier",
  "/commande/",
  "/suivi/",
  "/livreur/",
  "/offline",
];

/**
 * Robots des moteurs génératifs.
 *
 * `User-Agent: *` les autorise déjà implicitement, mais une déclaration
 * explicite lève l'ambiguïté et permet de leur ouvrir exactement les pages qui
 * répondent à une question — pas le tunnel de commande, qui n'a rien à dire.
 */
const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "Bytespider",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: AI_AGENTS,
        allow: ["/", "/catalogue", "/produit/", "/zones-de-livraison", "/infos", "/contact"],
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
