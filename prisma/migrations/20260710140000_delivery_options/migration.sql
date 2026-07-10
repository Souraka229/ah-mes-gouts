-- Réglages livraison éditables par l'admin (capacité créneaux, horizon réservation)
CREATE TABLE "DeliveryOptions" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "maxOrdersPerSlot" INTEGER NOT NULL DEFAULT 5,
    "bookingDaysAhead" INTEGER NOT NULL DEFAULT 7,
    "pickupAddress" TEXT NOT NULL DEFAULT 'Gift & ENTREMETS — Cotonou, Bénin',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryOptions_pkey" PRIMARY KEY ("id")
);

INSERT INTO "DeliveryOptions" ("id", "maxOrdersPerSlot", "bookingDaysAhead", "pickupAddress", "updatedAt")
VALUES ('default', 5, 7, 'Gift & ENTREMETS — Cotonou, Bénin', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
