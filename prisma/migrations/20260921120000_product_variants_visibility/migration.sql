-- Variantes produit génériques + visibilité éditoriale + snapshot de variante
-- sur les lignes de commande.
--
-- MIGRATION ADDITIVE UNIQUEMENT :
--   * aucune colonne supprimée, aucune table supprimée ;
--   * aucune donnée réécrite — les produits existants deviennent
--     « published » par défaut et restent donc visibles à l'identique ;
--   * les contraintes sont posées en IF NOT EXISTS / garde d'exception pour
--     pouvoir être rejouées sans échouer.

-- ─── 1. Produit : visibilité, libellé de variante, sous-type ────────────────
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "visibility"   TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS "variantLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "subtype"      TEXT;

-- ─── 2. Ligne de commande : snapshot de la variante ────────────────────────
-- Sans clé étrangère, volontairement : une variante désactivée ou supprimée ne
-- doit jamais pouvoir casser une commande passée. Prix et libellé sont figés.
ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "variantId"    TEXT,
  ADD COLUMN IF NOT EXISTS "variantLabel" TEXT;

-- ─── 3. Table des variantes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ProductVariant" (
  "id"             TEXT         NOT NULL,
  "productId"      TEXT         NOT NULL,
  "code"           TEXT         NOT NULL,
  "label"          TEXT         NOT NULL,
  "price"          INTEGER      NOT NULL,
  "sortOrder"      INTEGER      NOT NULL DEFAULT 0,
  "isActive"       BOOLEAN      NOT NULL DEFAULT true,
  "stockRemaining" INTEGER,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_productId_code_key"
  ON "ProductVariant"("productId", "code");

CREATE INDEX IF NOT EXISTS "ProductVariant_productId_isActive_sortOrder_idx"
  ON "ProductVariant"("productId", "isActive", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "ProductVariant"
    ADD CONSTRAINT "ProductVariant_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. RLS — le point qui protège les brouillons ET les prix ──────────────
ALTER TABLE "ProductVariant" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_variant_public_read" ON "ProductVariant";
CREATE POLICY "product_variant_public_read" ON "ProductVariant"
  FOR SELECT USING (
    "isActive" = true
    AND EXISTS (
      SELECT 1 FROM "Product" p
      WHERE p."id" = "ProductVariant"."productId"
        AND p."visibility" = 'published'
    )
  );

-- Aucune policy INSERT / UPDATE / DELETE sur "ProductVariant" : le rôle anon
-- ne peut donc toujours pas écrire un prix. Même garantie que sur "Product".

-- Un brouillon ne doit pas être lisible via l'API REST publique (PostgREST).
-- Le site lit le catalogue via Prisma (rôle serveur, hors RLS) : cette
-- restriction ne concerne que la surface anon.
DROP POLICY IF EXISTS "product_public_read" ON "Product";
CREATE POLICY "product_public_read" ON "Product"
  FOR SELECT USING ("visibility" = 'published');
