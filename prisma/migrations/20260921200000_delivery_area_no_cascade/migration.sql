-- Une zone ne doit JAMAIS pouvoir effacer ses lieux en silence.
--
-- La contrainte d'origine était `ON DELETE CASCADE`. Comme
-- `writeConfigToDb` faisait `deleteMany()` sur les zones avant de les
-- recréer, le premier enregistrement depuis la page livraison de l'admin a
-- effacé les 113 lieux de la grille tarifaire, sans un mot.
--
-- Le code ne fait plus ce `deleteMany` (upsert à la place). Cette migration
-- ajoute la ceinture : si un chemin oublie la règle un jour, la suppression
-- échoue bruyamment au lieu de détruire des tarifs.
--
-- MIGRATION ADDITIVE : aucune table ni colonne supprimée, aucune donnée
-- réécrite. Seule la règle de suppression de la clé étrangère change.

DO $$ BEGIN
  ALTER TABLE "DeliveryArea" DROP CONSTRAINT IF EXISTS "DeliveryArea_zoneId_fkey";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DeliveryArea"
    ADD CONSTRAINT "DeliveryArea_zoneId_fkey"
    FOREIGN KEY ("zoneId") REFERENCES "DeliveryZone"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
