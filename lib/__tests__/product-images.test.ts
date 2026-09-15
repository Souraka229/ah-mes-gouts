import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRODUCT_IMAGE,
  getProductImageUrl,
  LANDING_EXTRA_IMAGES,
  PRODUCT_GALLERY_MAX,
} from "@/lib/product-images";
import {
  getUpsellImageUrl,
  UPSELL_PRODUCT_IMAGES,
} from "@/lib/upsell-images";

const PUBLIC_DIR = path.join(process.cwd(), "public");

function existsInPublic(url: string): boolean {
  if (!url || /^https?:\/\//.test(url)) return true;
  return existsSync(path.join(PUBLIC_DIR, url.replace(/^\//, "")));
}

/**
 * Une image cassée en boutique est invisible en test et bien visible en
 * production. Ces garde-fous vérifient que tout chemin que le code peut
 * produire correspond à un fichier réellement présent dans `public/`.
 */
describe("visuels produits", () => {
  it("le repli par défaut pointe vers un fichier existant", () => {
    expect(existsInPublic(DEFAULT_PRODUCT_IMAGE)).toBe(true);
  });

  it("chaque slug cadeau résout vers un fichier existant", () => {
    for (const slug of [
      "nounours",
      "nounours-beige",
      "bouquet-roses",
      "carte-cadeau",
      "supplement-chocolats",
      "supplement-chocolats-paquet",
    ]) {
      const url = getProductImageUrl(slug);
      expect(existsInPublic(url), `${slug} → ${url}`).toBe(true);
    }
  });

  it("un slug inconnu ne reçoit JAMAIS la photo d'un autre produit", () => {
    // Vide = emplacement neutre côté UI. Surtout pas l'image d'un autre
    // produit, ni une carte cadeau par défaut.
    expect(getProductImageUrl("slug-qui-nexiste-pas")).toBe("");
  });

  it("les produits autrefois mal servis ont leur propre visuel", () => {
    // `carte-cadeau` affichait la photo de Goyave Vanille, `speculoos` celle
    // de Chocolat Cappuccino. Les deux ont désormais leur propre fichier dans
    // `produits/` (et non `catalog/`, exclu du déploiement par .vercelignore).
    expect(getProductImageUrl("carte-cadeau")).toBe(
      "/images/produits/carte-cadeau.webp",
    );
    expect(getProductImageUrl("speculoos")).toBe(
      "/images/produits/speculoos.webp",
    );
    expect(existsInPublic(getProductImageUrl("carte-cadeau"))).toBe(true);
    expect(existsInPublic(getProductImageUrl("speculoos"))).toBe(true);
  });

  it("aucun visuel de upsell ne pointe dans le vide", () => {
    for (const entry of UPSELL_PRODUCT_IMAGES) {
      expect(existsInPublic(entry.path), `${entry.slug} → ${entry.path}`).toBe(
        true,
      );
    }
  });

  it("le repli upsell ne s'applique qu'aux vrais produits cadeaux", () => {
    expect(getUpsellImageUrl("slug-qui-nexiste-pas")).toBeUndefined();
    expect(existsInPublic(getUpsellImageUrl("carte-cadeau")!)).toBe(true);
  });

  it("les visuels de landing existent", () => {
    for (const url of Object.values(LANDING_EXTRA_IMAGES)) {
      expect(existsInPublic(url), url).toBe(true);
    }
  });

  it("la galerie est plafonnée", () => {
    expect(PRODUCT_GALLERY_MAX).toBeLessThanOrEqual(3);
  });
});
