-- Ah Mes Goûts — schéma e-commerce (à appliquer sur le projet Supabase DÉDIÉ GLACE)
-- NE PAS appliquer sur un projet existant d'une autre application.

CREATE TYPE "OrderStatus" AS ENUM (
  'RECUE', 'PAIEMENT_CONFIRME', 'PREPARATION', 'PRETE', 'EN_LIVRAISON', 'LIVREE', 'ANNULEE'
);
CREATE TYPE "ReceptionMode" AS ENUM ('DELIVERY', 'PICKUP');
CREATE TYPE "PaymentMethod" AS ENUM ('MTN_MOMO', 'MOOV_MONEY', 'CELTIIS_CASH', 'CARD');

CREATE TABLE IF NOT EXISTS "DeliveryZone" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cost INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "DeliverySchedule" (
  id TEXT PRIMARY KEY,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "slotDuration" INTEGER NOT NULL DEFAULT 30,
  type TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "Order" (
  id TEXT PRIMARY KEY,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  status "OrderStatus" NOT NULL DEFAULT 'RECUE',
  mode "ReceptionMode" NOT NULL,
  "zoneId" TEXT,
  "zoneName" TEXT,
  "deliveryZoneId" TEXT,
  "scheduledSlotStart" TIMESTAMPTZ,
  "scheduledSlotEnd" TIMESTAMPTZ,
  "fulfillmentType" TEXT NOT NULL DEFAULT 'delivery',
  "deliveryFee" INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL,
  total INTEGER NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "clientFirstName" TEXT NOT NULL,
  "clientLastName" TEXT NOT NULL,
  "clientPhone" TEXT NOT NULL,
  "clientAddress" TEXT,
  "clientLandmark" TEXT,
  "clientMessage" TEXT,
  "isGift" BOOLEAN NOT NULL DEFAULT false,
  "recipientName" TEXT,
  "recipientPhone" TEXT,
  "giftMessage" VARCHAR(280),
  "senderVisible" BOOLEAN NOT NULL DEFAULT true,
  "clientIpHash" TEXT
);

CREATE TABLE IF NOT EXISTS "OrderItem" (
  id TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  supplements TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS "Order_clientPhone_idx" ON "Order"("clientPhone");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");

-- RLS
ALTER TABLE "DeliveryZone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeliverySchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;

-- Zones & horaires : lecture publique, écriture service role uniquement
CREATE POLICY "delivery_zone_public_read" ON "DeliveryZone"
  FOR SELECT USING (true);

CREATE POLICY "delivery_schedule_public_read" ON "DeliverySchedule"
  FOR SELECT USING ("isActive" = true);

-- Commandes : aucun accès anon direct (API serveur avec service role)
CREATE POLICY "order_deny_anon" ON "Order"
  FOR ALL USING (false);

CREATE POLICY "order_item_deny_anon" ON "OrderItem"
  FOR ALL USING (false);

-- Note : en production, ajouter des policies auth pour suivi commande par token
-- et role admin via JWT custom claims (admin = true).
