-- Catalogue, menus, CMS, paramètres, journal admin

CREATE TYPE "MenuStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'EXPIRED');

CREATE TABLE IF NOT EXISTS "Product" (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "stockRemaining" INTEGER NOT NULL,
  "stockMinimum" INTEGER NOT NULL DEFAULT 5,
  "isNew" BOOLEAN NOT NULL DEFAULT false,
  "isPromotion" BOOLEAN NOT NULL DEFAULT false,
  "promotionPrice" INTEGER,
  "isMenuDuJour" BOOLEAN NOT NULL DEFAULT false,
  "isPopular" BOOLEAN NOT NULL DEFAULT false,
  "isGiftCard" BOOLEAN NOT NULL DEFAULT false,
  "giftCardMessage" TEXT,
  category TEXT NOT NULL DEFAULT 'Entremets',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Menu" (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL,
  "activateAt" TIMESTAMPTZ NOT NULL,
  status "MenuStatus" NOT NULL,
  "productIds" TEXT[] NOT NULL DEFAULT '{}',
  "displayOrder" INTEGER[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Menu_status_idx" ON "Menu"(status);
CREATE INDEX IF NOT EXISTS "Menu_activateAt_idx" ON "Menu"("activateAt");

CREATE TABLE IF NOT EXISTS "SiteContentStore" (
  id TEXT PRIMARY KEY DEFAULT 'default',
  data JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SiteSettingsStore" (
  id TEXT PRIMARY KEY DEFAULT 'default',
  data JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "AdminActionLog" (
  id TEXT PRIMARY KEY,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "adminName" TEXT NOT NULL,
  source TEXT NOT NULL,
  action TEXT NOT NULL,
  summary TEXT NOT NULL,
  details JSONB
);

CREATE INDEX IF NOT EXISTS "AdminActionLog_createdAt_idx" ON "AdminActionLog"("createdAt");

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Menu" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SiteContentStore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SiteSettingsStore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminActionLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_public_read" ON "Product" FOR SELECT USING (true);
CREATE POLICY "menu_public_read" ON "Menu" FOR SELECT USING (true);
CREATE POLICY "site_content_deny_anon" ON "SiteContentStore" FOR ALL USING (false);
CREATE POLICY "site_settings_deny_anon" ON "SiteSettingsStore" FOR ALL USING (false);
CREATE POLICY "admin_log_deny_anon" ON "AdminActionLog" FOR ALL USING (false);
