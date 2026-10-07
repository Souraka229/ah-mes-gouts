-- AlterTable
ALTER TABLE "Order" ADD COLUMN "salesChannel" TEXT NOT NULL DEFAULT 'web';

-- CreateTable
CREATE TABLE "WhatsAppPaySession" (
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

-- CreateTable
CREATE TABLE "WhatsAppSavedPayPhone" (
    "id" TEXT NOT NULL,
    "phoneKey" TEXT NOT NULL,
    "payPhone" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppSavedPayPhone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppPaySession_phoneKey_key" ON "WhatsAppPaySession"("phoneKey");

-- CreateIndex
CREATE INDEX "WhatsAppPaySession_expiresAt_idx" ON "WhatsAppPaySession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppSavedPayPhone_phoneKey_key" ON "WhatsAppSavedPayPhone"("phoneKey");
