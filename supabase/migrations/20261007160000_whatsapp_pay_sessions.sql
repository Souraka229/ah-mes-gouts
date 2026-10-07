ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "salesChannel" TEXT NOT NULL DEFAULT 'web';

CREATE TABLE IF NOT EXISTS "WhatsAppPaySession" (
  "id" TEXT NOT NULL,
  "phoneKey" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "orderId" TEXT,
  "method" TEXT,
  "payPhone" TEXT,
  "reference" TEXT,
  "amount" INTEGER,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppPaySession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppPaySession_phoneKey_key"
  ON "WhatsAppPaySession"("phoneKey");
CREATE INDEX IF NOT EXISTS "WhatsAppPaySession_expiresAt_idx"
  ON "WhatsAppPaySession"("expiresAt");

CREATE TABLE IF NOT EXISTS "WhatsAppSavedPayPhone" (
  "id" TEXT NOT NULL,
  "phoneKey" TEXT NOT NULL,
  "payPhone" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppSavedPayPhone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppSavedPayPhone_phoneKey_key"
  ON "WhatsAppSavedPayPhone"("phoneKey");
