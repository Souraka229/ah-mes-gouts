import { getPrisma } from "@/lib/prisma";

type BucketRow = { count: number; resetAt: Date };

/**
 * Rate limiting distribué via Postgres (multi-instance Vercel).
 *
 * Deux propriétés non négociables :
 *
 * 1. ATOMIQUE — une seule requête. L'ancienne version faisait `findUnique`
 *    puis `update`, franchissable en rafale concurrente.
 *
 * 2. FAIL-CLOSED — si la base est injoignable, on refuse. L'ancienne version
 *    laissait passer en production, donc tous les limiteurs s'ouvraient
 *    simultanément (bruteforce admin, création de commandes en masse) au
 *    moment précis où ils sont le plus utiles. Le coût assumé : une base en
 *    panne bloque les commandes — mais la boutique ne peut de toute façon pas
 *    fonctionner sans sa base.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const resetAt = new Date(Date.now() + windowMs);

  try {
    const rows = await getPrisma().$queryRaw<BucketRow[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "RateLimitBucket"."resetAt" <= NOW()
                         THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= NOW()
                         THEN ${resetAt} ELSE "RateLimitBucket"."resetAt" END
      RETURNING "count", "resetAt";
    `;

    const row = rows[0];
    if (!row) return { allowed: false, retryAfterSec: 5 };

    if (row.count > limit) {
      return {
        allowed: false,
        retryAfterSec: Math.max(
          1,
          Math.ceil((row.resetAt.getTime() - Date.now()) / 1000),
        ),
      };
    }

    return { allowed: true, retryAfterSec: 0 };
  } catch (error) {
    console.error("[rate-limit] compteur indisponible — refus par défaut:", error);
    return { allowed: false, retryAfterSec: 5 };
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
