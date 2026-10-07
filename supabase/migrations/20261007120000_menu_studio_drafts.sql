-- Studio vitrine admin : nom libre + corbeille (aligné prisma/migrations/20261007120000_menu_studio_drafts)
ALTER TABLE "Menu" ADD COLUMN IF NOT EXISTS "label" TEXT;
ALTER TABLE "Menu" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Menu_archivedAt_idx" ON "Menu"("archivedAt");
