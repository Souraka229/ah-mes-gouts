-- Journal agent WhatsApp + déduplication webhooks Kapso

CREATE TABLE IF NOT EXISTS "WhatsAppBotLog" (
  "id" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "phoneLast4" TEXT,
  "intent" TEXT,
  "tier" TEXT,
  "bodyPreview" VARCHAR(500) NOT NULL,
  "replyPreview" VARCHAR(500),
  "usedLlm" BOOLEAN NOT NULL DEFAULT false,
  "llmProvider" TEXT,
  "kapsoMessageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppBotLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WhatsAppBotLog_createdAt_idx" ON "WhatsAppBotLog"("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "WhatsAppWebhookDedup" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "eventName" TEXT,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppWebhookDedup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppWebhookDedup_idempotencyKey_key"
  ON "WhatsAppWebhookDedup"("idempotencyKey");
