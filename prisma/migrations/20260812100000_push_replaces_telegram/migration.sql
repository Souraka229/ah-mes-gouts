-- Telegram retiré, Web Push à venir.
--
-- La table TelegramSubscriber est supprimée : elle ne contenait aucune ligne
-- (vérifié avant suppression) et plus aucun code ne la lit.
--
-- PushSubscription la remplace. Elle reste vide tant que le canal push n'est
-- pas branché : aucun code ne l'écrit encore, elle est posée pour éviter une
-- seconde migration au moment de l'activation.

DROP TABLE IF EXISTS "TelegramSubscriber";

CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'administrateur',
    "label" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_isActive_idx" ON "PushSubscription"("isActive");
