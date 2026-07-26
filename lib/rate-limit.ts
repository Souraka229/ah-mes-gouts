import { getPrisma } from "@/lib/prisma";

type Bucket = {
  count: number;
  resetAt: number;
};

/** Filet dev local si Postgres indisponible. */
const devFallback = new Map<string, Bucket>();

/**
 * Rate limiting distribué via Postgres (multi-instance Vercel).
 * Fallback mémoire uniquement en développement.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const now = Date.now();
  const resetAt = new Date(now + windowMs);

  try {
    const prisma = getPrisma();
    const existing = await prisma.rateLimitBucket.findUnique({
      where: { key },
    });

    if (!existing || existing.resetAt.getTime() <= now) {
      await prisma.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { allowed: true, retryAfterSec: 0 };
    }

    if (existing.count >= limit) {
      return {
        allowed: false,
        retryAfterSec: Math.ceil(
          (existing.resetAt.getTime() - now) / 1000,
        ),
      };
    }

    await prisma.rateLimitBucket.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
    return { allowed: true, retryAfterSec: 0 };
  } catch {
    if (process.env.NODE_ENV === "production") {
      return { allowed: true, retryAfterSec: 0 };
    }

    const bucket = devFallback.get(key);
    if (!bucket || now > bucket.resetAt) {
      devFallback.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSec: 0 };
    }
    if (bucket.count >= limit) {
      return {
        allowed: false,
        retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
      };
    }
    bucket.count += 1;
    return { allowed: true, retryAfterSec: 0 };
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
