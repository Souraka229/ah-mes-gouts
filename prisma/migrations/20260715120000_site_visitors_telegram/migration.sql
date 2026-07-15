-- Analytics visiteurs boutique + abonnés Telegram

CREATE TABLE IF NOT EXISTS "SiteVisitorDay" (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  "visitorHash" TEXT NOT NULL,
  "pageViews" INTEGER NOT NULL DEFAULT 1,
  "firstSeenAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "SiteVisitorDay_day_visitorHash_key"
  ON "SiteVisitorDay"(day, "visitorHash");

CREATE INDEX IF NOT EXISTS "SiteVisitorDay_day_idx"
  ON "SiteVisitorDay"(day);

CREATE TABLE IF NOT EXISTS "TelegramSubscriber" (
  id TEXT PRIMARY KEY,
  "chatId" TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "linkedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
