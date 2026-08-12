import type { MetadataRoute } from "next";

import { SITE_NAME } from "@/lib/seo/site";

/**
 * Manifeste de la boutique — c'est lui qui rend le site installable.
 * Le back-office et le portail livreur ont leurs propres manifestes, avec
 * leur propre `scope`, pour que les trois applications restent distinctes
 * une fois installées.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME} — Entremets & glaces artisanales`,
    short_name: SITE_NAME,
    description:
      "Commandez vos entremets et glaces artisanales à Cotonou. Livraison ou retrait à Fidjrosse.",
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF7F5",
    theme_color: "#17181B",
    categories: ["food", "shopping", "lifestyle"],
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
      // `maskable` : Android rogne les bords pour appliquer sa forme d'icône.
      // Sans cette variante, le monogramme est amputé sur la plupart des
      // lanceurs.
      {
        src: "/pwa/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/pwa/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Le menu du jour",
        short_name: "Menu",
        url: "/catalogue",
      },
      {
        name: "Suivre ma commande",
        short_name: "Ma commande",
        url: "/commande/confirmation",
      },
    ],
  };
}
