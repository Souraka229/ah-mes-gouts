-- P0 scalabilité : index créneaux + paiement, idempotence, rate limit

CREATE INDEX IF NOT EXISTS "Order_scheduledSlotStart_fulfillmentType_status_idx"
  ON "Order" ("scheduledSlotStart", "fulfillmentType", "status");

CREATE INDEX IF NOT EXISTS "Order_paymentReference_idx"
  ON "Order" ("paymentReference");

CREATE TABLE IF NOT EXISTS "OrderIdempotencyKey" (
  "key" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderIdempotencyKey_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "OrderIdempotencyKey_createdAt_idx"
  ON "OrderIdempotencyKey" ("createdAt");

CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "resetAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "RateLimitBucket_resetAt_idx"
  ON "RateLimitBucket" ("resetAt");
