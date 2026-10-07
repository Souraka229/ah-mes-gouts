-- CreateTable
CREATE TABLE "WhatsAppOrderDraft" (
    "id" TEXT NOT NULL,
    "phoneKey" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "cartJson" JSONB NOT NULL DEFAULT '[]',
    "mode" TEXT,
    "slotStart" TEXT,
    "slotEnd" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "paymentMethod" TEXT,
    "orderId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppOrderDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppOrderDraft_phoneKey_key" ON "WhatsAppOrderDraft"("phoneKey");

-- CreateIndex
CREATE INDEX "WhatsAppOrderDraft_expiresAt_idx" ON "WhatsAppOrderDraft"("expiresAt");
