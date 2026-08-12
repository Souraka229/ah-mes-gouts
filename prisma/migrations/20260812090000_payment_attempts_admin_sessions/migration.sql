-- Durcissement paiements & sécurité
--
-- 1. PaymentAttempt : l'objet manquant qui lie une référence FeexPay à une
--    commande. Le UNIQUE sur "reference" est la garantie anti-rejeu.
-- 2. Order.trackingToken : jeton de suivi opaque, ferme l'énumération.
-- 3. AdminSession : sessions signées et révocables.
--
-- Non destructif : aucune donnée existante n'est modifiée ni supprimée.
-- Les commandes déjà en base gardent trackingToken = NULL et restent
-- consultables par ID seul, le temps de sortir du circuit.

CREATE TYPE "PaymentAttemptStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED');

CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "lastRawResponse" JSONB,
    "failureReason" TEXT,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAttempt_reference_key" ON "PaymentAttempt"("reference");
CREATE INDEX "PaymentAttempt_status_initiatedAt_idx" ON "PaymentAttempt"("status", "initiatedAt");
CREATE INDEX "PaymentAttempt_orderId_idx" ON "PaymentAttempt"("orderId");

ALTER TABLE "PaymentAttempt"
    ADD CONSTRAINT "PaymentAttempt_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order" ADD COLUMN "trackingToken" TEXT;
CREATE UNIQUE INDEX "Order_trackingToken_key" ON "Order"("trackingToken");

CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipHash" TEXT,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");
