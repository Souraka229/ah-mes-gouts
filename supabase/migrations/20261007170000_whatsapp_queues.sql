CREATE TABLE IF NOT EXISTS "WhatsAppInboundQueue" (
  "id" TEXT NOT NULL,
  "kapsoMessageId" TEXT,
  "fromPhone" TEXT NOT NULL,
  "text" VARCHAR(2000) NOT NULL,
  "phoneNumberId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppInboundQueue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppInboundQueue_kapsoMessageId_key"
  ON "WhatsAppInboundQueue"("kapsoMessageId");

CREATE INDEX IF NOT EXISTS "WhatsAppInboundQueue_status_nextAttemptAt_idx"
  ON "WhatsAppInboundQueue"("status", "nextAttemptAt");

CREATE TABLE IF NOT EXISTS "WhatsAppOutboundQueue" (
  "id" TEXT NOT NULL,
  "toPhone" TEXT NOT NULL,
  "body" VARCHAR(4096) NOT NULL,
  "phoneNumberId" TEXT,
  "bodyHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppOutboundQueue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WhatsAppOutboundQueue_status_nextAttemptAt_idx"
  ON "WhatsAppOutboundQueue"("status", "nextAttemptAt");

CREATE INDEX IF NOT EXISTS "WhatsAppOutboundQueue_toPhone_bodyHash_createdAt_idx"
  ON "WhatsAppOutboundQueue"("toPhone", "bodyHash", "createdAt");
