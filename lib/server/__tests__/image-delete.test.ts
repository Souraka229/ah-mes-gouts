import { describe, expect, it } from "vitest";

import { deleteSiteImage } from "@/lib/server/image-upload";

/**
 * Garde-fou de suppression.
 *
 * Ces cas refusent **avant** toute entrée/sortie : aucun accès réseau, aucune
 * suppression de fichier. C'est la propriété qui compte — une URL forgée ne
 * doit jamais pouvoir effacer une photo livrée avec le site, ni sortir de
 * l'espace de téléversement.
 */
describe("suppression d'image — refus", () => {
  it("refuse une adresse vide", async () => {
    await expect(deleteSiteImage("   ")).rejects.toThrow(
      /Adresse d'image manquante/,
    );
  });

  it("refuse une photo livrée avec le site", async () => {
    // Les vraies photos de l'atelier ne sont pas des envois : les effacer
    // casserait tous les produits qui les partagent.
    await expect(
      deleteSiteImage("/images/produits/bouquet-12-roses.webp"),
    ).rejects.toThrow(/ne vient pas de l'espace de téléversement/);

    await expect(
      deleteSiteImage("/images/placeholders/roses/bouquet-20-roses.webp"),
    ).rejects.toThrow(/ne vient pas de l'espace de téléversement/);
  });

  it("refuse une URL externe quelconque", async () => {
    await expect(
      deleteSiteImage("https://exemple.test/une-image.webp"),
    ).rejects.toThrow(/ne vient pas de l'espace de téléversement/);
  });

  it("refuse une traversée de chemin dans le bucket", async () => {
    await expect(
      deleteSiteImage(
        "https://exemple.supabase.co/storage/v1/object/public/cms-images/../../autre.webp",
      ),
    ).rejects.toThrow(/Chemin d'image invalide/);
  });

  it("refuse une traversée de chemin dans les envois locaux", async () => {
    await expect(
      deleteSiteImage("/images/uploads/../produits/bouquet-roses.webp"),
    ).rejects.toThrow(/Chemin d'image invalide/);
  });
});
