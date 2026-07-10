-- Livreurs + champs commande livreur + Realtime sur Order + RLS Driver

CREATE TABLE IF NOT EXISTS "Driver" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  "accessToken" TEXT NOT NULL UNIQUE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "driverId" TEXT,
  ADD COLUMN IF NOT EXISTS "driverStartedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "driverDeliveredAt" TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_driverId_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_driverId_fkey"
      FOREIGN KEY ("driverId") REFERENCES "Driver"(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Order_driverId_idx" ON "Order" ("driverId");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order" ("status");

ALTER TABLE "Driver" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_deny_anon" ON "Driver";
CREATE POLICY "driver_deny_anon" ON "Driver" FOR ALL USING (false);

-- Realtime : publication idempotente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'Order'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "Order";
  END IF;
END $$;
