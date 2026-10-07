-- Brouillons / versions du menu du jour (studio vitrine admin)
ALTER TABLE "Menu" ADD COLUMN IF NOT EXISTS "label" TEXT;
ALTER TABLE "Menu" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Menu_archivedAt_idx" ON "Menu"("archivedAt");
