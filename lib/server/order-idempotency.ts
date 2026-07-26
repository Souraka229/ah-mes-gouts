import { getPrisma } from "@/lib/prisma";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export async function resolveIdempotentOrder(
  key: string,
): Promise<{ orderId: string } | null> {
  const prisma = getPrisma();
  const cutoff = new Date(Date.now() - IDEMPOTENCY_TTL_MS);

  const entry = await prisma.orderIdempotencyKey.findUnique({
    where: { key },
  });

  if (!entry || entry.createdAt < cutoff) {
    if (entry) {
      await prisma.orderIdempotencyKey.delete({ where: { key } }).catch(() => null);
    }
    return null;
  }

  return { orderId: entry.orderId };
}

export async function rememberIdempotentOrder(
  key: string,
  orderId: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.orderIdempotencyKey.upsert({
    where: { key },
    create: { key, orderId },
    update: { orderId, createdAt: new Date() },
  });
}

/** Nettoyage périodique (cron ou lazy) — clés > 24 h. */
export async function purgeExpiredIdempotencyKeys(): Promise<number> {
  const prisma = getPrisma();
  const cutoff = new Date(Date.now() - IDEMPOTENCY_TTL_MS);
  const result = await prisma.orderIdempotencyKey.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
