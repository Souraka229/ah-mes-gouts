-- Flux public minimal pour Realtime (statut uniquement, sans PII)

CREATE TABLE IF NOT EXISTS "OrderStatusFeed" (
  id TEXT PRIMARY KEY,
  status "OrderStatus" NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO "OrderStatusFeed" (id, status, "updatedAt")
SELECT id, status, "updatedAt" FROM "Order"
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  "updatedAt" = EXCLUDED."updatedAt";

CREATE OR REPLACE FUNCTION sync_order_status_feed()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "OrderStatusFeed" (id, status, "updatedAt")
  VALUES (NEW.id, NEW.status, NEW."updatedAt")
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    "updatedAt" = EXCLUDED."updatedAt";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_status_feed_sync ON "Order";
CREATE TRIGGER order_status_feed_sync
AFTER INSERT OR UPDATE OF status, "updatedAt" ON "Order"
FOR EACH ROW EXECUTE FUNCTION sync_order_status_feed();

ALTER TABLE "OrderStatusFeed" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_status_feed_public_read" ON "OrderStatusFeed";
CREATE POLICY "order_status_feed_public_read" ON "OrderStatusFeed"
  FOR SELECT USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'OrderStatusFeed'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "OrderStatusFeed";
  END IF;
END $$;
