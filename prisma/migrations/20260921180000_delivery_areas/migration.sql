-- Lieux de livraison — le tarif passe de la zone au lieu.
--
-- MIGRATION ADDITIVE UNIQUEMENT :
--   * aucune colonne supprimée, aucune table supprimée ;
--   * « DeliveryZone » est inchangée : sa colonne « cost » reste en place et
--     garde sa valeur, elle sert de repli tant qu'un lieu n'a pas de prix ;
--   * aucune donnée réécrite ;
--   * contraintes posées en IF NOT EXISTS / garde d'exception pour pouvoir
--     être rejouées sans échouer.

-- ─── Table des lieux ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DeliveryArea" (
  "id"        TEXT         NOT NULL,
  "zoneId"    TEXT         NOT NULL,
  "name"      TEXT         NOT NULL,
  "price"     INTEGER      NOT NULL,
  "sortOrder" INTEGER      NOT NULL DEFAULT 0,
  "isActive"  BOOLEAN      NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryArea_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryArea_zoneId_name_key"
  ON "DeliveryArea"("zoneId", "name");

CREATE INDEX IF NOT EXISTS "DeliveryArea_zoneId_isActive_sortOrder_idx"
  ON "DeliveryArea"("zoneId", "isActive", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "DeliveryArea"
    ADD CONSTRAINT "DeliveryArea_zoneId_fkey"
    FOREIGN KEY ("zoneId") REFERENCES "DeliveryZone"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Lecture publique des lieux actifs d'une zone active — c'est ce que le
-- sélecteur du checkout interroge. Aucune policy INSERT / UPDATE / DELETE :
-- le rôle anon ne peut donc toujours pas écrire un tarif de livraison.
ALTER TABLE "DeliveryArea" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_area_public_read" ON "DeliveryArea";
CREATE POLICY "delivery_area_public_read" ON "DeliveryArea"
  FOR SELECT USING (
    "isActive" = true
    AND EXISTS (
      SELECT 1 FROM "DeliveryZone" z
      WHERE z."id" = "DeliveryArea"."zoneId"
        AND z."isActive" = true
    )
  );
