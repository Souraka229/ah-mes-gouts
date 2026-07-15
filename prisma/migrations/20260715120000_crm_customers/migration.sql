-- CRM clients : Customer, Device, Activity, OTP + lien Order.customerId

CREATE TYPE "CustomerActivityType" AS ENUM (
  'PRODUCT_VIEW',
  'ADD_TO_CART',
  'CHECKOUT_START',
  'ORDER_PLACED'
);

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "firstName" TEXT NOT NULL DEFAULT '',
  "lastName" TEXT NOT NULL DEFAULT '',
  "firstOrderAt" TIMESTAMP(3),
  "lastOrderAt" TIMESTAMP(3),
  "ordersCount" INTEGER NOT NULL DEFAULT 0,
  "totalSpent" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");
CREATE INDEX "Customer_lastOrderAt_idx" ON "Customer"("lastOrderAt");
CREATE INDEX "Customer_totalSpent_idx" ON "Customer"("totalSpent");
CREATE INDEX "Customer_ordersCount_idx" ON "Customer"("ordersCount");

CREATE TABLE "CustomerDevice" (
  "id" TEXT NOT NULL,
  "deviceKey" TEXT NOT NULL,
  "customerId" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerDevice_deviceKey_key" ON "CustomerDevice"("deviceKey");
CREATE INDEX "CustomerDevice_customerId_idx" ON "CustomerDevice"("customerId");

CREATE TABLE "CustomerActivity" (
  "id" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "customerId" TEXT,
  "type" "CustomerActivityType" NOT NULL,
  "productId" TEXT,
  "productSlug" TEXT,
  "productName" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerActivity_customerId_createdAt_idx" ON "CustomerActivity"("customerId", "createdAt");
CREATE INDEX "CustomerActivity_deviceId_createdAt_idx" ON "CustomerActivity"("deviceId", "createdAt");
CREATE INDEX "CustomerActivity_type_createdAt_idx" ON "CustomerActivity"("type", "createdAt");

CREATE TABLE "CustomerOtp" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerOtp_phone_createdAt_idx" ON "CustomerOtp"("phone", "createdAt");

ALTER TABLE "Order" ADD COLUMN "customerId" TEXT;

CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

ALTER TABLE "CustomerDevice"
  ADD CONSTRAINT "CustomerDevice_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomerActivity"
  ADD CONSTRAINT "CustomerActivity_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "CustomerDevice"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerActivity"
  ADD CONSTRAINT "CustomerActivity_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
