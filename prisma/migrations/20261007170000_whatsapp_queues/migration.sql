-- CreateTable
CREATE TABLE "WhatsAppInboundQueue" (
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

-- CreateTable
CREATE TABLE "WhatsAppOutboundQueue" (
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

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppInboundQueue_kapsoMessageId_key" ON "WhatsAppInboundQueue"("kapsoMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppInboundQueue_status_nextAttemptAt_idx" ON "WhatsAppInboundQueue"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "WhatsAppOutboundQueue_status_nextAttemptAt_idx" ON "WhatsAppOutboundQueue"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "WhatsAppOutboundQueue_toPhone_bodyHash_createdAt_idx" ON "WhatsAppOutboundQueue"("toPhone", "bodyHash", "createdAt");
